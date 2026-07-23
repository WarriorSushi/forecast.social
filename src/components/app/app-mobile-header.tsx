import Link from "next/link";
import { Bell, Settings, UserRoundPlus } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function AppMobileHeader({
  unreadNotifications = 0,
  adminPendingAccessRequests = 0,
}: {
  unreadNotifications?: number;
  adminPendingAccessRequests?: number;
}) {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-background border-b border-border">
      <div className="flex items-center justify-between h-14 px-5">
        <Link
          href="/feed"
          className="font-stylized text-title font-semibold leading-none tracking-tight hover:opacity-90 transition-opacity"
        >
          forecast<span className="text-accent">.</span>social
        </Link>
        <div className="flex items-center gap-1">
          {adminPendingAccessRequests > 0 ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={`Access requests, ${adminPendingAccessRequests} pending`}
              className="relative"
            >
              <Link href="/admin/access-requests">
                <UserRoundPlus className="size-4" strokeWidth={1.75} />
                <span
                  aria-hidden
                  className="absolute top-1 right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-accent-foreground"
                >
                  {adminPendingAccessRequests > 99
                    ? "99+"
                    : adminPendingAccessRequests}
                </span>
              </Link>
            </Button>
          ) : null}
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={
              unreadNotifications > 0
                ? `Notifications, ${unreadNotifications} unread`
                : "Notifications"
            }
            className="relative"
          >
            <Link href="/notifications">
              <Bell className="size-4" strokeWidth={1.75} />
              {unreadNotifications > 0 ? (
                <span
                  aria-hidden
                  className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-foreground font-mono text-[9px] font-semibold tabular-nums"
                >
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              ) : null}
            </Link>
          </Button>
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
