"use client";
import { Check } from "lucide-react";
import { memo } from "react";
import type { CellState } from "@/lib/analytics/engine";
import { cn } from "@/lib/utils";

type Props = {
  state: CellState;
  interactive: boolean;
  onToggle?: () => void;
  label: string;
  size?: "sm" | "md" | "lg";
};

const SIZES = { sm: "size-6 rounded-[6px]", md: "size-8 rounded-[8px]", lg: "size-10 rounded-[10px]" };
const ICON = { sm: "size-3", md: "size-4", lg: "size-5" };

/**
 * One day for one objective. Only today's cell is a real button; past days
 * are read-only and future days are disabled, matching the database rules.
 */
export const CheckButton = memo(function CheckButton({ state, interactive, onToggle, label, size = "sm" }: Props) {
  const done = state === "done";
  const base = cn("relative grid shrink-0 place-items-center transition-[background-color,border-color,color,transform] duration-150", SIZES[size]);

  const face = (
    <>
      {done && <Check key="on" className={cn(ICON[size], "animate-pop")} strokeWidth={3} />}
      {state === "missed" && <span className="h-0.5 w-2 rounded-full bg-faint/60" />}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={label}
        onClick={onToggle}
        className={cn(
          base,
          "cursor-pointer active:scale-90",
          done
            ? "bg-accent text-accent-fg hover:bg-accent-hover"
            : "border-2 border-accent bg-accent-soft/40 text-accent hover:bg-accent-soft",
        )}
      >
        {face}
      </button>
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        base,
        done && "bg-accent/85 text-accent-fg",
        state === "missed" && "bg-surface-2",
        state === "future" && "border border-dashed border-border",
        state === "open" && "border-2 border-border",
        state === "inactive" && "",
      )}
    >
      {face}
    </span>
  );
});

export function stateLabel(state: CellState): string {
  switch (state) {
    case "done":
      return "completed";
    case "missed":
      return "missed";
    case "open":
      return "today, not yet completed";
    case "future":
      return "upcoming";
    default:
      return "not tracked";
  }
}
