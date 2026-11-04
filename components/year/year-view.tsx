"use client";
import { CheckCheck, Flame, Grid3x3, Percent, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/app/app-context";
import { YearHeatmap } from "@/components/charts/year-heatmap";
import { EmptyState } from "@/components/common/empty-state";
import { YearNav } from "@/components/common/period-nav";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { activeDates, buildIndex, computeDays, computeStreaks, formatRate, monthlyStats, rankPeriods, tallyAll } from "@/lib/analytics/engine";
import { formatDate, make, minDate, monthKey, monthName, monthStart } from "@/lib/dates/civil";
import type { Entry, Objective } from "@/lib/types";
import { cn } from "@/lib/utils";

export function YearView({ year, objectives, entries }: { year: number; objectives: Objective[]; entries: Entry[] }) {
  const { today } = useApp();
  const y = useMemo(() => {
    const index = buildIndex(entries);
    const days = computeDays(objectives, index, today);
    const months = monthlyStats(year, objectives, days);
    return {
      days,
      months,
      total: tallyAll(days),
      streaks: computeStreaks(activeDates(entries), minDate(today, make(year, 12, 31))),
      best: rankPeriods(months, "best"),
      worst: rankPeriods(months, "worst"),
    };
  }, [entries, objectives, today, year]);

  return (
    <>
      <PageHeader title="Yearly Overview" description={`${year} at a glance. Read-only: days can only be ticked on the day itself.`} actions={<YearNav year={year} />} />
      {objectives.length === 0 ? (
        <EmptyState icon={Grid3x3} title={`Nothing tracked in ${year}`} description="Once you track objectives, every day of the year shows up here." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Check-ins" value={y.total.completed} hint={`of ${y.total.eligible} eligible`} icon={CheckCheck} />
            <StatCard label="Completion" value={formatRate(y.total.rate, 1)} hint={`${year} overall`} icon={Percent} accent />
            <StatCard
              label="Longest streak"
              value={`${y.streaks.longest}d`}
              hint={y.streaks.longestFrom ? `${formatDate(y.streaks.longestFrom, { short: true })} – ${formatDate(y.streaks.longestTo!, { short: true })}` : "No streak yet"}
              icon={Flame}
            />
            <StatCard label="Most consistent" value={y.best ? monthName(y.best.month) : "—"} hint={y.best ? formatRate(y.best.rate) : "Needs 7+ check-ins"} icon={ThumbsUp} />
            <StatCard
              label="Least consistent"
              value={y.worst && y.worst.month !== y.best?.month ? monthName(y.worst.month) : "—"}
              hint={y.worst && y.worst.month !== y.best?.month ? formatRate(y.worst.rate) : "Not enough months yet"}
              icon={ThumbsDown}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{year} activity</CardTitle>
            </CardHeader>
            <CardContent>
              <YearHeatmap year={year} days={y.days} today={today} />
            </CardContent>
          </Card>

          <section aria-labelledby="months-heading">
            <h2 id="months-heading" className="mb-3 text-[15px] font-semibold tracking-tight">
              Monthly summaries
            </h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {y.months.map((m) => {
                const future = monthStart(year, m.month) > today;
                const isBest = y.best?.month === m.month;
                return (
                  <Link
                    key={m.month}
                    href={`/calendar?month=${monthKey(year, m.month)}`}
                    className={cn(
                      "rounded-[var(--radius-card)] border border-border bg-surface p-4 transition-colors hover:border-border-strong",
                      isBest && "border-accent/60",
                      (future || m.objectives === 0) && "bg-transparent",
                    )}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] font-medium">{monthName(m.month)}</span>
                      {isBest && <span className="text-[11px] text-accent">Best</span>}
                    </div>
                    <div className={cn("tabular mt-2 text-xl font-semibold tracking-tight", m.rate === null && "text-faint")}>{formatRate(m.rate)}</div>
                    <Progress value={m.rate} className="mt-2" label={`${monthName(m.month)} completion`} />
                    <div className="tabular mt-2 text-[11px] text-muted">
                      {future ? "Upcoming" : m.objectives === 0 ? "No objectives" : `${m.completed}/${m.eligible} · ${m.objectives} objective${m.objectives === 1 ? "" : "s"}`}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
