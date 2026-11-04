import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar/calendar-view";
import { getEntries, getObjectives, getToday } from "@/lib/data";
import { monthEnd, monthStart } from "@/lib/dates/civil";
import { monthFromParams } from "@/lib/period";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ today }, sp] = await Promise.all([getToday(), searchParams]);
  const { year, month } = monthFromParams(sp, today);
  const [objectives, entries] = await Promise.all([
    getObjectives({ year, month }),
    getEntries({ from: monthStart(year, month), to: monthEnd(year, month) }),
  ]);
  return <CalendarView year={year} month={month} objectives={objectives} entries={entries} />;
}
