import { headers } from "next/headers";
import { AppProvider } from "@/components/app/app-context";
import { AppShell } from "@/components/shell/app-shell";
import { TimezoneSync } from "@/components/shell/timezone-sync";
import { ThemeSync } from "@/components/theme/theme-toggle";
import { getProfile, getToday } from "@/lib/data";
import { ipTimezone } from "@/lib/timezone-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, today, h] = await Promise.all([getProfile(), getToday(), headers()]);
  return (
    <AppProvider
      value={{
        mode: "live",
        today: today.today,
        timezone: today.timezone,
        timezoneSource: profile.timezone_source,
        timezoneUpdatedAt: profile.timezone_updated_at,
        dateFloor: today.date_floor,
        user: { name: profile.full_name, email: profile.email, avatarUrl: profile.avatar_url },
      }}
    >
      <ThemeSync preference={profile.theme_preference} />
      <AppShell banner={<TimezoneSync ipTimezone={ipTimezone(h)} />}>{children}</AppShell>
    </AppProvider>
  );
}
