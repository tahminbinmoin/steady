import type { Metadata } from "next";
import { LoginCard } from "./login-card";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return <LoginCard error={str(sp.error)} next={str(sp.next)} deleted={sp.deleted === "1"} />;
}
