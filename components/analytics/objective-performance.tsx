import { ObjectiveIcon } from "@/components/common/objective-icon";
import { Progress } from "@/components/ui/progress";
import { formatRate, type HabitPerformance } from "@/lib/analytics/engine";

/** Completion per habit. A habit carried across months is one row. */
export function HabitPerformanceList({ rows }: { rows: HabitPerformance[] }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((h) => (
        <li key={h.key} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <ObjectiveIcon icon={h.icon} className="size-8 text-[15px]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium">{h.title}</span>
              <span className="tabular shrink-0 text-sm">{formatRate(h.rate)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <Progress value={h.rate} className="flex-1" label={`${h.title} completion`} />
              <span className="tabular w-28 shrink-0 text-right text-[11px] text-muted">
                {h.completed}/{h.eligible} · {h.months} mo
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
