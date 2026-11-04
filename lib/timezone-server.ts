import "server-only";
import { isValidTimeZone } from "@/lib/dates/civil";

/**
 * The visitor's timezone from Vercel's edge network (X-Vercel-IP-Timezone).
 * Set by Vercel on every deployed request and not overridable by the browser.
 * Absent in local development.
 */
export function ipTimezone(headers: Headers): string | null {
  const raw = headers.get("x-vercel-ip-timezone");
  if (!raw) return null;
  let tz = raw;
  try {
    tz = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return isValidTimeZone(tz) ? tz : null;
}
