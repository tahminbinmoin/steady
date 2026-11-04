"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useApp } from "@/components/app/app-context";
import { Button } from "@/components/ui/button";
import { monthKey, monthName, parts, shiftMonth } from "@/lib/dates/civil";

function useHref() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (key: string, value: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (value === null) p.delete(key);
    else p.set(key, value);
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
}

export function MonthNav({ year, month }: { year: number; month: number }) {
  const { today } = useApp();
  const href = useHref();
  const t = parts(today);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const isCurrent = t.year === year && t.month === month;
  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="icon-sm" aria-label="Previous month">
        <Link href={href("month", monthKey(prev.year, prev.month))} scroll={false}>
          <ChevronLeft />
        </Link>
      </Button>
      <span className="tabular min-w-36 text-center text-sm font-medium" aria-live="polite">
        {monthName(month)} {year}
      </span>
      <Button asChild variant="ghost" size="icon-sm" aria-label="Next month">
        <Link href={href("month", monthKey(next.year, next.month))} scroll={false}>
          <ChevronRight />
        </Link>
      </Button>
      {!isCurrent && (
        <Button asChild size="sm" className="ml-1">
          <Link href={href("month", null)} scroll={false}>
            Today
          </Link>
        </Button>
      )}
    </div>
  );
}

export function YearNav({ year }: { year: number }) {
  const { today } = useApp();
  const href = useHref();
  const current = parts(today).year;
  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="icon-sm" aria-label="Previous year">
        <Link href={href("year", String(year - 1))} scroll={false}>
          <ChevronLeft />
        </Link>
      </Button>
      <span className="tabular min-w-14 text-center text-sm font-medium">{year}</span>
      <Button asChild variant="ghost" size="icon-sm" aria-label="Next year">
        <Link href={href("year", String(year + 1))} scroll={false}>
          <ChevronRight />
        </Link>
      </Button>
      {year !== current && (
        <Button asChild size="sm" className="ml-1">
          <Link href={href("year", null)} scroll={false}>
            This year
          </Link>
        </Button>
      )}
    </div>
  );
}
