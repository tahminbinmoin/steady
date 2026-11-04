"use client";
import { useMemo } from "react";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { AppProvider } from "@/components/app/app-context";
import { CalendarView } from "@/components/calendar/calendar-view";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { HabitsView } from "@/components/habits/habits-view";
import { SettingsView } from "@/components/settings/settings-view";
import { AppShell } from "@/components/shell/app-shell";
import { YearView } from "@/components/year/year-view";
import { make, monthEnd, monthStart, parseMonthKey, parseYear, parts, shiftMonth } from "@/lib/dates/civil";
import { demoActions } from "@/lib/demo/demo-actions";
import { demoData } from "@/lib/demo/fixtures";

export function DemoApp({ page, today, month: monthParam, year: yearParam }: { page: string; today: string; month?: string; year?: string }) {
  const data = useMemo(() => demoData(today), [today]);
  const actions = useMemo(() => demoActions(today), [today]);
  const t = parts(today);
  const m = parseMonthKey(monthParam) ?? { year: t.year, month: t.month };
  const y = parseYear(yearParam) ?? t.year;
  const inMonth = (yy: number, mm: number) => data.objectives.filter((o) => o.year === yy && o.month === mm);
  const entriesIn = (from: string, to: string) => data.entries.filter((e) => e.completion_date >= from && e.completion_date <= to);

  let view: React.ReactNode = null;
  if (page === "dashboard") view = <DashboardView objectives={data.objectives} entries={data.entries} />;
  if (page === "habits") {
    const prev = shiftMonth(m.year, m.month, -1);
    view = <HabitsView year={m.year} month={m.month} objectives={inMonth(m.year, m.month)} previousMonthObjectives={inMonth(prev.year, prev.month)} entries={entriesIn(monthStart(m.year, m.month), monthEnd(m.year, m.month))} />;
  }
  if (page === "calendar") view = <CalendarView year={m.year} month={m.month} objectives={inMonth(m.year, m.month)} entries={entriesIn(monthStart(m.year, m.month), monthEnd(m.year, m.month))} />;
  if (page === "analytics") {
    const objs = data.objectives.filter((o) => o.year === y);
    view = <AnalyticsView year={y} month={m.year === y ? m.month : t.month} objectives={objs} entries={entriesIn(make(y, 1, 1), make(y, 12, 31))} />;
  }
  if (page === "year") view = <YearView year={y} objectives={data.objectives.filter((o) => o.year === y)} entries={entriesIn(make(y, 1, 1), make(y, 12, 31))} />;
  if (page === "settings") view = <SettingsView ipTimezone="Asia/Dhaka" />;

  return (
    <AppProvider
      demoActions={actions}
      value={{
        mode: "demo",
        linkBase: "/preview",
        today,
        timezone: "Asia/Dhaka",
        timezoneSource: "ip",
        timezoneUpdatedAt: null,
        dateFloor: null,
        user: { name: "Demo User", email: "demo@example.com", avatarUrl: null },
      }}
    >
      <div className="bg-accent px-4 py-1.5 text-center text-xs font-medium text-accent-fg">Demo preview with sample data. Nothing here is saved.</div>
      <AppShell>{view}</AppShell>
    </AppProvider>
  );
}
