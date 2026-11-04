import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatRate, type WeekStat } from "@/lib/analytics/engine";
import { parts } from "@/lib/dates/civil";
import { cn } from "@/lib/utils";

export function WeekCards({ weeks, compact = false }: { weeks: WeekStat[]; compact?: boolean }) {
  if (compact) return <WeekRows weeks={weeks} />;
  return (
    <>
    <Card className="p-2 sm:hidden">
      <WeekRows weeks={weeks} />
    </Card>
    <div className="hidden gap-2.5 sm:grid sm:grid-cols-3 lg:grid-cols-5">
      {weeks.map((w) => {
        const future = w.status === "future";
        return (
          <Card key={w.index} className={cn("p-4", w.status === "current" && "border-accent/50", future && "opacity-60")}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium">Week {w.index}</span>
              <span className="tabular text-[11px] text-faint">
                {parts(w.from).day}–{parts(w.to).day}
              </span>
            </div>
            <div className="tabular mt-3 text-2xl font-semibold tracking-tight">{future || w.eligible === 0 ? "—" : formatRate(w.rate, w.rate !== null && w.rate < 1 ? 1 : 0)}</div>
            <Progress value={w.rate} className="mt-2.5" label={`Week ${w.index} completion`} />
            {!compact && (
              <dl className="tabular mt-3 grid grid-cols-2 gap-y-1 text-xs text-muted">
                <dt>Completed</dt>
                <dd className="text-right text-text">
                  {w.completed}/{w.eligible}
                </dd>
                <dt>Missed</dt>
                <dd className="text-right text-text">{w.missed}</dd>
                <dt>All days done</dt>
                <dd className="text-right text-text">
                  {w.objectivesCompleted}/{w.objectivesTracked}
                </dd>
              </dl>
            )}
            {future && <p className="mt-2 text-[11px] text-faint">Not started</p>}
            {w.status === "current" && <p className="mt-2 text-[11px] text-accent">In progress</p>}
          </Card>
        );
      })}
    </div>
    </>
  );
}

function WeekRows({ weeks }: { weeks: WeekStat[] }) {
  return (
    <ul className="space-y-1">
      {weeks.map((w) => {
        const future = w.status === "future";
        return (
          <li key={w.index} className={cn("grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3 rounded-[var(--radius-control)] px-2 py-2", w.status === "current" && "bg-accent-soft/60", future && "opacity-50")}>
            <span className="text-[13px] font-medium">
              Week {w.index}
              <span className="tabular block text-[11px] font-normal text-faint">
                {parts(w.from).day}–{parts(w.to).day}
              </span>
            </span>
            <Progress value={future ? null : w.rate} label={`Week ${w.index} completion`} />
            <span className="tabular text-right text-sm">
              {future || w.eligible === 0 ? <span className="text-faint">—</span> : formatRate(w.rate)}
              {!future && w.eligible > 0 && <span className="block text-[11px] text-muted">{w.completed}/{w.eligible}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
