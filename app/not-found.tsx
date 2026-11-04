import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="tabular text-sm text-muted">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
        <Button asChild variant="primary" className="mt-6">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
