import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shell/logo";

export const metadata: Metadata = { title: "Privacy policy" };

const UPDATED = "4 November 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <Link href="/login" className="mb-10 flex items-center gap-2.5">
        <Logo className="size-7" />
        <span className="text-[15px] font-semibold tracking-tight">Steady</span>
      </Link>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-text/90">
        <p>
          Steady is a personal habit and goal tracker run by Tahmin Bin Moin. This page explains what information Steady keeps, why, and how you can remove it.
        </p>

        <section>
          <h2>What we collect</h2>
          <ul className="space-y-1">
            <li>Your name, email address and profile picture, from Google when you sign in with Google, or your email address when you sign in by email link.</li>
            <li>The objectives you create and the days you tick them off.</li>
            <li>Your timezone and your light/dark theme choice, so days start and end at the right time and the app looks the way you chose.</li>
          </ul>
          <p className="mt-2">We don&apos;t collect anything else, we don&apos;t use advertising or tracking cookies, and we never sell or share your information.</p>
        </section>

        <section>
          <h2>How it&apos;s used</h2>
          <p>Only to run the app: signing you in, saving your check-ins, and calculating your statistics. Your timezone is worked out from your approximate network location or your browser, and only the timezone name is stored.</p>
        </section>

        <section>
          <h2>Where it&apos;s stored</h2>
          <p>
            Data is stored with Supabase (database and sign-in) in its Singapore region, and the website is served by Vercel. Each account can only read its own data; this is enforced by the database itself.
          </p>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>Steady uses only the cookies needed to keep you signed in and to remember your theme.</p>
        </section>

        <section>
          <h2>Deleting your data</h2>
          <p>
            Go to <strong>Settings → Delete account</strong>. This permanently removes your profile, objectives and check-ins straight away. You can also stop using Google sign-in for Steady at any time from your Google Account&apos;s security settings.
          </p>
        </section>

        <section>
          <h2>Questions</h2>
          <p>Contact Tahmin Bin Moin, the developer of Steady, using the support email shown on Steady&apos;s Google sign-in screen.</p>
        </section>
      </div>
    </main>
  );
}
