"use client";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
      <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">{error.message || "We couldn't load this page."}</p>
      {error.digest && <p className="tabular mt-2 text-xs text-faint">Ref {error.digest}</p>}
      <Button onClick={reset} className="mt-6">
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}
