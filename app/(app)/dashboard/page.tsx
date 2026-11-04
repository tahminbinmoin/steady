import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getEntries, getObjectives } from "@/lib/data";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [objectives, entries] = await Promise.all([getObjectives(), getEntries()]);
  return <DashboardView objectives={objectives} entries={entries} />;
}
