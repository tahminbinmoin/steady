"use client";
import { CalendarCheck2, CheckCheck, Flame, Percent, Target, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/app/app-context";
import { useTracker } from "@/components/app/use-tracker";
import { WeekCards } from "@/components/calendar/week-cards";
import { RateBarChart } from "@/components/charts/rate-bar-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { StatCard } from "@/components/common/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  activeDates,
  allWeeksOfYear,
  computeDays,
  computeStreaks,
  formatRate,
  monthlyStats,
  rankPeriods,
  rollingTrend,
  tallyAll,
  todaySummary,
  trendDirection,
  weeklyStats,
} from "@/lib/analytics/engine";
import { addDays, formatDate, monthName, monthShort, parts } from "@/lib/dates/civil";
import type { Entry, Objective } from "@/lib/types";
import { firstName } from "@/lib/utils";
import { TodayPanel } from "./today-panel";

function greeting(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  return hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function motivation(opts: { objectives: number; allDone: boolean; streak: number; hadHistory: boolean }) {
  if (opts.objectives === 0) return "Small, daily, on purpose. Start with one objective.";
  if (opts.allDone) return "Everything is done for today. Tomorrow, the same again.";
  if (opts.streak >= 7) return `${opts.streak} days in a row. Protect the chain.`;
  if (opts.streak >= 2) return `${opts.streak} days running. Keep today in the chain.`;
  if (opts.hadHistory && opts.streak === 0) return "Missed a day? The next tick matters more than the last miss.";
  return "Consistency beats intensity. One tick at a time.";
}

export function DashboardView({ objectives, entries }: { objectives: Objective[]; entries: Entry[] }) {
  const { today, timezone, user } = useApp();
  const { entries: live, index, toggle, lastTick } = useTracker(entries);
  const t = parts(today);

  const stats = useMemo(() => {
    const days = computeDays(objectives, index, today);
    const overall = tallyAll(days);
    const streaks = computeStreaks(activeDates(live), today);
    const years = [...new Set(objectives.map((o) => o.year))].filter((y) => y <= t.year);
    const months = years.flatMap((y) => monthlyStats(y, objectives, days));
    const weeksAll = years.flatMap((y) => allWeeksOfYear(y, objectives, index, today));
    return {
      days,
      overall,
      streaks,
      bestMonth: rankPeriods(months, "best"),
      bestWeek: rankPeriods(weeksAll, "best"),
      weeks: weeklyStats(t.year, t.month, objectives, index, today),
      trend: rollingTrend(days, addDays(today, -29), today),
      direction: trendDirection(days, today),
      summary: todaySummary(objectives, index, today),
    };
  }, [objectives, index, live, today, t.year, t.month]);

  const name = firstName(user.name);
  const hadHistory = live.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[28px]" suppressHydrationWarning>
            {greeting(timezone)}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {motivation({ objectives: objectives.length, allDone: stats.summary.allDone, streak: stats.streaks.current, hadHistory })}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-border bg-surface px-3 py-1.5 sm:self-auto" title="Consecutive days with at least one completed objective">
          <Flame className={stats.streaks.current > 0 ? "size-4 text-accent" : "size-4 text-faint"} />
          <span className="tabular text-sm font-medium">{stats.streaks.current}</span>
          <span className="text-sm text-muted">day streak</span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <TodayPanel objectives={objectives} index={index} onToggle={toggle} lastTickAt={lastTick?.at} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-3 lg:auto-rows-fr">
          <StatCard label="Completion" value={formatRate(stats.overall.rate, 1)} hint={`${stats.overall.completed} of ${stats.overall.eligible} check-ins`} icon={Percent} accent />
          <StatCard label="Current streak" value={`${stats.streaks.current}d`} hint={stats.streaks.current ? "Days with ≥ 1 tick" : "Tick one today to start"} icon={Flame} />
          <StatCard
            label="Longest streak"
            value={`${stats.streaks.longest}d`}
            hint={stats.streaks.longestFrom ? `${formatDate(stats.streaks.longestFrom, { short: true })} – ${formatDate(stats.streaks.longestTo!, { short: true })}` : "No streak yet"}
            icon={Trophy}
          />
          <StatCard label="Check-ins" value={stats.overall.completed} hint="Completed, all time" icon={CheckCheck} />
          <StatCard label="Objectives" value={objectives.length} hint="Created, all time" icon={Target} />
          <StatCard
            label="Best month"
            value={stats.bestMonth ? monthShort(stats.bestMonth.month) : "—"}
            hint={stats.bestMonth ? `${formatRate(stats.bestMonth.rate)} in ${monthName(stats.bestMonth.month)} ${stats.bestMonth.year}` : "Needs 7+ check-ins"}
            icon={CalendarCheck2}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {monthName(t.month)}, week by week
            </CardTitle>
            <CardDescription>
              {stats.bestWeek
                ? `Best week so far: week ${stats.bestWeek.index} of ${monthName(stats.bestWeek.month)} ${stats.bestWeek.year} at ${formatRate(stats.bestWeek.rate)}`
                : "Completion for each week of this month"}
            </CardDescription>
          </div>
          <Link href="/calendar" className="shrink-0 text-[13px] text-accent hover:underline">
            Open calendar
          </Link>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <WeekCards weeks={stats.weeks} compact />
          <RateBarChart
            height={190}
            empty="Add objectives for this month to see weekly progress."
            data={stats.weeks.map((w) => ({
              key: String(w.index),
              label: `W${w.index}`,
              tooltipTitle: `Week ${w.index} (${parts(w.from).day}–${parts(w.to).day} ${monthShort(w.month)})`,
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
            <CardTitle>Last 30 days</CardTitle>
            <CardDescription>Rolling 7-day completion rate</CardDescription>
          </div>
          {stats.direction !== null && Math.abs(stats.direction) >= 0.02 && (
            <span className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted">
              {stats.direction > 0 ? <TrendingUp className="size-4 text-accent" /> : <TrendingDown className="size-4 text-danger" />}
              {stats.direction > 0 ? "Improving" : "Slipping"} {Math.round(Math.abs(stats.direction) * 100)} pts vs previous 2 weeks
            </span>
          )}
        </CardHeader>
        <CardContent>
          <TrendChart points={stats.trend} height={200} />
        </CardContent>
      </Card>
    </div>
  );
}
