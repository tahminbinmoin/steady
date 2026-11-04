"use client";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "./google-button";
import { ThemeToggleStandalone } from "./theme-toggle-standalone";

type Provider = "google" | "apple";

/**
 * Which sign-in methods to show. Email works out of the box with Supabase.
 * After configuring Google/Apple in Supabase, set e.g.
 * NEXT_PUBLIC_AUTH_PROVIDERS="google,apple,email" in .env and redeploy.
 */
const PROVIDERS = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "email").split(",").map((p) => p.trim());

const PREVIEW_DAYS = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1];

function callbackUrl(next?: string) {
  const url = new URL("/auth/callback", window.location.origin);
  if (next && next.startsWith("/") && !next.startsWith("//")) url.searchParams.set("next", next);
  return url.toString();
}

export function LoginCard({ error, next, deleted }: { error?: string; next?: string; deleted?: boolean }) {
  const [pending, setPending] = useState<Provider | "email" | null>(null);
  const [message, setMessage] = useState<string | null>(error ?? null);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const signInWith = async (provider: Provider) => {
    setPending(provider);
    setMessage(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl(next), ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}) },
    });
    if (error) {
      setMessage(error.message);
      setPending(null);
    }
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setMessage("Enter a valid email address.");
    setPending("email");
    setMessage(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: true },
    });
    setPending(null);
    if (error) {
      const code = (error as { code?: string }).code;
      setMessage(
        code === "over_email_send_rate_limit" || error.status === 429
          ? "Too many sign-in emails were sent recently. Wait a few minutes and try again."
          : code === "email_address_not_authorized"
            ? "This address can't receive sign-in emails yet. Use the email address of your Supabase account, or set up custom email in Supabase."
            : error.message,
      );
      return;
    }
    setSentTo(address);
  };

  return (
    <main className="relative grid min-h-dvh place-items-center px-5 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggleStandalone />
      </div>
      <div className="w-full max-w-[380px] animate-fade-in">
        <div className="mb-8 flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="text-lg font-semibold tracking-tight">Steady</span>
        </div>

        {sentTo ? (
          <div>
            <span className="mb-5 grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
              <Mail className="size-5" />
            </span>
            <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">Check your email</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              We sent a sign-in link to <span className="font-medium text-text">{sentTo}</span>. Open it on this device and you&apos;re in.
            </p>
            <p className="mt-3 text-sm text-muted">Not there after a minute? Check spam, or send it again.</p>
            <div className="mt-6 flex gap-2">
              <Button variant="ghost" onClick={() => setSentTo(null)}>
                <ArrowLeft /> Use another email
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">Build consistency, one day at a time.</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">Set a few objectives for the month. Tick them off each day. Watch the streak grow.</p>

            <div className="mt-7 flex gap-1" aria-hidden>
              {PREVIEW_DAYS.map((d, i) => (
                <span key={i} className={d ? "size-5 rounded-[5px] bg-accent" : "size-5 rounded-[5px] bg-heat-0"} style={{ opacity: d ? 0.45 + (i / PREVIEW_DAYS.length) * 0.55 : 1 }} />
              ))}
            </div>

            <div className="mt-8 grid gap-2.5">
              {PROVIDERS.includes("google") && <GoogleSignInButton next={safeNext} onError={setMessage} disabled={pending !== null} />}
              {PROVIDERS.includes("apple") && (
                <Button size="lg" className="w-full !border-transparent !bg-text !text-background hover:opacity-90" disabled={pending !== null} onClick={() => signInWith("apple")}>
                  {pending === "apple" ? "Redirecting…" : "Continue with Apple"}
                </Button>
              )}
              {PROVIDERS.includes("email") && (
                <form onSubmit={sendLink} className="grid gap-2.5" noValidate>
                  {(PROVIDERS.includes("google") || PROVIDERS.includes("apple")) && (
                    <div className="my-1 flex items-center gap-3 text-xs text-faint">
                      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="email" className="sr-only">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="h-11 text-[15px]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending !== null || !email.trim()}>
                    {pending === "email" ? "Sending…" : "Email me a sign-in link"}
                  </Button>
                </form>
              )}
            </div>
          </>
        )}

        {deleted && !message && <p className="mt-4 rounded-[var(--radius-control)] bg-surface-2 px-3 py-2 text-sm text-muted">Your account and all its data have been deleted.</p>}
        {message && (
          <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">
            {message}
          </p>
        )}
        {!sentTo && (
          <p className="mt-6 text-xs leading-relaxed text-faint">
            No password needed. The first sign-in creates your account, and your history stays private and syncs across your devices.{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-muted">
              Privacy policy
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
