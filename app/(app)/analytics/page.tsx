import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { getEntries, getObjectives, getToday } from "@/lib/data";
import { make, parseMonthKey, parts } from "@/lib/dates/civil";
import { yearFromParams } from "@/lib/period";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ today }, sp] = await Promise.all([getToday(), searchParams]);
  const year = yearFromParams(sp, today);
  const [objectives, entries] = await Promise.all([getObjectives({ year }), getEntries({ from: make(year, 1, 1), to: make(year, 12, 31) })]);

  // Weekly chart month: ?month if it is in this year, else this month, else the last tracked month.
  const asked = parseMonthKey(typeof sp.month === "string" ? sp.month : null);
  const t = parts(today);
  const tracked = [...new Set(objectives.map((o) => o.month))].sort((a, b) => a - b);
  const month =
    asked && asked.year === year
      ? asked.month
      : year === t.year && tracked.includes(t.month)
        ? t.month
        : (tracked.filter((m) => year < t.year || m <= t.month).at(-1) ?? tracked[0] ?? (year === t.year ? t.month : 1));

  return <AnalyticsView year={year} month={month} objectives={objectives} entries={entries} />;
}
