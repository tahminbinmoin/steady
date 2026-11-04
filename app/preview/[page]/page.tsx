import { notFound } from "next/navigation";
import { localDateIn } from "@/lib/dates/civil";
import { DemoApp } from "./demo-app";

// Demo pages with sample data, for design review. Disabled unless
// NEXT_PUBLIC_DEMO_MODE=1, so they never appear in production by accident.
export const dynamic = "force-dynamic";

const PAGES = ["dashboard", "habits", "calendar", "analytics", "year", "settings"];

export default async function PreviewPage({ params, searchParams }: { params: Promise<{ page: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") notFound();
  const [{ page }, sp] = await Promise.all([params, searchParams]);
  if (!PAGES.includes(page)) notFound();
  return <DemoApp page={page} today={localDateIn("Asia/Dhaka")} month={sp.month} year={sp.year} />;
}
