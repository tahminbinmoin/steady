"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { buildIndex } from "@/lib/analytics/engine";
import type { CivilDate } from "@/lib/dates/civil";
import type { Entry } from "@/lib/types";
import { useApp } from "./app-context";

function applyToday(entries: Entry[], objectiveId: string, today: CivilDate, completed: boolean): Entry[] {
  const rest = entries.filter((e) => !(e.objective_id === objectiveId && e.completion_date === today));
  return completed ? [...rest, { objective_id: objectiveId, completion_date: today, completed: true }] : rest;
}

/**
 * Holds the visible check-ins and applies ticks optimistically.
 * Ticks for the same objective are sent one after another, so the last
 * click always wins. A refused tick is rolled back with a toast.
 */
export function useTracker(initialEntries: Entry[]) {
  const { actions, today } = useApp();
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [source, setSource] = useState(initialEntries);
  if (source !== initialEntries) {
    // Fresh server data arrived (navigation or refresh): adopt it.
    setSource(initialEntries);
    setEntries(initialEntries);
  }

  const queues = useRef(new Map<string, Promise<void>>());
  const [lastTick, setLastTick] = useState<{ objectiveId: string; completed: boolean; at: number } | null>(null);

  const toggle = useCallback(
    (objectiveId: string, completed: boolean) => {
      setEntries((prev) => applyToday(prev, objectiveId, today, completed));
      setLastTick({ objectiveId, completed, at: Date.now() });
      const run = async () => {
        const res = await actions.setTodayCompletion(objectiveId, completed);
        if (!res.ok) {
          setEntries((prev) => applyToday(prev, objectiveId, today, !completed));
          toast.error(res.error);
          return;
        }
        if (res.data && res.data.completion_date !== today) {
          toast("A new day has started", { description: "Your calendar has moved to today." });
          router.refresh();
        }
      };
      const prev = queues.current.get(objectiveId) ?? Promise.resolve();
      queues.current.set(objectiveId, prev.then(run, run));
    },
    [actions, router, today],
  );

  const index = useMemo(() => buildIndex(entries), [entries]);
  return { entries, index, toggle, lastTick };
}
