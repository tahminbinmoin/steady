import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ipTimezone } from "@/lib/timezone-server";

/** Only allow same-site relative paths as the post-login destination. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  return value;
}

const EMAIL_TYPES: EmailOtpType[] = ["magiclink", "signup", "email", "invite", "recovery", "email_change"];

/**
 * Finishes every sign-in: OAuth (Google/Apple) and email links both arrive
 * here with a one-time code, which is swapped for a session cookie.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const fail = (message: string) => {
    const to = new URL("/login", url.origin);
    to.searchParams.set("error", message);
    return NextResponse.redirect(to);
  };

  if (providerError) return fail(providerError);

  const supabase = await createClient();
  let userId: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user)
      return fail("That sign-in link has expired or was opened in a different browser. Request a new one and open it on this device.");
    userId = data.user.id;
  } else if (tokenHash && type && EMAIL_TYPES.includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error || !data.user) return fail("That sign-in link has expired. Request a new one.");
    userId = data.user.id;
  } else {
    return fail("Sign-in was cancelled.");
  }

  // First sign-in: set the timezone from the IP header if Vercel provided one.
  // (Without the header, the app falls back to the browser timezone on load.)
  const tz = ipTimezone(request.headers);
  if (tz && userId) {
    const { data: profile } = await supabase.from("profiles").select("timezone_source").eq("id", userId).single();
    if (profile?.timezone_source === "default") {
      await supabase.rpc("set_my_timezone", { p_timezone: tz, p_source: "ip" });
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const base = process.env.NODE_ENV === "development" || !forwardedHost ? url.origin : `https://${forwardedHost}`;
  return NextResponse.redirect(new URL(next, base));
}
