"use client";
import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/app/app-context";
import { useTracker } from "@/components/app/use-tracker";
import { EmptyState } from "@/components/common/empty-state";
import { MonthNav } from "@/components/common/period-nav";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { computeDays, formatRate, tallyAll, weeklyStats } from "@/lib/analytics/engine";
import { monthEnd, monthKey, monthName, monthStart } from "@/lib/dates/civil";
import type { Entry, Objective } from "@/lib/types";
import { WeekCards } from "./week-cards";
import { MonthGrid } from "./month-grid";

export function CalendarView({ year, month, objectives, entries }: { year: number; month: number; objectives: Objective[]; entries: Entry[] }) {
  const { today } = useApp();
  const { index, toggle } = useTracker(entries);
  const days = useMemo(() => computeDays(objectives, index, today, { from: monthStart(year, month), to: monthEnd(year, month) }), [objectives, index, today, year, month]);
  const weeks = useMemo(() => weeklyStats(year, month, objectives, index, today), [year, month, objectives, index, today]);
  const total = tallyAll(days);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={
          objectives.length
            ? `${monthName(month)} ${year} · ${total.completed} of ${total.eligible} check-ins · ${formatRate(total.rate, 1)}`
            : `${monthName(month)} ${year}`
        }
        actions={<MonthNav year={year} month={month} />}
      />
      {objectives.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={`No objectives in ${monthName(month)} ${year}`}
          description="Objectives you create for a month appear here as rows, one column per day."
          action={
            monthKey(year, month) >= today.slice(0, 7) && (
              <Button asChild variant="primary">
                <Link href={`/habits?month=${monthKey(year, month)}`}>
                  <Plus /> Add objectives
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-8">
          <MonthGrid year={year} month={month} objectives={objectives} index={index} days={days} onToggle={toggle} />
          <section aria-labelledby="weeks-heading">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="weeks-heading" className="text-[15px] font-semibold tracking-tight">
                Weekly progress
              </h2>
              <span className="hidden text-xs text-muted sm:inline">Weeks are days 1–7, 8–14, 15–21, 22–28, 29–end</span>
            </div>
            <WeekCards weeks={weeks} />
          </section>
          <Legend />
        </div>
      )}
    </>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      <span className="flex items-center gap-2">
        <span className="size-3.5 rounded-[4px] bg-accent/85" /> Completed
      </span>
      <span className="flex items-center gap-2">
        <span className="size-3.5 rounded-[4px] border-2 border-accent" /> Today
      </span>
      <span className="flex items-center gap-2">
        <span className="size-3.5 rounded-[4px] bg-surface-2" /> Missed
      </span>
      <span className="flex items-center gap-2">
        <span className="size-3.5 rounded-[4px] border border-dashed border-border-strong" /> Upcoming
      </span>
      <span>Only today can be ticked.</span>
    </div>
  );
}
