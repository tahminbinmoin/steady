"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useMounted } from "@/lib/use-mounted";
import { useApp } from "@/components/app/app-context";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ThemePreference } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function useThemePreference() {
  const { theme, setTheme } = useTheme();
  const { actions } = useApp();
  const choose = (value: ThemePreference) => {
    setTheme(value);
    void actions.updateThemePreference(value); // remembered across devices and logins
  };
  return { theme: (theme ?? "system") as ThemePreference, choose };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, choose } = useThemePreference();
  const mounted = useMounted();
  const Icon = !mounted ? Sun : theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Change theme" className={className}>
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-36">
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.value} onSelect={() => choose(o.value)} className={cn(mounted && theme === o.value && "font-medium")}>
            <o.icon />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Applies the theme saved in the profile once per sign-in, so it follows the user across devices. */
export function ThemeSync({ preference }: { preference: ThemePreference }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    const key = "steady-theme-synced";
    if (sessionStorage.getItem(key) === preference) return;
    setTheme(preference);
    sessionStorage.setItem(key, preference);
  }, [preference, setTheme]);
  return null;
}
