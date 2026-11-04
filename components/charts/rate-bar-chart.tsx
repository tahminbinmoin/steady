"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisProps, ChartEmpty, ChartTooltip, gridProps, pctTick } from "./chart-parts";

export type RateBar = {
  key: string;
  label: string;
  tooltipTitle: string;
  rate: number | null; // 0..1
  completed: number;
  eligible: number;
  highlight?: boolean;
};

/** One bar per period, height = completion %. Periods with nothing eligible draw no bar. */
export function RateBarChart({ data, height = 220, empty }: { data: RateBar[]; height?: number; empty: string }) {
  if (!data.some((d) => d.eligible > 0)) return <ChartEmpty height={height}>{empty}</ChartEmpty>;
  const rows = data.map((d) => ({ ...d, pct: d.rate === null ? null : Math.round(d.rate * 1000) / 10 }));
  return (
    <div style={{ height }} role="img" aria-label={rows.map((r) => `${r.tooltipTitle}: ${r.pct ?? "no data"}${r.pct !== null ? "%" : ""}`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} interval={0} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={pctTick} {...axisProps} width={40} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)", radius: 6 }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload;
              if (!p) return null;
              return (
                <ChartTooltip
                  title={p.tooltipTitle}
                  rows={[
                    { label: "Completion", value: p.pct === null ? "—" : `${p.pct}%` },
                    { label: "Check-ins", value: `${p.completed} / ${p.eligible}` },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.key} fill={r.highlight ? "var(--accent)" : "color-mix(in oklab, var(--accent) 62%, var(--surface))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
