"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/app/app-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { monthKey, monthName, parseMonthKey, parts, shiftMonth } from "@/lib/dates/civil";
import type { Objective } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CATEGORIES, SUGGESTED_ICONS } from "@/lib/validation";

type Props = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  objective?: Objective; // edit mode when present
  defaultMonth?: { year: number; month: number };
};

export function ObjectiveFormDialog({ trigger, objective, defaultMonth, open: controlled, onOpenChange }: Props) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlled ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        title={objective ? "Edit objective" : "New objective"}
        description={objective ? "Month and start date stay fixed. Use “Carry forward” to repeat it in another month." : "Something you'll check off once a day this month."}
      >
        {open && <ObjectiveForm objective={objective} defaultMonth={defaultMonth} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ObjectiveForm({ objective, defaultMonth, onDone }: { objective?: Objective; defaultMonth?: { year: number; month: number }; onDone: () => void }) {
  const { actions, today } = useApp();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(objective?.title ?? "");
  const [description, setDescription] = useState(objective?.description ?? "");
  const [icon, setIcon] = useState(objective?.icon ?? "");
  const presetCategory = objective?.category && !(CATEGORIES as readonly string[]).includes(objective.category);
  const [category, setCategory] = useState(objective?.category ? (presetCategory ? "__custom" : objective.category) : "");
  const [customCategory, setCustomCategory] = useState(presetCategory ? objective!.category! : "");

  const t = parts(today);
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(t.year, t.month, i));
  const initialMonth =
    defaultMonth && monthKey(defaultMonth.year, defaultMonth.month) >= monthKey(t.year, t.month) ? defaultMonth : { year: t.year, month: t.month };
  const [month, setMonth] = useState(monthKey(initialMonth.year, initialMonth.month));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fields = {
      title,
      description: description || null,
      icon: icon || null,
      category: category === "__custom" ? customCategory || null : category || null,
    };
    start(async () => {
      const res = objective
        ? await actions.updateObjective(objective.id, fields)
        : await actions.createObjective({ ...fields, ...parseMonthKey(month)! });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(objective ? "Objective updated" : "Objective added");
      router.refresh();
      onDone();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="title">Objective</Label>
        <Input id="title" autoFocus required maxLength={120} placeholder="e.g. Read 20 pages" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <Label>Icon</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {SUGGESTED_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(icon === emoji ? "" : emoji)}
              aria-pressed={icon === emoji}
              aria-label={`Icon ${emoji}`}
              className={cn(
                "grid size-9 place-items-center rounded-[8px] border text-lg transition-colors",
                icon === emoji ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2",
              )}
            >
              {emoji}
            </button>
          ))}
          <Input aria-label="Custom emoji" className="h-9 w-16 text-center text-lg" maxLength={8} placeholder="✦" value={(SUGGESTED_ICONS as readonly string[]).includes(icon) ? "" : icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">None</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__custom">Custom…</option>
          </Select>
          {category === "__custom" && (
            <Input className="mt-2" aria-label="Custom category" maxLength={40} placeholder="Category name" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
          )}
        </div>
        <div>
          <Label htmlFor="month">Month</Label>
          {objective ? (
            <Input id="month" disabled value={`${monthName(objective.month)} ${objective.year}`} />
          ) : (
            <Select id="month" value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={monthKey(m.year, m.month)} value={monthKey(m.year, m.month)}>
                  {monthName(m.month)} {m.year}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">
          Notes <span className="font-normal text-muted">(optional)</span>
        </Label>
        <Textarea id="description" maxLength={1000} rows={3} placeholder="Why it matters, or what counts as done" value={description} onChange={(e) => setDescription(e.target.value)} />
        {!objective && <FieldHint>Created mid-month? Tracking starts today, so earlier days never count as missed.</FieldHint>}
      </div>

      {error && (
        <p role="alert" className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending || !title.trim()}>
          {pending ? "Saving…" : objective ? "Save changes" : "Add objective"}
        </Button>
      </DialogFooter>
    </form>
  );
}
