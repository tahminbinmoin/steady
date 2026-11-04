/**
 * The analytics engine. Pure functions, no React or Supabase, shared by the
 * server and the browser so every page computes the same numbers.
 *
 * Definitions (see the Phase 1 architecture doc):
 *  - An ELIGIBLE check-in is one objective on one day it could be ticked:
 *    from its start_date to the end of its month, up to yesterday. Today
 *    counts only once ticked. Days on or after archiving count only if ticked.
 *  - Completion % = completed check-ins / eligible check-ins.
 *  - Streak = consecutive days with at least one completed objective.
 *  - Weeks are fixed day ranges in a month: 1–7, 8–14, 15–21, 22–28, 29–end.
 */
import {
  addDays,
  type CivilDate,
  daysInMonth,
  eachDay,
  make,
  maxDate,
  minDate,
  monthEnd,
  monthStart,
} from "@/lib/dates/civil";
import type { Entry, Objective } from "@/lib/types";

export const MIN_ELIGIBLE_FOR_RANKING = 7;

export type CompletionIndex = Map<string, Set<CivilDate>>;

export function buildIndex(entries: readonly Entry[]): CompletionIndex {
  const index: CompletionIndex = new Map();
  for (const e of entries) {
    if (!e.completed) continue;
    let set = index.get(e.objective_id);
    if (!set) index.set(e.objective_id, (set = new Set()));
    set.add(e.completion_date);
  }
  return index;
}

export const isDone = (index: CompletionIndex, objectiveId: string, date: CivilDate) =>
  index.get(objectiveId)?.has(date) ?? false;

// ---------------------------------------------------------------------------
// Eligibility and cell state
// ---------------------------------------------------------------------------

export function objectiveWindow(o: Objective): { from: CivilDate; to: CivilDate } {
  return { from: maxDate(o.start_date, monthStart(o.year, o.month)), to: monthEnd(o.year, o.month) };
}

export function isEligible(o: Objective, date: CivilDate, done: boolean, today: CivilDate): boolean {
  const w = objectiveWindow(o);
  if (date < w.from || date > w.to || date > today) return false;
  if (date === today) return done;
  if (o.archived_on && date >= o.archived_on) return done;
  return true;
}

export type CellState =
  | "done" // ticked (past or today)
  | "missed" // past eligible day, not ticked
  | "open" // today, trackable, not yet ticked
  | "future" // after today
  | "inactive"; // before the objective started, or while archived

export function cellState(o: Objective, date: CivilDate, done: boolean, today: CivilDate): CellState {
  const w = objectiveWindow(o);
  if (date > today) return date <= w.to && date >= w.from ? "future" : "inactive";
  if (done) return "done";
  if (date < w.from || date > w.to) return "inactive";
  if (o.archived_on && date >= o.archived_on) return "inactive";
  if (date === today) return o.status === "active" ? "open" : "inactive";
  return "missed";
}

/** Only today's cell of an active objective is interactive. */
export function canToggle(o: Objective, date: CivilDate, today: CivilDate, dateFloor: CivilDate | null): boolean {
  if (date !== today || o.status !== "active") return false;
  if (dateFloor && date < dateFloor) return false;
  const w = objectiveWindow(o);
  return date >= w.from && date <= w.to;
}

// ---------------------------------------------------------------------------
// Day aggregates — the base every other statistic is summed from
// ---------------------------------------------------------------------------

export type DayStat = { eligible: number; completed: number };
export type DayMap = Map<CivilDate, DayStat>;

export function computeDays(
  objectives: readonly Objective[],
  index: CompletionIndex,
  today: CivilDate,
  range?: { from: CivilDate; to: CivilDate },
): DayMap {
  const days: DayMap = new Map();
  for (const o of objectives) {
    const w = objectiveWindow(o);
    const from = range ? maxDate(w.from, range.from) : w.from;
    const to = minDate(range ? minDate(w.to, range.to) : w.to, today);
    if (from > to) continue;
    const done = index.get(o.id);
    for (const d of eachDay(from, to)) {
      const isDoneDay = done?.has(d) ?? false;
      if (!isEligible(o, d, isDoneDay, today)) continue;
      let s = days.get(d);
      if (!s) days.set(d, (s = { eligible: 0, completed: 0 }));
      s.eligible++;
      if (isDoneDay) s.completed++;
    }
  }
  return days;
}

