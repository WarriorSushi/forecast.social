"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ThemeOption = {
  value: "system" | "light" | "dark";
  label: string;
  Icon: typeof Sun;
};

const OPTIONS: readonly ThemeOption[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

function Swatch({ value }: { value: ThemeOption["value"] }) {
  // Tiny color-coded preview chip. Matches DESIGN.md §8 "previewed with a tiny swatch."
  // Inline styles use the literal palette so the swatch is correct regardless of
  // the active theme — System gets a half-and-half split.
  const LIGHT = "oklch(97.5% 0.012 85)";
  const DARK = "oklch(13% 0.012 60)";

  const baseClasses =
    "size-4 shrink-0 rounded-full border border-border-strong";

  if (value === "light") {
    return <span className={baseClasses} style={{ background: LIGHT }} />;
  }
  if (value === "dark") {
    return <span className={baseClasses} style={{ background: DARK }} />;
  }
  return (
    <span
      className={baseClasses}
      style={{
        background: `linear-gradient(90deg, ${LIGHT} 0 50%, ${DARK} 50% 100%)`,
      }}
    />
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Until mounted, render a stable shell to avoid hydration mismatch. The
  // resolved icon swaps in after hydration.
  const ActiveIcon = !mounted
    ? Sun
    : resolvedTheme === "dark"
      ? Moon
      : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Toggle theme"
          className={cn("relative", className)}
        >
          <ActiveIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {OPTIONS.map(({ value, label }) => {
          const selected = mounted && theme === value;
          return (
            <DropdownMenuItem
              key={value}
              onSelect={() => setTheme(value)}
              className="gap-3"
            >
              <Swatch value={value} />
              <span className="flex-1">{label}</span>
              {selected ? (
                <Check className="size-3.5 text-muted-foreground" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
