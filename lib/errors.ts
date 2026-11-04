/** Turns database rule violations into messages a person can act on. */
type DbError = { message?: string; hint?: string | null; code?: string | null } | null | undefined;

const BY_HINT: Record<string, string> = {
  NOT_TODAY: "Only today can be ticked. Past days are read-only.",
  BEFORE_DATE_FLOOR: "Today already ended in your previous timezone, so it can't be ticked again.",
  ARCHIVED: "This objective is archived. Restore it to keep tracking.",
  OUTSIDE_OBJECTIVE_MONTH: "This objective isn't trackable today.",
  PAST_MONTH: "Objectives can only be created for this month or a future one.",
  IMMUTABLE_FIELD: "That field can't be changed. Use “Carry forward” to copy an objective to another month.",
  TZ_RATE_LIMITED: "Your timezone was changed in the last 24 hours. Try again later.",
};

export function friendlyError(error: DbError, fallback = "Something went wrong. Please try again."): { error: string; code?: string } {
  if (!error) return { error: fallback };
  const hint = error.hint ?? undefined;
  if (hint && BY_HINT[hint]) return { error: BY_HINT[hint], code: hint };
  if (error.code === "P0002") return { error: "That objective no longer exists.", code: "NOT_FOUND" };
  if (error.code === "23505") return { error: "That entry already exists.", code: "DUPLICATE" };
  if (error.code === "23514") return { error: "Some of the values aren't allowed. Check the form and try again.", code: "CHECK" };
  if (error.code === "42501") return { error: "You don't have permission to do that.", code: "FORBIDDEN" };
  return { error: fallback };
}
