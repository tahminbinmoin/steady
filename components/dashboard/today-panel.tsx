"use client";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/app/app-context";
import { ObjectiveIcon } from "@/components/common/objective-icon";
import { CheckButton } from "@/components/tracker/check-button";
import { useAllDoneCelebration } from "@/components/tracker/use-celebration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { canToggle, cellState, isDone, todaySummary, type CompletionIndex } from "@/lib/analytics/engine";
import { formatDate, weekdayName } from "@/lib/dates/civil";
import type { Objective } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TodayPanel({ objectives, index, onToggle, lastTickAt }: { objectives: Objective[]; index: CompletionIndex; onToggle: (id: string, c: boolean) => void; lastTickAt?: number }) {
  const { today, dateFloor } = useApp();
  const s = todaySummary(objectives, index, today);
  const celebrating = useAllDoneCelebration(s.allDone, lastTickAt);

  return (
    <Card className={cn("transition-shadow duration-700", celebrating && "shadow-[0_0_0_4px_var(--accent-soft)]")}>
      <CardHeader>
        <div>
          <CardTitle>Today</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted">
            {weekdayName(today)}, {formatDate(today)}
          </p>
        </div>
        {s.total > 0 && (
          <span className={cn("tabular rounded-full px-2.5 py-1 text-xs font-medium", s.allDone ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")}>
            {s.allDone ? (
              <span className="flex items-center gap-1">
                <Sparkles className="size-3" /> All done
              </span>
            ) : (
              `${s.done} of ${s.total}`
            )}
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-3">
        {s.total === 0 ? (
          <div className="rounded-[var(--radius-control)] bg-surface-2/60 px-4 py-6 text-center">
            <p className="text-sm text-muted">Nothing to tick today.</p>
            <Button asChild variant="primary" size="sm" className="mt-3">
              <Link href="/habits">
                <Plus /> Add an objective
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <Progress value={s.done / s.total} className="mb-3" label="Today's progress" />
            <ul className="-mx-2">
              {s.trackable.map((o) => {
                const done = isDone(index, o.id, today);
                return (
                  <li key={o.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-2 py-2 transition-colors hover:bg-surface-2/60">
                      <ObjectiveIcon icon={o.icon} className="size-8 text-[15px]" />
                      <span className={cn("min-w-0 flex-1 truncate text-sm transition-colors", done && "text-muted line-through decoration-faint")}>{o.title}</span>
                      <CheckButton
                        size="md"
                        state={cellState(o, today, done, today)}
                        interactive={canToggle(o, today, today, dateFloor)}
                        onToggle={() => onToggle(o.id, !done)}
                        label={`${o.title}, today, ${done ? "completed" : "not completed"}`}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
