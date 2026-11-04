import { parseMonthKey, parts, parseYear } from "@/lib/dates/civil";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** ?month=YYYY-MM, defaulting to the user's current month. */
export function monthFromParams(sp: SP, today: string) {
  return parseMonthKey(first(sp.month)) ?? { year: parts(today).year, month: parts(today).month };
}

/** ?year=YYYY, defaulting to the user's current year. */
export function yearFromParams(sp: SP, today: string) {
  return parseYear(first(sp.year)) ?? parts(today).year;
}
