"use client";
import { useEffect, useRef } from "react";
import { useApp } from "@/components/app/app-context";
import { ObjectiveIcon } from "@/components/common/objective-icon";
import { CheckButton, stateLabel } from "@/components/tracker/check-button";
import { canToggle, cellState, heatLevel, isDone, type CompletionIndex, type DayMap } from "@/lib/analytics/engine";
import { daysInMonth, formatDate, make, parts, weekdayInitial, weekdayShort } from "@/lib/dates/civil";
import type { Objective } from "@/lib/types";
import { cn } from "@/lib/utils";

const HEAT = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];

export function MonthGrid({
  year,
  month,
  objectives,
  index,
  days,
  onToggle,
}: {
  year: number;
  month: number;
  objectives: Objective[];
  index: CompletionIndex;
  days: DayMap;
  onToggle: (id: string, completed: boolean) => void;
}) {
  const { today, dateFloor } = useApp();
  const n = daysInMonth(year, month);
  const dates = Array.from({ length: n }, (_, i) => make(year, month, i + 1));
  const scroller = useRef<HTMLDivElement>(null);
  const todayInMonth = dates.includes(today);

  // On narrow screens, bring today's column into view.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !todayInMonth) return;
    const col = el.querySelector<HTMLElement>("[data-today-col]");
    const name = el.querySelector<HTMLElement>("[role=columnheader]");
    // Keep two past days visible to the left of today, beside the pinned name column.
    if (col && name && el.scrollWidth > el.clientWidth) el.scrollLeft = Math.max(0, col.offsetLeft - name.offsetWidth - col.offsetWidth * 2);
  }, [todayInMonth, year, month]);

  const cols = `var(--name-col) repeat(${n}, minmax(1.65rem, 1fr))`;
  const weekStart = (d: string) => [8, 15, 22, 29].includes(parts(d).day);

  return (
    <div ref={scroller} className="scroll-quiet overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface">
      <div role="grid" aria-label="Monthly tracking grid" className="grid min-w-max [--name-col:9.5rem] sm:min-w-full sm:[--name-col:12.5rem]" style={{ gridTemplateColumns: cols }}>
        {/* Header */}
        <div role="row" className="contents">
          <div role="columnheader" className="sticky left-0 z-10 flex items-end border-b border-border bg-surface px-4 pb-2 pt-3 text-xs font-medium text-muted">
            Objective
          </div>
          {dates.map((d) => {
            const isToday = d === today;
            return (
              <div
                role="columnheader"
                key={d}
                {...(isToday ? { "data-today-col": true } : {})}
                aria-label={formatDate(d)}
                className={cn("flex flex-col items-center gap-0.5 border-b border-border pb-2 pt-3", isToday && "bg-accent-soft", weekStart(d) && "border-l border-l-border/60")}
              >
                <span className={cn("text-[10px] uppercase", isToday ? "font-semibold text-accent" : "text-faint")} title={weekdayShort(d)}>
                  {weekdayInitial(d)}
                </span>
                <span className={cn("tabular text-xs", isToday ? "font-semibold text-accent" : d > today ? "text-faint" : "text-muted")}>{parts(d).day}</span>
              </div>
            );
          })}
        </div>

        {/* One row per objective */}
        {objectives.map((o) => (
          <div role="row" key={o.id} className="group contents">
            <div role="rowheader" className="sticky left-0 z-10 flex min-w-0 items-center gap-2.5 border-b border-border bg-surface px-4 py-2 group-last:border-b-0">
              <ObjectiveIcon icon={o.icon} className="size-7 rounded-[7px] text-sm" />
              <span className={cn("truncate text-[13px] font-medium", o.status === "archived" && "text-muted")}>{o.title}</span>
            </div>
            {dates.map((d) => {
              const done = isDone(index, o.id, d);
              const state = cellState(o, d, done, today);
              const interactive = canToggle(o, d, today, dateFloor);
              return (
                <div role="gridcell" key={d} className={cn("grid place-items-center border-b border-border py-2 group-last:border-b-0", d === today && "bg-accent-soft", weekStart(d) && "border-l border-l-border/60")}>
                  <CheckButton
                    state={state}
                    interactive={interactive}
                    onToggle={() => onToggle(o.id, !done)}
                    label={`${o.title}, ${formatDate(d)}, ${stateLabel(state)}`}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Daily totals */}
        <div role="row" className="contents">
          <div role="rowheader" className="sticky left-0 z-10 border-t border-border bg-surface-2 px-4 py-2.5 text-xs text-muted">
            Daily completion
          </div>
          {dates.map((d) => {
            const s = days.get(d);
            const level = heatLevel(s);
            return (
              <div key={d} role="gridcell" className={cn("grid place-items-center border-t border-border bg-surface-2/60 py-2.5", weekStart(d) && "border-l border-l-border/60")}>
                <span
                  title={s ? `${formatDate(d)}: ${s.completed} of ${s.eligible}` : formatDate(d)}
                  className={cn("size-3 rounded-[3px]", level >= 0 ? HEAT[level] : "border border-dashed border-border")}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
