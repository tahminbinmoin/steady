import { describe, expect, it } from "vitest";
import {
  activeDates,
  buildIndex,
  canToggle,
  cellState,
  computeDays,
  computeStreaks,
  heatLevel,
  monthWeeks,
  monthlyStats,
  objectivePerformance,
  rankPeriods,
  rollingTrend,
  tallyAll,
  todaySummary,
  weeklyStats,
} from "@/lib/analytics/engine";
import { addDays, diffDays, eachDay, localDateIn, make, shiftMonth } from "@/lib/dates/civil";
import type { Entry, Objective } from "@/lib/types";

function obj(id: string, year: number, month: number, extra: Partial<Objective> = {}): Objective {
  return {
    id,
    title: id,
    description: null,
    category: null,
    icon: null,
    month,
    year,
    status: "active",
    start_date: make(year, month, 1),
    archived_on: null,
    created_at: "",
    ...extra,
  };
}
const tick = (objective_id: string, completion_date: string, completed = true): Entry => ({ objective_id, completion_date, completed });

describe("civil dates", () => {
  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-03-07", "2026-03-09")).toBe(2); // across US DST start: still 2 days
  });
  it("shifts months", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
  it("reads the local date in a timezone, including DST edges", () => {
    expect(localDateIn("Asia/Dhaka", new Date("2026-11-03T17:59:59Z"))).toBe("2026-11-03");
    expect(localDateIn("Asia/Dhaka", new Date("2026-11-03T18:00:00Z"))).toBe("2026-11-04");
    expect(localDateIn("America/New_York", new Date("2026-11-01T03:59:59Z"))).toBe("2026-10-31");
    expect(localDateIn("America/New_York", new Date("2026-11-02T04:59:59Z"))).toBe("2026-11-01");
    expect(localDateIn("Europe/London", new Date("2026-10-24T23:30:00Z"))).toBe("2026-10-25");
  });
});

describe("weeks", () => {
  it("splits months of every length", () => {
    expect(monthWeeks(2026, 2).map((w) => [w.from, w.to])).toEqual([
      ["2026-02-01", "2026-02-07"],
      ["2026-02-08", "2026-02-14"],
      ["2026-02-15", "2026-02-21"],
      ["2026-02-22", "2026-02-28"],
    ]);
    expect(monthWeeks(2028, 2).at(-1)).toMatchObject({ index: 5, from: "2028-02-29", to: "2028-02-29" });
    expect(monthWeeks(2026, 11).at(-1)).toMatchObject({ index: 5, from: "2026-11-29", to: "2026-11-30" });
    expect(monthWeeks(2026, 1).at(-1)).toMatchObject({ index: 5, from: "2026-01-29", to: "2026-01-31" });
  });

  it("reproduces the spec example: 24 of 35 = 68.57%", () => {
    const objectives = ["a", "b", "c", "d", "e"].map((id) => obj(id, 2026, 10));
    const entries: Entry[] = [];
    let n = 0;
    for (const o of objectives)
      for (const d of eachDay("2026-10-01", "2026-10-07")) if (n++ < 24) entries.push(tick(o.id, d));
    const [week1] = weeklyStats(2026, 10, objectives, buildIndex(entries), "2026-11-04");
    expect(week1).toMatchObject({ eligible: 35, completed: 24, missed: 11, status: "past" });
    expect((week1.rate! * 100).toFixed(2)).toBe("68.57");
    // a, b, c fully ticked (21 ticks); d has 3 of 7; e none
    expect(week1.objectivesCompleted).toBe(3);
    expect(week1.objectivesTracked).toBe(5);
  });
});

describe("eligibility", () => {
  const today = "2026-11-10";

  it("never counts future days, and counts today only once ticked", () => {
    const o = obj("a", 2026, 11);
    const days0 = computeDays([o], buildIndex([]), today);
    expect(tallyAll(days0)).toMatchObject({ eligible: 9, completed: 0 }); // 1st–9th
    const days1 = computeDays([o], buildIndex([tick("a", today)]), today);
    expect(tallyAll(days1)).toMatchObject({ eligible: 10, completed: 1 });
  });

  it("starts an objective created mid-month on its start date", () => {
    const o = obj("a", 2026, 11, { start_date: "2026-11-08" });
    expect(tallyAll(computeDays([o], buildIndex([]), today))).toMatchObject({ eligible: 2 }); // 8th, 9th
    expect(cellState(o, "2026-11-03", false, today)).toBe("inactive");
    expect(cellState(o, "2026-11-08", false, today)).toBe("missed");
  });

  it("stops counting an archived objective from its archive date", () => {
    const o = obj("a", 2026, 11, { status: "archived", archived_on: "2026-11-05" });
    const t = tallyAll(computeDays([o], buildIndex([tick("a", "2026-11-05")]), today));
    expect(t).toMatchObject({ eligible: 5, completed: 1 }); // 1st–4th + the ticked 5th
    expect(cellState(o, today, false, today)).toBe("inactive");
  });

  it("only today's cell of an active objective is interactive", () => {
    const o = obj("a", 2026, 11);
    expect(canToggle(o, today, today, null)).toBe(true);
    expect(canToggle(o, "2026-11-09", today, null)).toBe(false);
    expect(canToggle(o, "2026-11-11", today, null)).toBe(false);
    expect(canToggle({ ...o, status: "archived" }, today, today, null)).toBe(false);
    expect(canToggle(o, today, today, "2026-11-11")).toBe(false); // date floor
    expect(cellState(o, "2026-11-12", false, today)).toBe("future");
    expect(cellState(o, today, false, today)).toBe("open");
    expect(cellState(o, today, true, today)).toBe("done");
  });

  it("does not count other months' objectives in a week", () => {
    const objectives = [obj("nov", 2026, 11), obj("oct", 2026, 10)];
    const weeks = weeklyStats(2026, 11, objectives, buildIndex([tick("oct", "2026-10-03")]), today);
    expect(weeks[0].eligible).toBe(7);
    expect(weeks[2].status).toBe("future");
    expect(weeks[2].eligible).toBe(0);
  });
});

