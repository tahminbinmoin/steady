import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const PUBLIC_PATHS = ["/login", "/auth", "/preview"];

/** Refreshes the Supabase session cookie and guards signed-in pages. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  // If Supabase sent a sign-in code to a page other than the callback (it
  // falls back to the Site URL when a redirect isn't allow-listed), finish
  // the sign-in properly instead of dropping the code.
  const authCode = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  if ((authCode || tokenHash) && path !== "/auth/callback") {
    const to = request.nextUrl.clone();
    to.pathname = "/auth/callback";
    return redirectWithCookies(to, response);
  }

  // API routes check the session themselves and answer 401 with JSON.
  if (path.startsWith("/api/")) return response;

  if (!signedIn && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return redirectWithCookies(to, response);
  }
  if (signedIn && (path === "/login" || path === "/")) {
    const to = request.nextUrl.clone();
    to.pathname = "/dashboard";
    to.search = "";
    return redirectWithCookies(to, response);
  }
  return response;
}

function redirectWithCookies(to: URL, from: NextResponse) {
  const res = NextResponse.redirect(to);
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}
