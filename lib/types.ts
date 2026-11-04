import type { CivilDate } from "@/lib/dates/civil";

export type ObjectiveStatus = "active" | "archived";

export type Objective = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  month: number;
  year: number;
  status: ObjectiveStatus;
  start_date: CivilDate;
  archived_on: CivilDate | null;
  created_at: string;
};

export type Entry = {
  objective_id: string;
  completion_date: CivilDate;
  completed: boolean;
};

export type ThemePreference = "light" | "dark" | "system";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  timezone: string;
  timezone_source: "default" | "ip" | "browser";
  timezone_updated_at: string | null;
  date_floor: CivilDate | null;
  theme_preference: ThemePreference;
  created_at: string;
};

export type TodayInfo = {
  today: CivilDate;
  timezone: string;
  date_floor: CivilDate | null;
};

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; code?: string };
