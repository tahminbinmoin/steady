"use client";
import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-center"
      offset={88}
      mobileOffset={88}
      toastOptions={{
        classNames: {
          toast: "!rounded-[10px] !border-border !bg-surface !text-text !shadow-raised",
          description: "!text-muted",
        },
      }}
    />
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="steady-theme">
      <TooltipProvider>
        {children}
        <ThemedToaster />
      </TooltipProvider>
    </NextThemes>
  );
}
