"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/sign-in", label: "Sign in" },
  { href: "/sign-up", label: "Sign up" },
] as const;

export function AuthTabs() {
  const pathname = usePathname();
  if (
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/sign-up/check-email")
  ) {
    return null;
  }
  const active = pathname?.startsWith("/sign-up") ? "/sign-up" : "/sign-in";

  return (
    <div
      role="tablist"
      aria-label="Authentication"
      className="relative grid grid-cols-2 rounded-full border border-border bg-card p-1 mb-8"
    >
      {TABS.map((tab) => {
        const isActive = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "relative z-10 inline-flex h-9 items-center justify-center rounded-full text-body-sm font-medium transition-colors",
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
