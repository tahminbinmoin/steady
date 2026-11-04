import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function ObjectiveIcon({ icon, className }: { icon: string | null; className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-[9px] bg-surface-2 text-[17px] leading-none", className)} aria-hidden>
      {icon ? icon : <Target className="size-4 text-muted" />}
    </span>
  );
}