describe("streaks", () => {
  it("keeps the current streak alive until today ends", () => {
    const active = activeDates([tick("a", "2026-11-07"), tick("a", "2026-11-08"), tick("b", "2026-11-09")]);
    expect(computeStreaks(active, "2026-11-10").current).toBe(3); // today not ticked yet
    expect(computeStreaks(active, "2026-11-11").current).toBe(0); // yesterday missed
  });
  it("finds the longest run, including across months", () => {
    const dates = [...eachDay("2026-01-30", "2026-02-03"), "2026-02-05", "2026-02-06"];
    const s = computeStreaks(new Set(dates), "2026-03-01");
    expect(s).toMatchObject({ longest: 5, longestFrom: "2026-01-30", longestTo: "2026-02-03", current: 0 });
  });
  it("ignores unticked entries", () => {
    expect(activeDates([tick("a", "2026-11-09", false)]).size).toBe(0);
  });
});

describe("ranking, heatmap, trends", () => {
  it("needs at least 7 eligible check-ins to rank a period", () => {
    const tiny = { eligible: 1, completed: 1, missed: 0, rate: 1 };
    const real = { eligible: 14, completed: 10, missed: 4, rate: 10 / 14 };
    expect(rankPeriods([tiny, real], "best")).toBe(real);
    expect(rankPeriods([tiny], "best")).toBeNull();
  });
  it("shades heatmap cells in five steps", () => {
    expect(heatLevel(undefined)).toBe(-1);
    expect(heatLevel({ eligible: 4, completed: 0 })).toBe(0);
    expect(heatLevel({ eligible: 4, completed: 1 })).toBe(1);
    expect(heatLevel({ eligible: 4, completed: 2 })).toBe(2);
    expect(heatLevel({ eligible: 4, completed: 3 })).toBe(3);
    expect(heatLevel({ eligible: 4, completed: 4 })).toBe(4);
  });
  it("computes monthly stats and a rolling trend", () => {
    const o = obj("a", 2026, 10);
    const entries = eachDay("2026-10-01", "2026-10-14").map((d) => tick("a", d));
    const days = computeDays([o], buildIndex(entries), "2026-11-04");
    const months = monthlyStats(2026, [o], days);
    expect(months[9]).toMatchObject({ month: 10, eligible: 31, completed: 14 });
    expect(months[10].eligible).toBe(0);
    const trend = rollingTrend(days, "2026-10-14", "2026-10-21");
    expect(trend[0].rate).toBe(1);
    expect(trend.at(-1)!.rate).toBe(0);
  });
  it("ranks objectives and summarises today", () => {
    const today = "2026-11-03";
    const objectives = [obj("a", 2026, 11), obj("b", 2026, 11), obj("old", 2026, 10)];
    const index = buildIndex([tick("a", "2026-11-01"), tick("a", "2026-11-02"), tick("b", today)]);
    const perf = objectivePerformance(objectives.slice(0, 2), index, today);
    expect(perf[0].objective.id).toBe("a");
    const s = todaySummary(objectives, index, today);
    expect(s).toMatchObject({ total: 2, done: 1, allDone: false });
  });
});

describe("habit grouping", () => {
  it("treats a habit carried across months as one habit", async () => {
    const { habitPerformance } = await import("@/lib/analytics/engine");
    const oct = obj("oct", 2026, 10, { title: "Read 20 pages" });
    const nov = obj("nov", 2026, 11, { title: "read 20 pages " });
    const other = obj("x", 2026, 11, { title: "Exercise" });
    const index = buildIndex([...eachDay("2026-10-01", "2026-10-31").map((d) => tick("oct", d)), tick("nov", "2026-11-01")]);
    const rows = habitPerformance([oct, nov, other], index, "2026-11-03");
    const read = rows.find((r) => r.key === "read 20 pages")!;
    expect(read).toMatchObject({ months: 2, eligible: 33, completed: 32 });
    expect(rows).toHaveLength(2);
  });
});
