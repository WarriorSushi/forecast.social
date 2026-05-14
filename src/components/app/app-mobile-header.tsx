import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export function AppMobileHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-30 backdrop-blur-[10px] bg-background/80 border-b border-border/60">
      <div className="flex items-center justify-between h-14 px-5">
        <Link
          href="/"
          className="font-display text-title leading-none hover:opacity-90 transition-opacity"
        >
          forecast<span className="text-accent">.</span>social
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
