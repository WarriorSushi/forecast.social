"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ChevronsUpDown, LogOut, Moon, Settings, Sun } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/server/actions/auth";

type Props = {
  username: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
};

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function UserMenu({ username, displayName, email, avatarUrl }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  // SSR-safe mount check via useSyncExternalStore; avoids the
  // set-state-in-effect anti-pattern the React Compiler flags.
  const mounted = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const initials = getInitials(displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Avatar className="size-8 rounded-md border border-border-strong shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="size-full object-cover rounded-md"
              />
            ) : (
              <AvatarFallback className="rounded-md bg-muted text-foreground font-mono text-caption">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-body-sm text-foreground truncate leading-tight">
              {displayName}
            </span>
            <span className="text-caption text-muted-foreground font-mono truncate leading-tight">
              @{username}
            </span>
          </div>
          <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="min-w-[224px]"
      >
        {email ? (
          <DropdownMenuLabel className="text-overline text-muted-foreground font-normal">
            {email}
          </DropdownMenuLabel>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/u/${username}`}>
            <span className="size-4 inline-flex items-center justify-center">
              <span className="size-2 rounded-full bg-foreground" />
            </span>
            View profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setTheme(isDark ? "light" : "dark");
          }}
        >
          {isDark ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          {isDark ? "Light theme" : "Dark theme"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <form action={signOut}>
          <button
            type="submit"
            className="w-full text-left text-body-sm flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-muted text-signal-negative"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
