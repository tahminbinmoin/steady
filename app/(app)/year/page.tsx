import type { Metadata } from "next";
import { YearView } from "@/components/year/year-view";
import { getEntries, getObjectives, getToday } from "@/lib/data";
import { make } from "@/lib/dates/civil";
import { yearFromParams } from "@/lib/period";

export const metadata: Metadata = { title: "Yearly Overview" };

export default async function YearPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ today }, sp] = await Promise.all([getToday(), searchParams]);
  const year = yearFromParams(sp, today);
  const [objectives, entries] = await Promise.all([getObjectives({ year }), getEntries({ from: make(year, 1, 1), to: make(year, 12, 31) })]);
  return <YearView year={year} objectives={objectives} entries={entries} />;
}
