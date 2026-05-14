"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getNavItems, type NavItem } from "@/components/app/nav-items";
import { UserMenu } from "@/components/app/user-menu";
import { cn } from "@/lib/utils";
import type { CurrentProfile } from "@/lib/auth";

export function AppRail({ profile }: { profile: CurrentProfile }) {
  const pathname = usePathname();
  const items = getNavItems(profile.username);

  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 sticky top-0 self-start h-screen flex-col py-8 pr-2">
      <Link
        href="/"
        className="font-stylized text-title font-semibold leading-none tracking-tight mb-10 px-3 hover:opacity-90 transition-opacity"
      >
        forecast<span className="text-accent">.</span>social
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <RailItem
            key={item.href}
            item={item}
            active={isActive(pathname, item)}
          />
        ))}
      </nav>

      <div className="mt-auto -mx-1">
        <UserMenu
          username={profile.username}
          displayName={profile.display_name}
          email={profile.email}
          avatarUrl={profile.avatar_url}
        />
      </div>
    </aside>
  );
}

function RailItem({ item, active }: { item: NavItem; active: boolean }) {
  const { Icon, href, label } = item;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative group flex items-center gap-3 h-10 px-3 rounded-md transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {/* Accent vertical bar marks the active rail item per DESIGN.md §6. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-sm transition-opacity",
          active ? "bg-accent opacity-100" : "opacity-0",
        )}
      />
      <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
      <span className="text-body-sm">{label}</span>
    </Link>
  );
}

function isActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false;
  if (pathname === item.href) return true;
  if (pathname.startsWith(`${item.href}/`)) return true;
  return item.alsoActiveOn?.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ?? false;
}
