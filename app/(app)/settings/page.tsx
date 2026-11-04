import type { Metadata } from "next";
import { headers } from "next/headers";
import { SettingsView } from "@/components/settings/settings-view";
import { ipTimezone } from "@/lib/timezone-server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  return <SettingsView ipTimezone={ipTimezone(await headers())} />;
}
