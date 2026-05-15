import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE: Record<Size, string> = {
  xs: "size-7 text-[10px]",
  sm: "size-8 text-[11px]",
  md: "size-10 text-caption",
  lg: "size-12 text-body-sm",
  xl: "size-16 text-body",
};

/**
 * Reusable avatar tile. Renders the uploaded avatar when present; falls
 * back to display-name initials on muted bg-border square. Used
 * everywhere user identity needs a tile — comments, leaderboard rows,
 * feed entries, profile peeks.
 */
export function UserAvatar({
  url,
  displayName,
  size = "md",
  className,
}: {
  url: string | null;
  displayName: string;
  size?: Size;
  className?: string;
}) {
  return (
    <Avatar
      className={cn(
        "rounded-md border border-border-strong shrink-0",
        SIZE[size],
        className,
      )}
    >
      {url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt={`${displayName} avatar`}
          className="size-full object-cover rounded-md"
          loading="lazy"
        />
      ) : (
        <AvatarFallback className="rounded-md bg-muted text-foreground font-mono tabular-nums">
          {getInitials(displayName)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
