"use client";
import { Archive, ArchiveRestore, CopyPlus, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/app/app-context";
import { ObjectiveIcon } from "@/components/common/objective-icon";
import { CheckButton, stateLabel } from "@/components/tracker/check-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { canToggle, cellState, computeDays, formatRate, isDone, objectiveWindow, tallyAll, type CompletionIndex } from "@/lib/analytics/engine";
import { addDays, formatDate, minDate, weekdayInitial } from "@/lib/dates/civil";
import type { Objective } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CarryForwardDialog } from "./carry-forward-dialog";
import { DeleteObjectiveDialog } from "./delete-dialog";
import { ObjectiveFormDialog } from "./objective-form-dialog";

export function ObjectiveCard({ objective: o, index, onToggle }: { objective: Objective; index: CompletionIndex; onToggle: (id: string, completed: boolean) => void }) {
  const { today, dateFloor, actions } = useApp();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [carrying, setCarrying] = useState(false);
  const [editing, setEditing] = useState(false);

  const w = objectiveWindow(o);
  const doneToday = isDone(index, o.id, today);
  const interactive = canToggle(o, today, today, dateFloor);
  const tally = tallyAll(computeDays([o], index, today));
  const checkIns = index.get(o.id)?.size ?? 0;
  const started = today >= w.from;

  // Last 7 days of this objective's month, ending today (or month end).
  const end = minDate(today, w.to);
  const strip = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6)).filter((d) => d >= w.from);

  const restore = async () => {
    const res = await actions.setObjectiveStatus(o.id, o.status === "active" ? "archived" : "active");
    if (!res.ok) return void toast.error(res.error);
    toast.success(o.status === "active" ? "Objective archived" : "Objective restored");
    router.refresh();
  };

  return (
    <Card className={cn("group flex items-center gap-3 p-3.5 transition-colors sm:gap-4 sm:p-4", o.status === "archived" && "opacity-70")}>
      <ObjectiveIcon icon={o.icon} className="hidden sm:grid" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-medium">{o.title}</h3>
          {o.category && <span className="hidden shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted sm:inline">{o.category}</span>}
          {o.status === "archived" && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">Archived</span>}
        </div>
        {o.description && <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{o.description}</p>}
        <div className="mt-2.5 flex items-center gap-4">
          {started ? (
            <>
              <div className="flex gap-1" aria-label="Last 7 days">
                {strip.map((d) => {
                  const s = cellState(o, d, isDone(index, o.id, d), today);
                  return (
                    <span key={d} className="flex flex-col items-center gap-0.5" title={`${formatDate(d)}: ${stateLabel(s)}`}>
                      <span
                        className={cn(
                          "size-2.5 rounded-[3px]",
                          s === "done" ? "bg-accent" : s === "missed" ? "bg-heat-0" : s === "open" ? "border border-accent" : "bg-transparent",
                        )}
                      />
                      <span className={cn("text-[9px] leading-none", d === today ? "font-semibold text-text" : "text-faint")}>{weekdayInitial(d)}</span>
                    </span>
                  );
                })}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Progress value={tally.rate} className="max-w-28" label="Completion this month" />
                <span className="tabular shrink-0 text-xs text-muted">
                  {formatRate(tally.rate)} · {tally.completed}/{tally.eligible}
                </span>
              </div>
            </>
          ) : (
            <span className="text-xs text-muted">Tracking starts {formatDate(w.from)}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {today >= w.from && today <= w.to && (
          <CheckButton
            size="lg"
            state={cellState(o, today, doneToday, today)}
            interactive={interactive}
            onToggle={() => onToggle(o.id, !doneToday)}
            label={`${o.title}, today, ${doneToday ? "completed" : "not completed"}`}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Options for ${o.title}`}>
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setCarrying(true)}>
              <CopyPlus /> Carry forward
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={restore}>
              {o.status === "active" ? (
                <>
                  <Archive /> Archive
                </>
              ) : (
                <>
                  <ArchiveRestore /> Restore
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setDeleting(true)}>
              <Trash2 /> Delete…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ObjectiveFormDialog objective={o} open={editing} onOpenChange={setEditing} />
      <DeleteObjectiveDialog objective={o} checkIns={checkIns} open={deleting} onOpenChange={setDeleting} />
      {carrying && <CarryForwardDialog objectives={[o]} open={carrying} onOpenChange={setCarrying} />}
    </Card>
  );
}
