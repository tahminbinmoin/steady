"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMounted } from "@/lib/use-mounted";
import { Button } from "@/components/ui/button";

/** Light/dark switch for signed-out pages (saved on this device). */
export function ThemeToggleStandalone() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon-sm" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
