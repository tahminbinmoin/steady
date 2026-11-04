import type { Metadata } from "next";
import { HabitsView } from "@/components/habits/habits-view";
import { getEntries, getObjectives, getToday } from "@/lib/data";
import { monthEnd, monthStart, shiftMonth } from "@/lib/dates/civil";
import { monthFromParams } from "@/lib/period";

export const metadata: Metadata = { title: "My Habits" };

export default async function HabitsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ today }, sp] = await Promise.all([getToday(), searchParams]);
  const { year, month } = monthFromParams(sp, today);
  const prev = shiftMonth(year, month, -1);
  const [objectives, previous, entries] = await Promise.all([
    getObjectives({ year, month }),
    getObjectives(prev),
    getEntries({ from: monthStart(year, month), to: monthEnd(year, month) }),
  ]);
  return <HabitsView year={year} month={month} objectives={objectives} previousMonthObjectives={previous} entries={entries} />;
}
