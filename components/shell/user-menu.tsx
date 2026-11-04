"use client";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { useApp } from "@/components/app/app-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn, initials } from "@/lib/utils";

export function Avatar({ className }: { className?: string }) {
  const { user } = useApp();
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className={cn("size-8 rounded-full object-cover", className)} />
  ) : (
    <span className={cn("grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent", className)}>{initials(user.name, user.email)}</span>
  );
}

export function UserMenu({ showName = false }: { showName?: boolean }) {
  const { user, actions } = useApp();
  const [pending, start] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-control)] p-1 text-left transition-colors hover:bg-surface-2" aria-label="Account menu">
        <Avatar />
        {showName && (
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium">{user.name ?? "Your account"}</span>
            <span className="block truncate text-xs text-muted">{user.email}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={showName ? "start" : "end"} side={showName ? "top" : "bottom"}>
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={pending} onSelect={() => start(() => actions.signOut())}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
