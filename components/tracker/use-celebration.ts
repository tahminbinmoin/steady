"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Fires once when the last of today's objectives is ticked. */
export function useAllDoneCelebration(allDone: boolean, lastTickAt: number | undefined) {
  const [celebrating, setCelebrating] = useState(false);
  const prev = useRef(allDone);
  useEffect(() => {
    if (allDone && !prev.current && lastTickAt) {
      setCelebrating(true);
      toast.success("Everything done for today", { description: "That's how consistency is built." });
      const t = window.setTimeout(() => setCelebrating(false), 1600);
      prev.current = allDone;
      return () => window.clearTimeout(t);
    }
    prev.current = allDone;
  }, [allDone, lastTickAt]);
  return celebrating;
}
