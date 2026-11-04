"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/analytics/engine";
import { formatDate, parts } from "@/lib/dates/civil";
import { axisProps, ChartEmpty, ChartTooltip, gridProps, pctTick } from "./chart-parts";

/** Rolling 7-day completion % over time. */
export function TrendChart({ points, height = 220 }: { points: TrendPoint[]; height?: number }) {
  if (points.filter((p) => p.rate !== null).length < 2)
    return <ChartEmpty height={height}>Your trend line appears after a few days of tracking.</ChartEmpty>;
  const rows = points.map((p) => ({ ...p, pct: p.rate === null ? null : Math.round(p.rate * 1000) / 10 }));
  const tickEvery = Math.max(1, Math.ceil(rows.length / 6));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="date"
            {...axisProps}
            interval={tickEvery - 1}
            tickFormatter={(d: string) => {
              const { day, month } = parts(d);
              return `${day}/${month}`;
            }}
          />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={pctTick} {...axisProps} width={40} />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload;
              if (!p) return null;
              return (
                <ChartTooltip
                  title={`7 days to ${formatDate(p.date)}`}
                  rows={[
                    { label: "Completion", value: p.pct === null ? "—" : `${p.pct}%` },
                    { label: "Check-ins", value: `${p.completed} / ${p.eligible}` },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="pct"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#trend-fill)"
            connectNulls
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
