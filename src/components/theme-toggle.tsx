"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Instant light/dark toggle. No System option, no dropdown — one click
 * flips the theme. The button always renders the icon for the theme
 * you'd switch TO (sun when dark, moon when light) so the action reads
 * as the affordance.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Before hydration, render a stable icon to avoid mismatch. After
  // mount, swap to the correct affordance for the current theme.
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const Icon = isDark ? Sun : Moon;
  const next = isDark ? "light" : "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Switch to ${next} theme`}
      className={cn("relative", className)}
      onClick={() => setTheme(next)}
    >
      <Icon className="size-4" />
    </Button>
  );
}
