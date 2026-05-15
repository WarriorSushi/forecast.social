import Link from "next/link";

import { UserAvatar } from "@/components/app/user-avatar";

/**
 * Recent-predictions list on the market page. Each row: handle, the
 * probability the user called, and a relative timestamp. Names link out
 * to the user's profile.
 */
type TimelineEntry = {
  id: string;
  probability: number;
  created_at: Date;
  user_handle: string;
  user_display_name: string;
  user_avatar_url: string | null;
};

export function PredictionsTimeline({
  entries,
}: {
  entries: TimelineEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-12 px-6 flex flex-col items-center text-center">
        <p className="font-display text-headline text-muted-foreground">
          No calls yet.
        </p>
        <p className="mt-2 text-body-sm text-muted-foreground max-w-md">
          Predictions appear here as forecasters lock them in. The first
          call belongs to whoever shows up first.
        </p>
      </div>
    );
  }

  return (
    <ul className="rounded-2xl border border-border bg-surface overflow-hidden">
      {entries.map((entry) => {
        const pct = Math.round(entry.probability * 100);
        const positive = pct >= 50;
        return (
          <li
            key={entry.id}
            className="grid grid-cols-[32px_1fr_72px_72px] sm:grid-cols-[40px_1fr_120px_100px] items-center gap-3 sm:gap-5 px-5 py-4 border-b border-border last:border-b-0"
          >
            <UserAvatar
              url={entry.user_avatar_url}
              displayName={entry.user_display_name}
              size="sm"
            />
            <Link
              href={`/u/${entry.user_handle}`}
              className="font-mono text-body-sm text-foreground hover:underline truncate min-w-0"
            >
              @{entry.user_handle}
            </Link>
            <span className="font-mono text-caption text-muted-foreground tabular-nums">
              {relativeTime(entry.created_at)}
            </span>
            <span
              className={
                "font-display text-headline tabular-nums text-right " +
                (positive ? "text-signal-positive" : "text-foreground")
              }
            >
              {pct}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function relativeTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  return `${mo}mo ago`;
}
