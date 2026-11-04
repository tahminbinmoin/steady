"use client";
import { heatLevel, type DayMap } from "@/lib/analytics/engine";
import { addDays, formatDate, make, monthShort, parts, weekday } from "@/lib/dates/civil";
import { cn } from "@/lib/utils";

const HEAT = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];

/**
 * GitHub-style year heatmap: one column per week (Monday first), one cell per
 * day, shaded by that day's completed ÷ eligible. View only.
 */
export function YearHeatmap({ year, days, today }: { year: number; days: DayMap; today: string }) {
  const jan1 = make(year, 1, 1);
  const dec31 = make(year, 12, 31);
  const start = addDays(jan1, -((weekday(jan1) + 6) % 7)); // Monday on/before Jan 1
  const weeks: string[][] = [];
  for (let d = start; d <= dec31; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));

  const monthLabels = weeks.map((w, i) => {
    const first = w.find((d) => parts(d).day === 1 && parts(d).year === year);
    return first && i < weeks.length - 1 ? monthShort(parts(first).month) : null;
  });

  return (
    <div>
      <div className="scroll-quiet overflow-x-auto pb-1">
        <div className="grid min-w-[640px] gap-[3px]" style={{ gridTemplateColumns: `1.75rem repeat(${weeks.length}, minmax(9px, 1fr))`, gridTemplateRows: "14px" }}>
          <span />
          {monthLabels.map((m, i) => (
            <span key={i} className="whitespace-nowrap text-[10px] leading-none text-muted" style={{ gridColumn: i + 2, gridRow: 1 }}>
              {m}
            </span>
          ))}
          {["Mon", "", "Wed", "", "Fri", "", ""].map((l, r) => (
            <span key={r} className="self-center pr-1 text-[10px] leading-none text-faint" style={{ gridColumn: 1, gridRow: r + 2 }}>
              {l}
            </span>
          ))}
          {weeks.map((w, c) =>
            w.map((d, r) => {
              const inYear = d.startsWith(`${year}-`);
              if (!inYear) return <span key={d} className="aspect-square" style={{ gridColumn: c + 2, gridRow: r + 2 }} />;
              const s = days.get(d);
              const level = heatLevel(s);
              const future = d > today;
              const label = future ? `${formatDate(d, { year: true })}: upcoming` : s ? `${formatDate(d, { year: true })}: ${s.completed} of ${s.eligible} done` : `${formatDate(d, { year: true })}: nothing tracked`;
              return (
                <span
                  key={d}
                  title={label}
                  aria-label={label}
                  role="img"
                  style={{ gridColumn: c + 2, gridRow: r + 2 }}
                  className={cn(
                    "aspect-square rounded-[2.5px]",
                    level >= 0 ? HEAT[level] : future ? "border border-dashed border-border" : "bg-surface-2/70",
                    d === today && "ring-1 ring-text ring-offset-1 ring-offset-surface",
                  )}
                />
              );
            }),
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        <span>Less</span>
        {HEAT.map((h) => (
          <span key={h} className={cn("size-[11px] rounded-[2.5px]", h)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
