"use client";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/app/app-context";
import { ObjectiveIcon } from "@/components/common/objective-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/input";
import { monthKey, monthName, parseMonthKey, parts, shiftMonth } from "@/lib/dates/civil";
import type { Objective } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CarryForwardDialog({
  objectives,
  open,
  onOpenChange,
  defaultTarget,
}: {
  objectives: Objective[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultTarget?: { year: number; month: number };
}) {
  const { actions, today } = useApp();
  const router = useRouter();
  const [pending, start] = useTransition();
  const t = parts(today);
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(t.year, t.month, i));
  const fallback = shiftMonth(t.year, t.month, objectives.some((o) => o.year === t.year && o.month === t.month) ? 1 : 0);
  const target0 = defaultTarget && monthKey(defaultTarget.year, defaultTarget.month) >= monthKey(t.year, t.month) ? defaultTarget : fallback;
  const [target, setTarget] = useState(monthKey(target0.year, target0.month));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(objectives.map((o) => o.id)));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submit = () =>
    start(async () => {
      const res = await actions.carryForward([...selected], parseMonthKey(target)!);
      if (!res.ok) return void toast.error(res.error);
      const { year, month } = parseMonthKey(target)!;
      toast.success(
        res.data.created === 0 ? `Already in ${monthName(month)}` : `Added ${res.data.created} objective${res.data.created === 1 ? "" : "s"} to ${monthName(month)} ${year}`,
      );
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Carry forward" description="Creates fresh copies in another month. History stays with the originals.">
        <div className="space-y-4">
          <div>
            <Label htmlFor="cf-month">Copy to</Label>
            <Select id="cf-month" value={target} onChange={(e) => setTarget(e.target.value)}>
              {months.map((m) => (
                <option key={monthKey(m.year, m.month)} value={monthKey(m.year, m.month)}>
                  {monthName(m.month)} {m.year}
                </option>
              ))}
            </Select>
          </div>
          {objectives.length > 1 && (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {objectives.map((o) => {
                const on = selected.has(o.id);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(o.id)}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                    >
                      <span className={cn("grid size-5 place-items-center rounded-[5px] border", on ? "border-accent bg-accent text-accent-fg" : "border-border-strong")}>
                        {on && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <ObjectiveIcon icon={o.icon} className="size-7 text-sm" />
                      <span className="truncate">{o.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={pending || selected.size === 0} onClick={submit}>
            {pending ? "Copying…" : `Copy ${selected.size} objective${selected.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
