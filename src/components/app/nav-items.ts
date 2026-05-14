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
};

// The four shell destinations, per PRD §5.5 and DESIGN.md §6.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/feed",    label: "Feed",    Icon: Compass },
  { href: "/markets", label: "Markets", Icon: LayoutGrid },
  { href: "/predict", label: "Predict", Icon: Plus, emphasised: true },
  { href: "/me",      label: "Profile", Icon: CircleUser },
] as const;
