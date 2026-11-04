"use client";
import * as server from "@/lib/actions";
import type { AppActions } from "@/lib/app-actions";

async function refreshTimezone() {
  try {
    const res = await fetch("/api/timezone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, error: json.error ?? "Couldn't update your timezone." };
    return { ok: true as const, data: { timezone: json.timezone as string } };
  } catch {
    return { ok: false as const, error: "You seem to be offline." };
  }
}

export const liveActions: AppActions = {
  setTodayCompletion: server.setTodayCompletion,
  createObjective: server.createObjective,
  updateObjective: server.updateObjective,
  setObjectiveStatus: server.setObjectiveStatus,
  deleteObjective: server.deleteObjective,
  carryForward: server.carryForward,
  updateDisplayName: server.updateDisplayName,
  updateThemePreference: server.updateThemePreference,
  signOut: server.signOut,
  deleteAccount: server.deleteAccount,
  refreshTimezone,
};
