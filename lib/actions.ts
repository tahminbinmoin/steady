"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { displayName, objectiveCreate, objectiveFields, themePreference, uuid, type ObjectiveCreate, type ObjectiveFields } from "@/lib/validation";
import type { CivilDate } from "@/lib/dates/civil";
import type { ActionResult, Objective, ThemePreference } from "@/lib/types";

/**
 * Server Actions. Each one re-checks the session itself (a Server Action is a
 * public HTTP endpoint), validates input with zod, and lets the database's
 * RLS and triggers have the final word.
 */

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
}

const refreshApp = () => revalidatePath("/", "layout");

const OBJECTIVE_COLUMNS = "id, title, description, category, icon, month, year, status, start_date, archived_on, created_at";

// --- Objectives --------------------------------------------------------------

export async function createObjective(input: ObjectiveCreate): Promise<ActionResult<Objective>> {
  const parsed = objectiveCreate.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid objective" };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("objectives").insert(parsed.data).select(OBJECTIVE_COLUMNS).single();
  if (error) return { ok: false, ...friendlyError(error) };
  refreshApp();
  return { ok: true, data: data as Objective };
}

export async function updateObjective(id: string, input: ObjectiveFields): Promise<ActionResult<Objective>> {
  const parsed = objectiveFields.safeParse(input);
  if (!uuid.safeParse(id).success || !parsed.success)
    return { ok: false, error: parsed.success ? "Invalid objective" : parsed.error.issues[0]?.message ?? "Invalid input" };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("objectives").update(parsed.data).eq("id", id).select(OBJECTIVE_COLUMNS).single();
  if (error) return { ok: false, ...friendlyError(error) };
  refreshApp();
  return { ok: true, data: data as Objective };
}

export async function setObjectiveStatus(id: string, status: "active" | "archived"): Promise<ActionResult> {
  if (!uuid.safeParse(id).success || !["active", "archived"].includes(status)) return { ok: false, error: "Invalid request" };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("objectives").update({ status }).eq("id", id);
  if (error) return { ok: false, ...friendlyError(error) };
  refreshApp();
  return { ok: true };
}

export async function deleteObjective(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid request" };
  const { supabase } = await requireUser();
  // RLS limits this to the caller's own row; the foreign key removes only
  // this objective's own entries.
  const { error, count } = await supabase.from("objectives").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, ...friendlyError(error) };
  if (!count) return { ok: false, error: "That objective no longer exists." };
  refreshApp();
  return { ok: true };
}

/** Copies objectives into another month as new, separate objectives. */
export async function carryForward(ids: string[], target: { year: number; month: number }): Promise<ActionResult<{ created: number }>> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || !ids.every((i) => uuid.safeParse(i).success))
    return { ok: false, error: "Choose at least one objective" };
  const t = objectiveCreate.pick({ year: true, month: true }).safeParse(target);
  if (!t.success) return { ok: false, error: "Invalid month" };
  const { supabase } = await requireUser();

  const { data: source, error: readErr } = await supabase.from("objectives").select("title, description, category, icon").in("id", ids);
  if (readErr) return { ok: false, ...friendlyError(readErr) };
  if (!source?.length) return { ok: false, error: "Those objectives no longer exist." };

  // Skip titles that already exist in the target month.
  const { data: existing } = await supabase.from("objectives").select("title").eq("year", t.data.year).eq("month", t.data.month);
  const taken = new Set((existing ?? []).map((r) => r.title.trim().toLowerCase()));
  const rows = source
    .filter((s) => !taken.has(s.title.trim().toLowerCase()))
    .map((s) => ({ ...s, year: t.data.year, month: t.data.month }));
  if (rows.length === 0) return { ok: true, data: { created: 0 } };

  const { error } = await supabase.from("objectives").insert(rows);
  if (error) return { ok: false, ...friendlyError(error) };
  refreshApp();
  return { ok: true, data: { created: rows.length } };
}

// --- Daily check-ins -----------------------------------------------------------

/**
 * Ticks or unticks TODAY for one objective. No date is sent: the database
 * works out today from its own clock and the user's stored timezone.
 */
export async function setTodayCompletion(
  objectiveId: string,
  completed: boolean,
): Promise<ActionResult<{ objective_id: string; completion_date: CivilDate; completed: boolean }>> {
  if (!uuid.safeParse(objectiveId).success || typeof completed !== "boolean") return { ok: false, error: "Invalid request" };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("set_today_completion", { p_objective_id: objectiveId, p_completed: completed });
  if (error) return { ok: false, ...friendlyError(error, "Couldn't save that tick. Please try again.") };
  const row = Array.isArray(data) ? data[0] : data;
  // No revalidation: the browser already shows the change and recomputes
  // statistics locally. Pages fetch fresh data on the next navigation.
  return { ok: true, data: row };
}

// --- Profile ---------------------------------------------------------------------

export async function updateDisplayName(name: string): Promise<ActionResult> {
  const parsed = displayName.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data }).eq("id", userId);
  if (error) return { ok: false, ...friendlyError(error) };
  refreshApp();
  return { ok: true };
}

export async function updateThemePreference(theme: ThemePreference): Promise<ActionResult> {
  const parsed = themePreference.safeParse(theme);
  if (!parsed.success) return { ok: false, error: "Invalid theme" };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("profiles").update({ theme_preference: parsed.data }).eq("id", userId);
  if (error) return { ok: false, ...friendlyError(error) };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  if (confirmation !== "DELETE") return { ok: false, error: "Type DELETE to confirm." };
  const { supabase } = await requireUser();
  // public.delete_my_account() deletes only the caller's own auth user, which
  // cascades to profiles → objectives → habit_entries.
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, error: "Couldn't delete the account. Please try again." };
  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
