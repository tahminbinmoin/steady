import { NextResponse, type NextRequest } from "next/server";
import { isValidTimeZone } from "@/lib/dates/civil";
import { createClient } from "@/lib/supabase/server";
import { ipTimezone } from "@/lib/timezone-server";

/**
 * Sets the signed-in user's timezone.
 * Source priority: Vercel's IP timezone header, then the browser's timezone
 * (only used when the header is absent, e.g. local development).
 * The database function public.set_my_timezone() validates the name, allows
 * one change per 24 hours after the first, and raises the date floor so a
 * switch can never reopen a day that has already ended.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { browserTimezone?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const fromIp = ipTimezone(request.headers);
  const fromBrowser = isValidTimeZone(body.browserTimezone) ? body.browserTimezone : null;
  const timezone = fromIp ?? fromBrowser;
  const source = fromIp ? "ip" : "browser";
  if (!timezone) return NextResponse.json({ error: "Couldn't detect a timezone" }, { status: 400 });

  const { data, error } = await supabase.rpc("set_my_timezone", { p_timezone: timezone, p_source: source });

  if (error) {
    if (error.hint === "TZ_RATE_LIMITED") {
      return NextResponse.json(
        { error: "Your timezone was changed in the last 24 hours. You can change it again tomorrow." },
        { status: 429 },
      );
    }
    if (error.code === "22023") return NextResponse.json({ error: "That timezone isn't recognised." }, { status: 400 });
    return NextResponse.json({ error: "Couldn't update your timezone." }, { status: 500 });
  }

  const profile = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ timezone: profile?.timezone ?? timezone, source });
}
