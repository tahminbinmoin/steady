"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-context";
import { Logo } from "./logo";
import { NAV } from "./nav";
import { UserMenu } from "./user-menu";

function useActive() {
  const pathname = usePathname();
  const { linkBase = "" } = useApp();
  return (href: string) => pathname === linkBase + href || pathname.startsWith(`${linkBase + href}/`);
}

export function AppShell({ children, banner }: { children: ReactNode; banner?: ReactNode }) {
  const isActive = useActive();
  const { linkBase = "" } = useApp();
  return (
    <div className="min-h-dvh md:pl-16 lg:pl-60">
      {/* Sidebar: icon rail on tablet, full on desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col border-r border-border bg-surface md:flex lg:w-60">
        <Link href={`${linkBase}/dashboard`} className="flex h-16 items-center gap-2.5 px-4 lg:px-5">
          <Logo className="size-7 shrink-0" />
          <span className="hidden text-[15px] font-semibold tracking-tight lg:inline">Steady</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-2.5 py-2 lg:px-3" aria-label="Main">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const link = (
              <Link
                key={item.href}
                href={linkBase + item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-9 items-center gap-3 rounded-[var(--radius-control)] px-2.5 text-sm transition-colors",
                  active ? "bg-surface-2 font-medium text-text" : "text-muted hover:bg-surface-2/70 hover:text-text",
                )}
              >
                <item.icon className={cn("size-[18px] shrink-0", active ? "text-accent" : "text-faint group-hover:text-muted")} />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
            return (
              <div key={item.href} className="lg:contents">
                <div className="lg:hidden">
                  <Tooltip content={item.label} side="right">
                    {link}
                  </Tooltip>
                </div>
                <div className="hidden lg:block">{link}</div>
              </div>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-1 border-t border-border p-2.5 lg:flex-row lg:items-center lg:justify-between lg:p-3">
          <div className="hidden min-w-0 flex-1 lg:block">
            <UserMenu showName />
          </div>
          <div className="lg:hidden">
            <UserMenu />
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md md:hidden">
        <Link href={`${linkBase}/dashboard`} className="flex items-center gap-2">
          <Logo className="size-6" />
          <span className="text-[15px] font-semibold tracking-tight">Steady</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {banner}
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-8 lg:px-10">{children}</main>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Main"
      >
        {NAV.filter((n) => n.mobile).map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={linkBase + item.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors", active ? "text-accent" : "text-muted")}
            >
              <item.icon className="size-5" />
              <span className={cn(active && "font-medium")}>{"short" in item ? item.short : item.label.replace("My ", "")}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
