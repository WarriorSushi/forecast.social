import Link from "next/link";
import { Settings } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function AppMobileHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-30 backdrop-blur-[10px] bg-background/80 border-b border-border/60">
      <div className="flex items-center justify-between h-14 px-5">
        <Link
          href="/feed"
          className="font-stylized text-title font-semibold leading-none tracking-tight hover:opacity-90 transition-opacity"
        >
          forecast<span className="text-accent">.</span>social
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Settings">
            <Link href="/settings">
              <Settings className="size-4" strokeWidth={1.75} />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
