import {
  Bell,
  CircleUser,
  Compass,
  LayoutGrid,
  MessageSquarePlus,
  Plus,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** When true, the tab-bar rendering treats this as a primary action. */
  emphasised?: boolean;
  /**
   * Extra pathname patterns that should also light this item up. The
   * Profile item points at /u/<username>, but the rail and tab bar also
   * keep it active when the user lands at /me (which 302s through to
   * the same profile).
   */
  alsoActiveOn?: string[];
  /** Only render this item in the desktop rail, not the mobile tab bar.
   * The mobile bar is locked to 4 items per DESIGN.md §6. */
  desktopOnly?: boolean;
};

/**
 * Build the shell destinations. The Profile item depends on the
 * signed-in user's handle, so callers pass it in. Defined as a function
 * (rather than a constant) so the href is always the current user's
 * profile, never stale.
 *
 * The Leaderboard item is desktopOnly — the mobile tab bar stays at the
 * 4 items DESIGN.md prescribes (Feed / Markets / Predict / Profile).
 */
export function getNavItems(username: string): readonly NavItem[] {
  return [
    { href: "/feed",          label: "Feed",          Icon: Compass },
    { href: "/markets",       label: "Markets",       Icon: LayoutGrid },
    {
      href: "/markets/propose",
      label: "Propose",
      Icon: MessageSquarePlus,
      desktopOnly: true,
    },
    { href: "/leaderboard",   label: "Leaderboard",   Icon: Trophy, desktopOnly: true },
    { href: "/notifications", label: "Notifications", Icon: Bell,   desktopOnly: true },
    { href: "/predict",       label: "Predict",       Icon: Plus, emphasised: true },
    {
      href: `/u/${username}`,
      label: "Profile",
      Icon: CircleUser,
      alsoActiveOn: ["/me"],
    },
  ];
}
