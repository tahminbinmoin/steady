import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, hint, icon: Icon, accent, className }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; accent?: boolean; className?: string }) {
  return (
    <Card className={cn("flex min-w-0 flex-col justify-between gap-3 p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] text-muted">{label}</span>
        {Icon && <Icon className={cn("size-4 shrink-0", accent ? "text-accent" : "text-faint")} />}
      </div>
      <div>
        <div className="tabular truncate text-[26px] font-semibold leading-none tracking-tight">{value}</div>
        {hint && <div className="mt-1.5 truncate text-xs text-muted">{hint}</div>}
      </div>
    </Card>
  );
}
