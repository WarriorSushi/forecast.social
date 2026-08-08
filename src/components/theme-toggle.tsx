"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Instant light/dark toggle. No System option, no dropdown — one click
 * flips the theme. The button always renders the icon for the theme
 * you'd switch TO (sun when dark, moon when light) so the action reads
 * as the affordance.
 *
 * The visible icon is selected by the same `dark` class that drives the
 * stylesheet. This keeps the affordance correct during hydration without a
 * separate mounted state that can drift from next-themes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle color theme"
      className={cn("relative", className)}
      onClick={() =>
        setTheme(
          document.documentElement.classList.contains("dark")
            ? "light"
            : "dark",
        )
      }
    >
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
    </Button>
  );
}
