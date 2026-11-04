"use client";
import { ChartColumn, Percent, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/components/app/app-context";
import { RateBarChart } from "@/components/charts/rate-bar-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { YearHeatmap } from "@/components/charts/year-heatmap";
import { EmptyState } from "@/components/common/empty-state";
import { YearNav } from "@/components/common/period-nav";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  activeDates,
  allWeeksOfYear,
  buildIndex,
  computeDays,
  computeStreaks,
  formatRate,
  MIN_ELIGIBLE_FOR_RANKING,
  monthlyStats,
  habitPerformance,
  type HabitPerformance,
  rankPeriods,
  rollingTrend,
  tallyAll,
  weeklyStats,
} from "@/lib/analytics/engine";
import { make, minDate, monthKey, monthName, monthShort, parts } from "@/lib/dates/civil";
import type { Entry, Objective } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HabitPerformanceList } from "./objective-performance";

export function AnalyticsView({ year, month, objectives, entries }: { year: number; month: number; objectives: Objective[]; entries: Entry[] }) {
  const { today } = useApp();
  const pathname = usePathname();

  const a = useMemo(() => {
    const index = buildIndex(entries);
    const days = computeDays(objectives, index, today);
    const months = monthlyStats(year, objectives, days);
    const weeksAll = allWeeksOfYear(year, objectives, index, today);
    const yearEnd = make(year, 12, 31);
    const trendTo = minDate(today, yearEnd);
    const firstActive = objectives.length ? objectives.map((o) => o.start_date).sort()[0] : make(year, 1, 1);
    const perf = habitPerformance(objectives, index, today);
    const ranked = perf.filter((p) => p.eligible >= MIN_ELIGIBLE_FOR_RANKING);
    return {
      index,
      days,
      months,
      weeksAll,
      total: tallyAll(days),
      streaks: computeStreaks(activeDates(entries.filter((e) => e.completion_date.startsWith(`${year}-`))), trendTo),
      bestMonth: rankPeriods(months, "best"),
      worstMonth: rankPeriods(months, "worst"),
      bestWeek: rankPeriods(weeksAll, "best"),
      weeks: weeklyStats(year, month, objectives, index, today),
      trend: trendTo >= firstActive ? rollingTrend(days, firstActive > make(year, 1, 1) ? firstActive : make(year, 1, 1), trendTo) : [],
      perf,
      most: ranked[0] ?? null,
      least: ranked.length > 1 ? ranked.at(-1)! : null,
    };
  }, [entries, objectives, today, year, month]);

  const monthsWithObjectives = a.months.filter((m) => m.objectives > 0).map((m) => m.month);

  return (
    <>
      <PageHeader title="Analytics" description={`Every number below is calculated from your check-ins in ${year}.`} actions={<YearNav year={year} />} />

      {objectives.length === 0 ? (
        <EmptyState icon={ChartColumn} title={`No objectives in ${year}`} description="Charts appear once you've tracked a few days." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Completion" value={formatRate(a.total.rate, 1)} hint="Completed ÷ eligible" icon={Percent} accent />
            <StatCard label="Check-ins" value={a.total.completed} hint={`${a.total.missed} missed`} />
            <StatCard label="Objectives" value={objectives.length} hint={`${monthsWithObjectives.length} months tracked`} />
            <StatCard label="Longest streak" value={`${a.streaks.longest}d`} hint="Consecutive days ≥ 1 tick" />
            <StatCard label="Best month" value={a.bestMonth ? monthShort(a.bestMonth.month) : "—"} hint={a.bestMonth ? formatRate(a.bestMonth.rate) : "Needs 7+ check-ins"} />
            <StatCard
              label="Best week"
              value={a.bestWeek ? `W${a.bestWeek.index} ${monthShort(a.bestWeek.month)}` : "—"}
              hint={a.bestWeek ? formatRate(a.bestWeek.rate) : "Needs 7+ check-ins"}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Weekly completion</CardTitle>
                  <CardDescription>
                    {monthName(month)} {year}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const enabled = monthsWithObjectives.includes(m);
                    return enabled ? (
                      <Link
                        key={m}
                        href={`${pathname}?year=${year}&month=${monthKey(year, m)}`}
                        scroll={false}
                        className={cn("rounded-full px-2.5 py-1 text-xs transition-colors", m === month ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted hover:text-text")}
                      >
                        {monthShort(m)}
                      </Link>
                    ) : (
                      <span key={m} className="rounded-full px-2.5 py-1 text-xs text-faint">
                        {monthShort(m)}
                      </span>
                    );
                  })}
                </div>
                <RateBarChart
                  empty={`No objectives in ${monthName(month)}.`}
                  data={a.weeks.map((w) => ({
                    key: String(w.index),
                    label: `Week ${w.index}`,
                    tooltipTitle: `Week ${w.index} · ${parts(w.from).day}–${parts(w.to).day} ${monthShort(w.month)}`,
                    rate: w.status === "future" ? null : w.rate,
                    completed: w.completed,
                    eligible: w.eligible,
                    highlight: w.status === "current",
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Monthly completion</CardTitle>
                  <CardDescription>All 12 months of {year}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <RateBarChart
                  height={252}
                  empty="No completed months yet."
                  data={a.months.map((m) => ({
                    key: String(m.month),
                    label: monthShort(m.month).slice(0, 1),
                    tooltipTitle: `${monthName(m.month)} ${m.year}`,
                    rate: m.rate,
                    completed: m.completed,
                    eligible: m.eligible,
                    highlight: a.bestMonth?.month === m.month,
                  }))}
                />
                {a.bestMonth && (
                  <p className="mt-3 text-xs text-muted">
                    Darker bar: best month ({monthName(a.bestMonth.month)}, {formatRate(a.bestMonth.rate)}).
                    {a.worstMonth && a.worstMonth.month !== a.bestMonth.month && ` Least consistent: ${monthName(a.worstMonth.month)}, ${formatRate(a.worstMonth.rate)}.`}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Habit performance</CardTitle>
                  <CardDescription>Each habit across every month it was tracked in {year}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {a.perf.length ? <HabitPerformanceList rows={a.perf} /> : <p className="text-sm text-muted">No tracked days yet.</p>}
              </CardContent>
            </Card>
            <div className="grid content-start gap-3">
              <Callout tone="good" title="Most consistent" item={a.most} />
              <Callout tone="bad" title="Needs attention" item={a.least} />
            </div>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Daily activity</CardTitle>
                <CardDescription>Each square is one day, shaded by the share of objectives completed</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <YearHeatmap year={year} days={a.days} today={today} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Progress trend</CardTitle>
                <CardDescription>Rolling 7-day completion rate across {year}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <TrendChart points={a.trend} height={240} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}


function Callout({ tone, title, item }: { tone: "good" | "bad"; title: string; item: HabitPerformance | null }) {
  const Icon = tone === "good" ? ThumbsUp : ThumbsDown;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Icon className={cn("size-4", tone === "good" ? "text-accent" : "text-faint")} /> {title}
      </div>
      {item ? (
        <>
          <div className="mt-2 truncate text-[15px] font-medium">
            {item.icon} {item.title}
          </div>
          <div className="tabular mt-1 text-sm text-muted">
            {formatRate(item.rate)} · {item.completed} of {item.eligible} days{item.months > 1 ? ` over ${item.months} months` : ""}
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">Needs at least {MIN_ELIGIBLE_FOR_RANKING} tracked days.</p>
      )}
    </Card>
  );
}
