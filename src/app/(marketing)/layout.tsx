import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-[10px] bg-background/80 border-b border-border/60">
        <div className="mx-auto w-full max-w-[1120px] flex items-center justify-between px-5 sm:px-8 h-14">
          <Link
            href="/"
            className="font-stylized text-title font-semibold leading-none tracking-tight hover:opacity-90 transition-opacity"
          >
            forecast<span className="text-accent">.</span>social
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="#how-it-works"
              className="hidden sm:inline-flex text-body-sm text-muted-foreground hover:text-foreground transition-colors px-3 h-9 items-center"
            >
              How it works
            </Link>
            <Link
              href="#faq"
              className="hidden sm:inline-flex text-body-sm text-muted-foreground hover:text-foreground transition-colors px-3 h-9 items-center"
            >
              FAQ
            </Link>
            <Button
              asChild
              size="sm"
              className="rounded-full px-4 h-9 font-medium"
            >
              <Link href="/sign-up">Make a call</Link>
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-border/60">
        <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-body-sm text-muted-foreground">
          <p className="font-stylized text-title font-semibold text-foreground leading-none tracking-tight">
            forecast<span className="text-accent">.</span>social
          </p>
          <p className="text-overline">© 2026 · say it before it happens</p>
        </div>
      </footer>
    </div>
  );
}