export type Tally = { eligible: number; completed: number; missed: number; rate: number | null };

export const rate = (completed: number, eligible: number): number | null =>
  eligible === 0 ? null : completed / eligible;

export function tallyRange(days: DayMap, from: CivilDate, to: CivilDate): Tally {
  let eligible = 0;
  let completed = 0;
  for (const [d, s] of days) {
    if (d < from || d > to) continue;
    eligible += s.eligible;
    completed += s.completed;
  }
  return { eligible, completed, missed: eligible - completed, rate: rate(completed, eligible) };
}

export function tallyAll(days: DayMap): Tally {
  let eligible = 0;
  let completed = 0;
  for (const s of days.values()) {
    eligible += s.eligible;
    completed += s.completed;
  }
  return { eligible, completed, missed: eligible - completed, rate: rate(completed, eligible) };
}

// ---------------------------------------------------------------------------
// Weeks
// ---------------------------------------------------------------------------

export type WeekRange = { index: number; from: CivilDate; to: CivilDate };

export function monthWeeks(year: number, month: number): WeekRange[] {
  const n = daysInMonth(year, month);
  const weeks: WeekRange[] = [];
  for (let start = 1, i = 1; start <= n; start += 7, i++) {
    weeks.push({ index: i, from: make(year, month, start), to: make(year, month, Math.min(start + 6, n)) });
  }
  return weeks;
}

export type WeekStat = WeekRange &
  Tally & {
    year: number;
    month: number;
    /** Objectives ticked on every eligible day of the week. */
    objectivesCompleted: number;
    /** Objectives with at least one eligible day in the week. */
    objectivesTracked: number;
    status: "past" | "current" | "future";
  };

export function weeklyStats(
  year: number,
  month: number,
  objectives: readonly Objective[],
  index: CompletionIndex,
  today: CivilDate,
): WeekStat[] {
  const monthObjectives = objectives.filter((o) => o.year === year && o.month === month);
  const days = computeDays(monthObjectives, index, today, { from: monthStart(year, month), to: monthEnd(year, month) });
  return monthWeeks(year, month).map((w) => {
    let tracked = 0;
    let full = 0;
    for (const o of monthObjectives) {
      const t = tallyRange(computeDays([o], index, today, w), w.from, w.to);
      if (t.eligible === 0) continue;
      tracked++;
      if (t.completed === t.eligible) full++;
    }
    return {
      ...w,
      ...tallyRange(days, w.from, w.to),
      year,
      month,
      objectivesCompleted: full,
      objectivesTracked: tracked,
      status: w.to < today ? "past" : w.from > today ? "future" : "current",
    };
  });
}

// ---------------------------------------------------------------------------
// Months and years
// ---------------------------------------------------------------------------

export type MonthStat = Tally & { year: number; month: number; objectives: number };

export function monthlyStats(year: number, objectives: readonly Objective[], days: DayMap): MonthStat[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      year,
      month,
      objectives: objectives.filter((o) => o.year === year && o.month === month).length,
      ...tallyRange(days, monthStart(year, month), monthEnd(year, month)),
    };
  });
}

/** Highest (or lowest) completion rate among periods with enough data. Ties go to the most recent. */
export function rankPeriods<T extends Tally>(periods: readonly T[], pick: "best" | "worst", min = MIN_ELIGIBLE_FOR_RANKING): T | null {
  let chosen: T | null = null;
  for (const p of periods) {
    if (p.rate === null || p.eligible < min) continue;
    if (!chosen || (pick === "best" ? p.rate >= chosen.rate! : p.rate <= chosen.rate!)) chosen = p;
  }
  return chosen;
}

