"use client";
import { toast } from "sonner";
import type { AppActions } from "@/lib/app-actions";
import type { CivilDate } from "@/lib/dates/civil";

const notSaved = async () => {
  toast("Demo mode", { description: "Changes aren't saved in the preview." });
  return { ok: false as const, error: "Demo mode: changes aren't saved." };
};

export function demoActions(today: CivilDate): AppActions {
  return {
    setTodayCompletion: async (objective_id, completed) => ({ ok: true, data: { objective_id, completion_date: today, completed } }),
    createObjective: notSaved,
    updateObjective: notSaved,
    setObjectiveStatus: notSaved,
    deleteObjective: notSaved,
    carryForward: notSaved,
    updateDisplayName: notSaved,
    updateThemePreference: async () => ({ ok: true }),
    refreshTimezone: async () => ({ ok: true, data: { timezone: "Asia/Dhaka" } }),
    signOut: async () => void toast("Demo mode", { description: "Sign-out is disabled in the preview." }),
    deleteAccount: notSaved,
  };
}
