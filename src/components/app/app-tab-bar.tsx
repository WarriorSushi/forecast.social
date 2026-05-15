"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getNavItems, type NavItem } from "@/components/app/nav-items";
import { cn } from "@/lib/utils";

export function AppTabBar({ username }: { username: string }) {
  const pathname = usePathname();
  const items = getNavItems(username).filter((i) => !i.desktopOnly);

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 backdrop-blur-[10px] bg-background/85 border-t border-border"
    >
      <div className="mx-auto max-w-[480px] grid grid-cols-4 h-16">
        {items.map((item) => (
          <TabItem
            key={item.href}
            item={item}
            active={isActive(pathname, item)}
          />
        ))}
      </div>
    </nav>
  );
}

function TabItem({ item, active }: { item: NavItem; active: boolean }) {
  const { Icon, href, label, emphasised } = item;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 select-none touch-manipulation",
        active
          ? "text-foreground"
          : "text-muted-foreground active:text-foreground",
      )}
    >
      {emphasised ? (
        <span className="flex items-center justify-center size-9 rounded-full bg-primary text-primary-foreground">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
      ) : (
        <Icon className="size-[22px]" strokeWidth={1.75} />
      )}
      <span className="text-[10px] tracking-[0.04em] font-medium">{label}</span>
      {/* Active underline accent — DESIGN.md §6 "2px underline in accent." */}
      <span
        aria-hidden
        className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-accent transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </Link>
  );
}

function isActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false;
  if (pathname === item.href) return true;
  if (pathname.startsWith(`${item.href}/`)) return true;
  return item.alsoActiveOn?.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ?? false;
}
