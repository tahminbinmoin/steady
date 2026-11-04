"use client";
import { Globe, LogOut, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useMounted } from "@/lib/use-mounted";
import { toast } from "sonner";
import { useApp } from "@/components/app/app-context";
import { PageHeader } from "@/components/shell/app-shell";
import { Avatar } from "@/components/shell/user-menu";
import { useThemePreference } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { FieldHint, Input, Label } from "@/components/ui/input";
import { formatDate } from "@/lib/dates/civil";
import type { ThemePreference } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCE: Record<string, string> = { ip: "your network location", browser: "your browser", default: "not detected yet" };

export function SettingsView({ ipTimezone }: { ipTimezone: string | null }) {
  const app = useApp();
  const router = useRouter();
  const { theme, choose } = useThemePreference();
  const mounted = useMounted();
  const [name, setName] = useState(app.user.name ?? "");
  const [savingName, startName] = useTransition();
  const [tzPending, startTz] = useTransition();
  const [signingOut, startSignOut] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const now = mounted
    ? new Intl.DateTimeFormat(undefined, { timeZone: app.timezone, hour: "numeric", minute: "2-digit", weekday: "long" }).format(new Date())
    : "";
  const nextChange = app.timezoneUpdatedAt ? new Date(new Date(app.timezoneUpdatedAt).getTime() + 86_400_000) : null;
  const locked = app.timezoneSource !== "default" && nextChange && mounted && nextChange > new Date();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-3xl gap-5">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Shown in the app only.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                startName(async () => {
                  const res = await app.actions.updateDisplayName(name);
                  if (res.ok) {
                    toast.success("Name saved");
                    router.refresh();
                  } else toast.error(res.error);
                });
              }}
            >
              <Avatar className="size-12 text-sm" />
              <div className="flex-1">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <Button type="submit" disabled={savingName || !name.trim() || name === app.user.name}>
                {savingName ? "Saving…" : "Save"}
              </Button>
            </form>
            <p className="mt-4 text-sm text-muted">
              Signed in as <span className="text-text">{app.user.email ?? "—"}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Saved to your account, so it follows you to every device.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
              {(
                [
                  ["light", "Light", Sun],
                  ["dark", "Dark", Moon],
                  ["system", "System", Monitor],
                ] as [ThemePreference, string, typeof Sun][]
              ).map(([value, label, Icon]) => {
                const on = mounted && theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => choose(value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-[10px] border px-3 py-4 text-sm transition-colors",
                      on ? "border-accent bg-accent-soft text-text" : "border-border text-muted hover:bg-surface-2",
                    )}
                  >
                    <Icon className={cn("size-5", on && "text-accent")} />
                    {label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Timezone</CardTitle>
              <CardDescription>Decides when each day starts and ends. Only today can be ticked.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Tracking timezone</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                  <Globe className="size-4 text-accent" /> {app.timezone}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Local time there</dt>
                <dd className="tabular mt-0.5 font-medium" suppressHydrationWarning>
                  {now || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Detected from</dt>
                <dd className="mt-0.5">{SOURCE[app.timezoneSource]}</dd>
              </div>
              <div>
                <dt className="text-muted">Today</dt>
                <dd className="mt-0.5">{formatDate(app.today, { year: true })}</dd>
              </div>
            </dl>
            {ipTimezone && ipTimezone !== app.timezone && (
              <p className="rounded-[var(--radius-control)] bg-accent-soft px-3 py-2 text-sm">
                Your network suggests <span className="font-medium">{ipTimezone}</span>.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={tzPending || Boolean(locked)}
                onClick={() =>
                  startTz(async () => {
                    const res = await app.actions.refreshTimezone();
                    if (res.ok) {
                      toast.success(res.data.timezone === app.timezone ? "Timezone is up to date" : `Timezone set to ${res.data.timezone}`);
                      router.refresh();
                    } else toast.error(res.error);
                  })
                }
              >
                <Globe /> {tzPending ? "Checking…" : "Update from my location"}
              </Button>
              <FieldHint className="mt-0">
                {locked && nextChange
                  ? `Changed recently. You can change it again after ${nextChange.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`
                  : "Use this after travelling. Limited to once every 24 hours so past days stay closed."}
              </FieldHint>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your habit history is private to your account.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button disabled={signingOut} onClick={() => startSignOut(() => app.actions.signOut())}>
              <LogOut /> Log out
            </Button>
            <Button variant="danger-ghost" onClick={() => setDeleteOpen(true)}>
              <Trash2 /> Delete account
            </Button>
          </CardContent>
        </Card>
      </div>
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { actions } = useApp();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent role="alertdialog" title="Delete your account?" description="This permanently deletes your profile, every objective and every check-in. It cannot be undone.">
        <Label htmlFor="confirm-delete">
          Type <span className="font-mono">DELETE</span> to confirm
        </Label>
        <Input id="confirm-delete" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={text !== "DELETE" || pending}
            onClick={() =>
              start(async () => {
                const res = await actions.deleteAccount(text);
                if (res && !res.ok) toast.error(res.error);
              })
            }
          >
            {pending ? "Deleting…" : "Delete everything"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
