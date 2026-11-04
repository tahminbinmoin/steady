"use client";
import { CopyPlus, ListChecks, Lock, Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app/app-context";
import { useTracker } from "@/components/app/use-tracker";
import { EmptyState } from "@/components/common/empty-state";
import { MonthNav } from "@/components/common/period-nav";
import { PageHeader } from "@/components/shell/app-shell";
import { useAllDoneCelebration } from "@/components/tracker/use-celebration";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { todaySummary } from "@/lib/analytics/engine";
import { formatDate, monthKey, monthName, parts, shiftMonth } from "@/lib/dates/civil";
import type { Entry, Objective } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CarryForwardDialog } from "./carry-forward-dialog";
import { ObjectiveCard } from "./objective-card";
import { ObjectiveFormDialog } from "./objective-form-dialog";

type Props = {
  year: number;
  month: number;
  objectives: Objective[];
  previousMonthObjectives: Objective[];
  entries: Entry[];
};

export function HabitsView({ year, month, objectives, previousMonthObjectives, entries }: Props) {
  const { today } = useApp();
  const { index, toggle, lastTick } = useTracker(entries);
  const [carrying, setCarrying] = useState(false);

  const t = parts(today);
  const viewKey = monthKey(year, month);
  const currentKey = monthKey(t.year, t.month);
  const isCurrent = viewKey === currentKey;
  const isPast = viewKey < currentKey;

  const active = objectives.filter((o) => o.status === "active");
  const archived = objectives.filter((o) => o.status === "archived");
  const summary = todaySummary(objectives, index, today);
  const celebrating = useAllDoneCelebration(summary.allDone, lastTick?.at);
  const prev = shiftMonth(year, month, -1);

  const newButton = !isPast && (
    <ObjectiveFormDialog
      defaultMonth={{ year, month }}
      trigger={
        <Button variant="primary">
          <Plus /> New objective
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="My Habits"
        description={
          isCurrent
            ? `${formatDate(today)} · ${summary.total ? `${summary.done} of ${summary.total} done today` : "No objectives to tick today"}`
            : isPast
              ? `${monthName(month)} ${year} is finished, so its days are read-only.`
              : `Planning ahead for ${monthName(month)} ${year}.`
        }
        actions={
          <>
            <MonthNav year={year} month={month} />
            {newButton}
          </>
        }
      />

      {isCurrent && summary.total > 0 && (
        <div className={cn("mb-6 flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 transition-shadow duration-700", celebrating && "shadow-[0_0_0_3px_var(--accent-soft)]")}>
          <span className="text-sm font-medium">Today</span>
          <Progress value={summary.total ? summary.done / summary.total : 0} className="h-2 flex-1" label="Today's progress" />
          <span className="tabular text-sm text-muted">
            {summary.done}/{summary.total}
          </span>
        </div>
      )}

      {isPast && objectives.length > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-[var(--radius-control)] bg-surface-2 px-3 py-2 text-[13px] text-muted">
          <Lock className="size-3.5" /> Past months are read-only. You can still edit names, archive, or carry objectives forward.
        </div>
      )}

      {objectives.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={isPast ? `Nothing was tracked in ${monthName(month)}` : `No objectives for ${monthName(month)} yet`}
          description={isPast ? "Pick another month, or start something new this month." : "Add one or two things you want to do every day. You can add more any time."}
          action={
            <>
              {newButton}
              {!isPast && previousMonthObjectives.length > 0 && (
                <Button onClick={() => setCarrying(true)}>
                  <CopyPlus /> Carry forward {previousMonthObjectives.length} from {monthName(prev.month)}
                </Button>
              )}
            </>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {active.map((o) => (
            <ObjectiveCard key={o.id} objective={o} index={index} onToggle={toggle} />
          ))}
          {archived.length > 0 && (
            <details className="group pt-4">
              <summary className="cursor-pointer list-none text-[13px] text-muted hover:text-text">
                <span className="group-open:hidden">Show</span>
                <span className="hidden group-open:inline">Hide</span> {archived.length} archived
              </summary>
              <div className="mt-2.5 space-y-2.5">
                {archived.map((o) => (
                  <ObjectiveCard key={o.id} objective={o} index={index} onToggle={toggle} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {carrying && (
        <CarryForwardDialog objectives={previousMonthObjectives} open={carrying} onOpenChange={setCarrying} defaultTarget={{ year, month }} />
      )}
    </>
  );
}
