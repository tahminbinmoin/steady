import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-8 grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-[var(--radius-card)] lg:col-span-2" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--radius-card)]" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-6 h-64 rounded-[var(--radius-card)]" />
    </div>
  );
}
