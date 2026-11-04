"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useMemo, type ReactNode } from "react";
import type { AppActions } from "@/lib/app-actions";
import { type CivilDate, localDateIn } from "@/lib/dates/civil";
import { liveActions } from "./live-actions";

export type AppUser = { name: string | null; email: string | null; avatarUrl: string | null };

export type AppContextValue = {
  mode: "live" | "demo";
  today: CivilDate;
  timezone: string;
  timezoneSource: "default" | "ip" | "browser";
  timezoneUpdatedAt: string | null;
  dateFloor: CivilDate | null;
  user: AppUser;
  actions: AppActions;
  /** "" normally; "/preview" in demo mode so navigation stays inside the demo. */
  linkBase?: string;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  value,
  demoActions,
  children,
}: {
  value: Omit<AppContextValue, "actions">;
  demoActions?: AppActions;
  children: ReactNode;
}) {
  const router = useRouter();
  const ctx = useMemo(() => ({ ...value, actions: demoActions ?? liveActions }), [value, demoActions]);

  // When midnight passes in the user's timezone while the tab is open, reload
  // so the calendar moves to the new day. (Display only: the server decides.)
  useEffect(() => {
    if (value.mode !== "live") return;
    const check = () => {
      if (document.visibilityState === "visible" && localDateIn(value.timezone) !== value.today) router.refresh();
    };
    const id = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [router, value.mode, value.timezone, value.today]);

  return <AppContext value={ctx}>{children}</AppContext>;
}

export function useApp(): AppContextValue {
  const ctx = use(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
