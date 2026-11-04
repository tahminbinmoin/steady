import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-border-strong px-6 py-12 text-center", className)}>
      <span className="mb-4 grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-5" />
      </span>
      <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
