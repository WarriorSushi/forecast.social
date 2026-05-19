import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { AppMobileHeader } from "@/components/app/app-mobile-header";
import { AppRail } from "@/components/app/app-rail";
import { AppTabBar } from "@/components/app/app-tab-bar";
import { db } from "@/lib/db";
import { market_proposals, notifications } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");
  if (!profile.onboarded_at) redirect("/onboarding");

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
      <AppMobileHeader unreadNotifications={unread} />
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
