import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CivilDate } from "@/lib/dates/civil";
import type { Entry, Objective, Profile, TodayInfo } from "@/lib/types";

/**
 * Data access layer. Every read goes through here, re-checks the session with
 * getClaims() (never getSession()), and relies on RLS as the final guard.
 */

export const getUserId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) redirect("/login");
  return sub;
});

export const getProfile = cache(async (): Promise<Profile> => {
  const userId = await getUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, timezone, timezone_source, timezone_updated_at, date_floor, theme_preference, created_at")
    .eq("id", userId)
    .single();
  if (error || !data) throw new Error("Could not load your profile. Has the database migration been run?");
  return data as Profile;
});

/** Today's date as the DATABASE sees it, in the user's stored timezone. */
export const getToday = cache(async (): Promise<TodayInfo> => {
  await getUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_today");
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) throw new Error("Could not determine today's date.");
  return row as TodayInfo;
});

const OBJECTIVE_COLUMNS = "id, title, description, category, icon, month, year, status, start_date, archived_on, created_at";

export async function getObjectives(filter: { year?: number; month?: number } = {}): Promise<Objective[]> {
  await getUserId();
  const supabase = await createClient();
  let q = supabase.from("objectives").select(OBJECTIVE_COLUMNS);
  if (filter.year) q = q.eq("year", filter.year);
  if (filter.month) q = q.eq("month", filter.month);
  const { data, error } = await q.order("year").order("month").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Objective[];
}

/** Completed entries, paginated past Supabase's 1,000-row response limit. */
export async function getEntries(range: { from?: CivilDate; to?: CivilDate } = {}): Promise<Entry[]> {
  await getUserId();
  const supabase = await createClient();
  const page = 1000;
  const out: Entry[] = [];
  for (let offset = 0; ; offset += page) {
    let q = supabase.from("habit_entries").select("objective_id, completion_date, completed").eq("completed", true);
    if (range.from) q = q.gte("completion_date", range.from);
    if (range.to) q = q.lte("completion_date", range.to);
    const { data, error } = await q.order("completion_date").order("objective_id").range(offset, offset + page - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Entry[]));
    if (!data || data.length < page) break;
  }
  return out;
}
