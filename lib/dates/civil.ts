/**
 * Civil (calendar) dates as plain "YYYY-MM-DD" strings.
 *
 * A tracked day is a calendar date, not an instant, so we never put it in a
 * JS Date at local midnight (that is where DST and timezone bugs come from).
 * All arithmetic here runs in UTC on the date parts only.
 */
export type CivilDate = string; // "YYYY-MM-DD"

const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCivilDate(value: unknown): value is CivilDate {
  if (typeof value !== "string") return false;
  const m = RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

export function parts(date: CivilDate): { year: number; month: number; day: number } {
  const m = RE.exec(date);
  if (!m) throw new Error(`Invalid civil date: ${date}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function make(year: number, month: number, day: number): CivilDate {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toUtc(date: CivilDate): number {
  const { year, month, day } = parts(date);
  return Date.UTC(year, month - 1, day);
}

function fromUtc(ms: number): CivilDate {
  const d = new Date(ms);
  return make(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(date: CivilDate, n: number): CivilDate {
  return fromUtc(toUtc(date) + n * 86_400_000);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: CivilDate, b: CivilDate): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export function compare(a: CivilDate, b: CivilDate): number {
  return a < b ? -1 : a > b ? 1 : 0; // lexical order == chronological order
}

export const minDate = (a: CivilDate, b: CivilDate) => (a < b ? a : b);
export const maxDate = (a: CivilDate, b: CivilDate) => (a > b ? a : b);

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthStart(year: number, month: number): CivilDate {
  return make(year, month, 1);
}

export function monthEnd(year: number, month: number): CivilDate {
  return make(year, month, daysInMonth(year, month));
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: CivilDate): number {
  return new Date(toUtc(date)).getUTCDay();
}

/** Every date from `from` to `to`, inclusive. */
export function eachDay(from: CivilDate, to: CivilDate): CivilDate[] {
  const out: CivilDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** "2026-11" ⇄ {year, month} for URLs. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(key: string | undefined | null): { year: number; month: number } | null {
  if (!key) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

export function parseYear(value: string | undefined | null): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const y = Number(value);
  return y >= 2000 && y <= 2100 ? y : null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const monthName = (month: number) => MONTHS[month - 1];
export const monthShort = (month: number) => MONTHS[month - 1].slice(0, 3);
export const weekdayName = (date: CivilDate) => WEEKDAYS[weekday(date)];
export const weekdayShort = (date: CivilDate) => WEEKDAYS[weekday(date)].slice(0, 3);
export const weekdayInitial = (date: CivilDate) => WEEKDAYS[weekday(date)].slice(0, 1);

/** "4 November" / "4 Nov 2026" style labels. */
export function formatDate(date: CivilDate, opts: { year?: boolean; short?: boolean } = {}): string {
  const { year, month, day } = parts(date);
  const m = opts.short ? monthShort(month) : monthName(month);
  return opts.year ? `${day} ${m} ${year}` : `${day} ${m}`;
}

/**
 * Today's civil date in an IANA timezone, from the device clock.
 * DISPLAY ONLY (e.g. noticing that midnight has passed). The server and
 * database decide the real "today"; this is never sent as a date.
 */
export function localDateIn(timeZone: string, now: Date = new Date()): CivilDate {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(now); // en-CA formats as YYYY-MM-DD
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
