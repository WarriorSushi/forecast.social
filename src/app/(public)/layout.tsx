import Link from "next/link";
import { and, eq, isNull, sql } from "drizzle-orm";

import { AppMobileHeader } from "@/components/app/app-mobile-header";
import { AppRail } from "@/components/app/app-rail";
import { AppTabBar } from "@/components/app/app-tab-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { market_proposals, notifications } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";

/**
 * Adaptive layout for routes that are public-browsable but also work
 * when signed in. Signed-in onboarded users see the same chrome as the
 * (app) group (rail + tab bar + mobile header). Anonymous visitors see
 * a marketing-style top bar with a "Get started" CTA — same shell as
 * the landing page so they can keep exploring before signing up.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (profile && profile.onboarded_at) {
    const [unreadAgg] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(
        and(eq(notifications.user_id, profile.id), isNull(notifications.read_at)),
      );
    const unread = Number(unreadAgg?.count ?? 0);

    let pendingProposals = 0;
    if (profile.is_admin) {
      const [pendingAgg] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(market_proposals)
        .where(eq(market_proposals.status, "pending"));
      pendingProposals = Number(pendingAgg?.count ?? 0);
    }

    return (
      <div className="min-h-screen bg-background">
        <AppMobileHeader />
        <div className="mx-auto w-full max-w-[1120px] lg:flex lg:gap-10 lg:px-8">
          <AppRail
            profile={profile}
            unreadNotifications={unread}
            adminPendingProposals={pendingProposals}
          />
          <main className="flex-1 min-w-0 px-5 sm:px-6 lg:px-0 pt-5 lg:pt-10 pb-24 lg:pb-16">
            {children}
          </main>
        </div>
        <AppTabBar username={profile.username} />
      </div>
    );
  }

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
              href="/leaderboard"
              className="hidden sm:inline-flex text-body-sm text-muted-foreground hover:text-foreground transition-colors px-3 h-9 items-center"
            >
              Leaderboard
            </Link>
            <Link
              href="/sign-in"
              className="text-body-sm text-muted-foreground hover:text-foreground transition-colors px-3 h-9 inline-flex items-center"
            >
              Sign in
            </Link>
            <Button
              asChild
              size="sm"
              className="rounded-full px-4 h-9 font-medium"
            >
              <Link href="/sign-up">Get started</Link>
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1 px-5 sm:px-8">{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-body-sm text-muted-foreground">
          <p className="font-stylized text-title font-semibold text-foreground leading-none tracking-tight">
            forecast<span className="text-accent">.</span>social
          </p>
          <p className="text-overline">© 2026 · receipts for everything</p>
        </div>
      </footer>
    </div>
  );
}
