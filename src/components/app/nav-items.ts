import {
  CircleUser,
  Compass,
  LayoutGrid,
  Plus,
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
};

/**
 * Build the four shell destinations. The Profile item depends on the
 * signed-in user's handle, so callers pass it in. Defined as a function
 * (rather than a constant) so the href is always the current user's
 * profile, never stale.
 */
export function getNavItems(username: string): readonly NavItem[] {
  return [
    { href: "/feed",    label: "Feed",    Icon: Compass },
    { href: "/markets", label: "Markets", Icon: LayoutGrid },
    { href: "/predict", label: "Predict", Icon: Plus, emphasised: true },
    {
      href: `/u/${username}`,
      label: "Profile",
      Icon: CircleUser,
      alsoActiveOn: ["/me"],
    },
  ];
}
