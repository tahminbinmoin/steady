# Steady — habit & monthly goal tracker

Set a few objectives for the month, tick each one off once a day, and watch your consistency in weekly, monthly and yearly analytics.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Radix UI (shadcn-style components) · Lucide · Supabase (Postgres, Auth, RLS) · Recharts · Vercel.

---

## Contents

1. [What's in the box](#whats-in-the-box)
2. [How the today-only rule is enforced](#how-the-today-only-rule-is-enforced)
3. [Deploy](#deploy) — Vercel, Supabase site address, sign in
4. [Optional: Google and Apple sign-in](#optional-google-and-apple-sign-in)
5. [Run it locally](#run-it-locally)
6. [Tests](#tests)
7. [Project structure](#project-structure)
8. [Statistics definitions](#statistics-definitions)
9. [Maintenance and troubleshooting](#maintenance-and-troubleshooting)

---

## What's in the box

| Page | What it does |
| --- | --- |
| **Dashboard** | Today's check-ins, streak, completion %, best month and week, this month week by week, 30-day trend |
| **My Habits** | Create, edit, archive, delete and carry forward objectives; tick today |
| **Calendar** | Month grid (objectives × days), today highlighted, weekly progress cards; month/year navigation |
| **Analytics** | Weekly and monthly charts, per-habit performance, most/least consistent, daily heatmap, trend line |
| **Yearly Overview** | GitHub-style 12-month heatmap, monthly summaries, longest streak, total check-ins |
| **Settings** | Name, theme (light/dark/system, saved to your account), timezone, log out, delete account |

Also included: email sign-in (Google and Apple ready to switch on), light and dark themes, responsive layouts (sidebar, tablet rail, phone tab bar), skeleton loading, toasts, empty states, and a short celebration when every objective for the day is done.

---

## How the today-only rule is enforced

Supabase gives every signed-in user a token that can call the database API directly, skipping this app. So the rules live **in Postgres**, not only in the app code:

- **The client never sends a date.** Ticking calls `set_today_completion(objective_id, completed)`. The database works out "today" from its own clock and the user's stored timezone.
- **Users cannot write to `habit_entries` directly.** There is no insert, update or delete permission. A trigger also re-checks the date on every write, even from the secret key.
- **Row Level Security** limits every table to its owner. A composite foreign key stops an entry from pointing at someone else's objective.
- **One entry per objective per day**, enforced by a unique constraint. Unticking sets `completed = false`.
- **Timezone** comes from Vercel's `X-Vercel-IP-Timezone` header, with the browser's timezone as a fallback when that header is missing (e.g. locally). It changes through `set_my_timezone()`, at most once every 24 hours after the first, and a "date floor" stops a switch from reopening a day that already ended.
- **No secret key** is used anywhere. The two privileged jobs (setting your timezone, deleting your account) are database functions that act only on the signed-in user.
- **Daylight-saving time** never moves a stored day, because days are stored as plain dates. Postgres's IANA database handles the one conversion that matters (now → local date).

Known limit: someone on a VPN could move their timezone east once a day and tick tomorrow a few hours early. They can never go backwards.

---

## Deploy

**Already done for this project:** the Supabase database (tables, rules and security) is set up, and its public connection details are saved in `.env`. Vercel needs **no settings**.

### 1. Deploy on Vercel (2 minutes)

1. Go to **[vercel.com/new](https://vercel.com/new)** and sign in with GitHub.
2. Find the **steady** repository and click **Import**. (If it isn't listed, click *Adjust GitHub App Permissions* and allow it.)
3. Leave every setting as it is and click **Deploy**.
4. When the confetti appears, click the preview to open your site. Copy its address, e.g. `https://steady-abc.vercel.app`.

### 2. Tell Supabase your site address (1 minute)

Sign-in emails need to know where to send you back.

1. Open **[supabase.com/dashboard](https://supabase.com/dashboard)** → your project → **Authentication** → **URL Configuration**.
2. **Site URL:** paste your Vercel address, e.g. `https://steady-abc.vercel.app`, then **Save**.
3. Under **Redirect URLs**, click **Add URL** and add `https://steady-abc.vercel.app/**` (your address followed by `/**`). Save.

### 3. Sign in

Open your site, type **the same email address you use for Supabase**, and click **Email me a sign-in link**. Open the email on the same device and tap the link.

> Supabase's built-in email only sends to the members of your Supabase organisation, and a few emails per hour. That's fine for personal use. To let other people sign up, either set up Google sign-in (below) or add a custom email sender under Supabase → Authentication → Emails → SMTP (e.g. Resend, free tier).

Every push to the `main` branch on GitHub redeploys automatically.

---

## Optional: Google and Apple sign-in

Email sign-in works without any of this. Add these if you want one-tap sign-in or other users.

### Google

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. **Google Auth Platform → Branding** (older consoles: *OAuth consent screen*): set the app name and the support and developer emails. Under **Audience**, choose *External* and publish the app.
3. **Clients → Create client** → type **Web application**.
   - **Authorized JavaScript origins:** your Vercel address
   - **Authorized redirect URIs:** `https://rhjmsbofqwtvmzlktuxo.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret**.
5. In Supabase: **Authentication → Sign In / Providers → Google** → enable, paste both, **Save**.
6. In `.env`, change `NEXT_PUBLIC_AUTH_PROVIDERS=email` to `NEXT_PUBLIC_AUTH_PROVIDERS=google,email`. Commit and push (or edit the file on github.com); Vercel redeploys.

### Apple

Requires a paid Apple Developer Program membership ([developer.apple.com](https://developer.apple.com/account)).

1. **Certificates, IDs & Profiles → Identifiers → +** → **App IDs** → *App*. Give it a description and a bundle ID (e.g. `com.yourname.steady`), tick **Sign in with Apple**, and register it.
2. **Identifiers → +** → **Services IDs**. Description "Steady web", identifier e.g. `com.yourname.steady.web`. This identifier is your **Client ID**.
3. Open that Services ID → tick **Sign in with Apple** → **Configure**. Set **Primary App ID** to the App ID from step 1, **Domains** to `rhjmsbofqwtvmzlktuxo.supabase.co`, and **Return URLs** to `https://rhjmsbofqwtvmzlktuxo.supabase.co/auth/v1/callback`.
4. **Keys → +** → tick **Sign in with Apple** → configure with your App ID → register. **Download the `.p8` file** (only once) and note the **Key ID**. The **Team ID** is at the top right of the portal.
5. Generate the client secret on your computer:

   ```bash
   node scripts/apple-client-secret.mjs --team TEAMID --key KEYID --client com.yourname.steady.web --p8 ./AuthKey_KEYID.p8
   ```

6. In Supabase: **Authentication → Sign In / Providers → Apple** → enable. Set **Client IDs** to the Services ID and paste the token into **Secret Key**.
7. Add `apple` to `NEXT_PUBLIC_AUTH_PROVIDERS` in `.env` and push.

> The Apple secret expires after at most 6 months, and Apple sign-in then fails without warning. Set a reminder for 5 months, re-run step 5 and paste the new value. Never commit the `.p8` file (it's in `.gitignore`).

### Using a different Supabase project

Run `supabase/migrations/*.sql` in order in that project's SQL Editor, then put its URL and publishable key in `.env`.

---

## Run it locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev                   # http://localhost:3000
```

`.env` already points at the Supabase project. Add `http://localhost:3000/**` to Supabase → Authentication → URL Configuration → Redirect URLs so sign-in links work locally.

Locally there is no Vercel IP header, so your first sign-in uses the browser's timezone.

**Demo mode (no sign-in):** add `NEXT_PUBLIC_DEMO_MODE=1` to `.env.local`, restart, and open `/preview/dashboard`, `/preview/habits`, `/preview/calendar`, `/preview/analytics`, `/preview/year` or `/preview/settings`. These pages use generated sample data (`lib/demo/`), save nothing, and return 404 unless the flag is set.

---

## Tests

```bash
npm test          # analytics engine: weeks, eligibility, streaks, heatmap, DST (Vitest)
npm run test:db   # runs the migration on an in-process Postgres and checks RLS, date rules, duplicates, timezones, DST
npm run typecheck
npm run lint
```

`test:db` uses [PGlite](https://pglite.dev) with a small stand-in for Supabase's `auth` schema (`supabase/tests/supabase-stub.sql`), so it needs no Docker or Supabase account. It covers 56 checks, including direct-API backfill attempts, cross-user access, the secret-key role and westward timezone switches.

---

## Project structure

```
app/
  (app)/            signed-in pages: dashboard, habits, calendar, analytics, year, settings
  api/timezone/     sets the timezone from the IP header
  auth/callback/    sign-in link / OAuth code → session; first timezone
  login/            email sign-in (+ Google / Apple when enabled)
  preview/[page]/   demo pages (only with NEXT_PUBLIC_DEMO_MODE=1)
components/         UI, grouped by feature (habits, calendar, charts, dashboard, …)
lib/
  analytics/engine.ts   all statistics, pure functions shared by server and browser
  dates/civil.ts        calendar-date helpers ("YYYY-MM-DD" strings, no timezone drift)
  supabase/             browser, server and proxy clients
  actions.ts            Server Actions (each re-checks the session and validates input)
  data.ts               data access layer for server components
proxy.ts            refreshes the session and guards pages (Next.js 16's name for middleware)
supabase/
  migrations/0001_init.sql          tables, constraints, triggers, functions, RLS, privileges
  migrations/0002_self_service.sql  set_my_timezone, delete_my_account
  tests/                     database rule tests
scripts/apple-client-secret.mjs
tests/unit/
```

---

## Statistics definitions

- **Eligible check-in:** one objective on one day it could be ticked. That runs from the objective's start date (an objective added mid-month starts that day) to the end of its month, up to yesterday. Today counts only once ticked, so the percentage never drops during the day, and future days never count as missed. After archiving, unticked days stop counting.
- **Completion %** = completed ÷ eligible.
- **Streak** = consecutive days with at least one completed objective. The current streak stays alive until today ends.
- **Weeks** are fixed day ranges inside a month: 1–7, 8–14, 15–21, 22–28, 29–end.
- **Best/least month or week** needs at least 7 eligible check-ins, so one lucky tick isn't "100%".
- **Habit performance** groups a habit carried forward across months (same title) into one row.

---

## Maintenance and troubleshooting

| Symptom | Fix |
| --- | --- |
| The sign-in link opens `localhost:3000` | Set **Site URL** in Supabase → Authentication → URL Configuration to your Vercel address (Deploy step 2) |
| "This address can't receive sign-in emails yet" | Use the email of your Supabase account, or set up custom SMTP in Supabase |
| "Too many sign-in emails" | The built-in email allows only a few per hour. Wait, or set up custom SMTP |
| "Link expired or opened in a different browser" | Request a new link and open it in the same browser you requested it from |
| Apple sign-in worked, then fails with `invalid_client` | The Apple secret expired. Re-run `scripts/apple-client-secret.mjs` and paste it into Supabase |
| "Could not load your profile" | The migrations haven't been run on this Supabase project |
| Wrong day after travelling | Settings → Timezone → **Update from my location** (once per 24 hours) |
| Supabase pauses the project | Free projects pause after a week with no activity. Restore it from the dashboard, or upgrade |

**Backups:** Supabase's paid plans take daily backups. On the free plan, export the data from time to time (Database → Backups, or `supabase db dump`).
