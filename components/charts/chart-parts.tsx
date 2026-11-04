"use client";
import type { ReactNode } from "react";

/** Shared look for Recharts: recessive axes and grid, text in text colours. */
export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--text-muted)", fontSize: 11 },
} as const;

export const gridProps = { stroke: "var(--border)", strokeDasharray: "0", vertical: false } as const;

export const pctTick = (v: number) => `${Math.round(v)}%`;

export function ChartTooltip({ title, rows }: { title: ReactNode; rows: { label: string; value: ReactNode }[] }) {
  return (
    <div className="min-w-36 rounded-[8px] border border-border bg-surface px-3 py-2 text-xs shadow-raised">
      <div className="mb-1 font-medium text-text">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-4 text-muted">
          <span>{r.label}</span>
          <span className="tabular text-text">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartEmpty({ children, height = 220 }: { children: ReactNode; height?: number }) {
  return (
    <div className="grid place-items-center rounded-[var(--radius-control)] border border-dashed border-border text-center text-sm text-muted" style={{ height }}>
      <p className="max-w-64 px-4">{children}</p>
    </div>
  );
}