/** Every month-week in a year, for "best week". */
export function allWeeksOfYear(year: number, objectives: readonly Objective[], index: CompletionIndex, today: CivilDate): WeekStat[] {
  const out: WeekStat[] = [];
  for (let m = 1; m <= 12; m++) {
    if (monthStart(year, m) > today) break;
    if (!objectives.some((o) => o.year === year && o.month === m)) continue;
    out.push(...weeklyStats(year, m, objectives, index, today));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

export type Streaks = {
  current: number;
  longest: number;
  longestFrom: CivilDate | null;
  longestTo: CivilDate | null;
};

/** Dates with at least one completed objective. */
export function activeDates(entries: readonly Entry[]): Set<CivilDate> {
  const s = new Set<CivilDate>();
  for (const e of entries) if (e.completed) s.add(e.completion_date);
  return s;
}

export function computeStreaks(active: ReadonlySet<CivilDate>, today: CivilDate): Streaks {
  // Current: ends today if today has a tick, otherwise ends yesterday.
  let current = 0;
  let cursor = active.has(today) ? today : addDays(today, -1);
  while (active.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...active].filter((d) => d <= today).sort();
  let longest = 0;
  let longestFrom: CivilDate | null = null;
  let longestTo: CivilDate | null = null;
  let runStart: CivilDate | null = null;
  let prev: CivilDate | null = null;
  for (const d of sorted) {
    if (prev && addDays(prev, 1) === d) {
      // continue run
    } else {
      runStart = d;
    }
    const len = Math.round((Date.parse(d) - Date.parse(runStart!)) / 86_400_000) + 1;
    if (len >= longest) {
      longest = len;
      longestFrom = runStart;
      longestTo = d;
    }
    prev = d;
  }
  return { current, longest, longestFrom, longestTo };
}

// ---------------------------------------------------------------------------
// Heatmap and trends
// ---------------------------------------------------------------------------

/** -1 = nothing eligible (blank), 0 = none done, 1–4 = intensity. */
export type HeatLevel = -1 | 0 | 1 | 2 | 3 | 4;

export function heatLevel(s: DayStat | undefined): HeatLevel {
  if (!s || s.eligible === 0) return -1;
  if (s.completed === 0) return 0;
  const r = s.completed / s.eligible;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

export type TrendPoint = { date: CivilDate; rate: number | null; completed: number; eligible: number };

/** Rolling 7-day completion rate for each day from `from` to `to`. */
export function rollingTrend(days: DayMap, from: CivilDate, to: CivilDate, window = 7): TrendPoint[] {
  return eachDay(from, to).map((date) => {
    const t = tallyRange(days, addDays(date, -(window - 1)), date);
    return { date, rate: t.rate, completed: t.completed, eligible: t.eligible };
  });
}

/** Compares the latest 14 days with the 14 before. Positive = improving. */
export function trendDirection(days: DayMap, today: CivilDate): number | null {
  const recent = tallyRange(days, addDays(today, -13), today);
  const before = tallyRange(days, addDays(today, -27), addDays(today, -14));
  if (recent.rate === null || before.rate === null) return null;
  return recent.rate - before.rate;
}

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

export type ObjectivePerformance = Tally & { objective: Objective };

export function objectivePerformance(
  objectives: readonly Objective[],
  index: CompletionIndex,
  today: CivilDate,
): ObjectivePerformance[] {
  return objectives
    .map((objective) => ({ objective, ...tallyAll(computeDays([objective], index, today)) }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.eligible - a.eligible);
}

/**
 * The same habit carried forward month after month is several objective rows
 * with the same title. Group them so a habit is judged across its whole run.
 */
export type HabitPerformance = Tally & { key: string; title: string; icon: string | null; months: number; objectiveIds: string[] };

export function habitPerformance(objectives: readonly Objective[], index: CompletionIndex, today: CivilDate): HabitPerformance[] {
  const groups = new Map<string, Objective[]>();
  for (const o of objectives) {
    const key = o.title.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  return [...groups.entries()]
    .map(([key, objs]) => {
      const latest = objs.reduce((a, b) => (b.year * 12 + b.month > a.year * 12 + a.month ? b : a));
      return {
        key,
        title: latest.title,
        icon: latest.icon,
        months: objs.length,
        objectiveIds: objs.map((o) => o.id),
        ...tallyAll(computeDays(objs, index, today)),
      };
    })
    .filter((h) => h.eligible > 0)
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.eligible - a.eligible);
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

/** Objectives that can be ticked today, and how many are done. */
export function todaySummary(objectives: readonly Objective[], index: CompletionIndex, today: CivilDate) {
  const trackable = objectives.filter((o) => {
    const w = objectiveWindow(o);
    return o.status === "active" && today >= w.from && today <= w.to;
  });
  const done = trackable.filter((o) => isDone(index, o.id, today)).length;
  return { trackable, done, total: trackable.length, allDone: trackable.length > 0 && done === trackable.length };
}

export const formatRate = (r: number | null, digits = 0): string =>
  r === null ? "—" : `${(r * 100).toFixed(digits)}%`;
