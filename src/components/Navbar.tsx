"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Navbar() {
  // Track mount to avoid theme hydration mismatch.
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
        {/* Left side: Prism logo and label */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 via-violet-500 to-emerald-400 text-xs font-semibold text-white shadow-sm">
            P
          </div>
          <span className="text-sm font-semibold tracking-tight">Prism</span>
        </div>

        {/* Right side: theme toggle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Toggle color theme"
            onClick={handleToggleTheme}
            disabled={!isMounted}
          >
            {isMounted ? (
              isDark ? (
                <Moon className="size-4" />
              ) : (
                <Sun className="size-4" />
              )
            ) : (
              <div className="size-3 rounded-full bg-muted-foreground/40" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

