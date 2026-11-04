"use client";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * "Sign in with Google" using Google's own button (Google Identity Services).
 *
 * Google's account picker then names THIS website rather than the Supabase
 * project address, because the sign-in happens here: Google hands the page an
 * ID token, which Supabase verifies with signInWithIdToken(). A random nonce
 * (hashed for Google, raw for Supabase) stops a token from being replayed.
 *
 * If NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't set, or Google's script can't load,
 * it falls back to the redirect-based Supabase OAuth flow.
 */

type CredentialResponse = { credential: string };
type GoogleId = {
  initialize: (o: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  cancel: () => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("Google sign-in couldn't load")));
    if (!existing) {
      s.src = SCRIPT_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

async function makeNonce(): Promise<[raw: string, hashed: string]> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return [raw, hashed];
}

export function GoogleSignInButton({ next, onError, disabled }: { next: string; onError: (message: string) => void; disabled?: boolean }) {
  const holder = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mode, setMode] = useState<"loading" | "google" | "fallback">(CLIENT_ID ? "loading" : "fallback");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    (async () => {
      try {
        await Promise.race([
          loadScript(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
        ]);
        const [raw, hashed] = await makeNonce();
        if (cancelled || !holder.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          nonce: hashed,
          use_fedcm_for_prompt: true,
          ux_mode: "popup",
          callback: async (response: CredentialResponse) => {
            setBusy(true);
            const { error } = await createClient().auth.signInWithIdToken({ provider: "google", token: response.credential, nonce: raw });
            if (error) {
              setBusy(false);
              onError("Google sign-in didn't complete. Please try again.");
              return;
            }
            window.location.assign(next);
          },
        });
        const width = Math.min(400, Math.max(200, Math.floor(holder.current.getBoundingClientRect().width)));
        holder.current.replaceChildren();
        window.google.accounts.id.renderButton(holder.current, {
          type: "standard",
          theme: resolvedTheme === "dark" ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "center",
          width,
        });
        setMode("google");
      } catch {
        if (!cancelled) setMode("fallback");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [next, onError, resolvedTheme]);

  const redirectFallback = async () => {
    setBusy(true);
    const url = new URL("/auth/callback", window.location.origin);
    if (next !== "/dashboard") url.searchParams.set("next", next);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: url.toString(), queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setBusy(false);
      onError(error.message);
    }
  };

  if (mode === "fallback") {
    return (
      <Button size="lg" className="w-full" disabled={disabled || busy} onClick={redirectFallback}>
        {busy ? "Redirecting…" : "Continue with Google"}
      </Button>
    );
  }

  return (
    <div className="relative min-h-11">
      <div ref={holder} className={busy ? "pointer-events-none opacity-50" : undefined} aria-busy={mode === "loading" || busy} />
      {mode === "loading" && <div className="absolute inset-0 animate-pulse rounded-[var(--radius-control)] bg-surface-2" />}
      {busy && <p className="mt-2 text-center text-sm text-muted">Signing you in…</p>}
    </div>
  );
}
