"use client";
import { Globe, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useMounted } from "@/lib/use-mounted";
import { toast } from "sonner";
import { useApp } from "@/components/app/app-context";
import { Button } from "@/components/ui/button";

/**
 * 1) On first use, sets the timezone (IP header first, browser as fallback).
 * 2) When the IP timezone differs from the stored one (travel), offers a switch.
 */
export function TimezoneSync({ ipTimezone }: { ipTimezone: string | null }) {
  const { mode, timezone, timezoneSource, actions } = useApp();
  const router = useRouter();
  const ran = useRef(false);
  const [dismissedNow, setDismissed] = useState(false);
  const mounted = useMounted();
  const [pending, start] = useTransition();

  useEffect(() => {
    if (mode !== "live" || timezoneSource !== "default" || ran.current) return;
    ran.current = true;
    void actions.refreshTimezone().then((res) => {
      if (res.ok) router.refresh();
    });
  }, [mode, timezoneSource, actions, router]);

  const mismatch = timezoneSource !== "default" && ipTimezone && ipTimezone !== timezone;
  const key = `steady-tz-dismissed:${ipTimezone}`;
  const dismissed = !mounted || dismissedNow || sessionStorage.getItem(key) === "1";

  if (!mismatch || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(key, "1");
    setDismissed(true);
  };

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:px-6 lg:px-10">
        <Globe className="hidden size-4 shrink-0 text-accent sm:block" />
        <p className="flex-1 text-muted">
          You seem to be in <span className="font-medium text-text">{ipTimezone}</span>. Your days are tracked in{" "}
          <span className="font-medium text-text">{timezone}</span>.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await actions.refreshTimezone();
                if (res.ok) {
                  toast.success(`Timezone set to ${res.data.timezone}`);
                  router.refresh();
                } else toast.error(res.error);
                dismiss();
              })
            }
          >
            Switch timezone
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Keep current timezone">
            <X /> Keep
          </Button>
        </div>
      </div>
    </div>
  );
}
