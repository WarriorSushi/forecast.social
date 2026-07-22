import {
  Bell,
  CircleUser,
  Compass,
  LayoutGrid,
  MessageSquarePlus,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
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
 * The mobile tab bar stays at four distinct destinations. Prediction starts
 * in Markets, so a separate Predict tab would only duplicate navigation.
 */
export function getNavItems(username: string): readonly NavItem[] {
  return [
    { href: "/feed",          label: "Dashboard",     Icon: Compass },
    { href: "/markets",       label: "Markets",       Icon: LayoutGrid },
    { href: "/leaderboard",   label: "Leaderboard",   Icon: Trophy },
    {
      href: "/markets/propose",
      label: "Propose",
      Icon: MessageSquarePlus,
      desktopOnly: true,
    },
    { href: "/notifications", label: "Notifications", Icon: Bell,   desktopOnly: true },
    {
      href: `/u/${username}`,
      label: "Profile",
      Icon: CircleUser,
      alsoActiveOn: ["/me"],
    },
  ];
}
