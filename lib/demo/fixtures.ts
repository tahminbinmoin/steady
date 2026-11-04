/**
 * DEMO DATA — for the /preview pages only (NEXT_PUBLIC_DEMO_MODE=1).
 * Never imported by the real app routes; production statistics come only
 * from database records.
 */
import { addDays, type CivilDate, eachDay, make, maxDate, minDate, monthEnd, parts, shiftMonth } from "@/lib/dates/civil";
import type { Entry, Objective } from "@/lib/types";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const TEMPLATES = [
  { title: "Exercise for 30 minutes", icon: "🏃", category: "Fitness", p: 0.74 },
  { title: "Read 20 pages", icon: "📚", category: "Learning", p: 0.82 },
  { title: "Practice video editing", icon: "🎬", category: "Creative", p: 0.58 },
  { title: "Drink 3 litres of water", icon: "💧", category: "Health", p: 0.88 },
  { title: "Sleep before 11 PM", icon: "🌙", category: "Health", p: 0.52 },
];

export function demoData(today: CivilDate): { objectives: Objective[]; entries: Entry[] } {
  const random = rng(42);
  const restRandom = rng(7);
  const rest = new Set<CivilDate>();
  for (const d of eachDay(addDays(today, -400), addDays(today, -1))) if (restRandom() < 0.06 && d < addDays(today, -12)) rest.add(d);
  const t = parts(today);
  const objectives: Objective[] = [];
  const entries: Entry[] = [];
  // Ten months of history up to this month, plus next month planned.
  for (let back = 9; back >= -1; back--) {
    const { year, month } = shiftMonth(t.year, t.month, -back);
    const count = back > 6 ? 3 : back > 2 ? 4 : 5;
    TEMPLATES.slice(0, count).forEach((tpl, i) => {
      const id = `00000000-0000-4000-8000-${String(year).slice(2)}${String(month).padStart(2, "0")}0000000${i}`;
      const start = back === 0 && i === 4 ? addDays(today, -6) : make(year, month, 1);
      objectives.push({
        id,
        title: tpl.title,
        description: i === 1 ? "Fiction or non-fiction, anything counts." : null,
        category: tpl.category,
        icon: tpl.icon,
        month,
        year,
        status: "active",
        start_date: maxDate(start, make(year, month, 1)),
        archived_on: null,
        created_at: `${make(year, month, 1)}T00:00:00Z`,
      });
      const to = minDate(monthEnd(year, month), addDays(today, -1));
      if (to < start) return;
      const trend = 0.08 * (6 - Math.min(back, 6)) / 6; // gets better over time
      for (const d of eachDay(start, to)) if (!rest.has(d) && random() < tpl.p + trend - 0.04) entries.push({ objective_id: id, completion_date: d, completed: true });
      if (back === 0 && i < 2) entries.push({ objective_id: id, completion_date: today, completed: true });
    });
  }
  return { objectives, entries };
}
