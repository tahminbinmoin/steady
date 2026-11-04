import type { CivilDate } from "@/lib/dates/civil";
import type { ActionResult, Objective, ThemePreference } from "@/lib/types";
import type { ObjectiveCreate, ObjectiveFields } from "@/lib/validation";

/** Everything the UI can ask the backend to do. Live and demo modes implement it. */
export type AppActions = {
  setTodayCompletion: (
    objectiveId: string,
    completed: boolean,
  ) => Promise<ActionResult<{ objective_id: string; completion_date: CivilDate; completed: boolean }>>;
  createObjective: (input: ObjectiveCreate) => Promise<ActionResult<Objective>>;
  updateObjective: (id: string, input: ObjectiveFields) => Promise<ActionResult<Objective>>;
  setObjectiveStatus: (id: string, status: "active" | "archived") => Promise<ActionResult>;
  deleteObjective: (id: string) => Promise<ActionResult>;
  carryForward: (ids: string[], target: { year: number; month: number }) => Promise<ActionResult<{ created: number }>>;
  updateDisplayName: (name: string) => Promise<ActionResult>;
  updateThemePreference: (theme: ThemePreference) => Promise<ActionResult>;
  refreshTimezone: () => Promise<ActionResult<{ timezone: string }>>;
  signOut: () => Promise<void>;
  deleteAccount: (confirmation: string) => Promise<ActionResult>;
};
