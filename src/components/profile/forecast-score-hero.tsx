import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * The killer artifact on every profile per PRD §6 and DESIGN.md §6
 * "Forecast Score (the brand asset)". Big Geist 800 number with /3000,
 * exact static score, Top-X% pill if applicable, and streak in green.
 * Falls back to "Unranked" before the volume gate.
 */
export function ForecastScoreHero({
  score,
  rank,
  totalRanked,
  resolvedCount,
  currentStreak,
  longestStreak,
  isOwn,
}: {
  score: number;
  rank: number | null;
  totalRanked: number;
  resolvedCount: number;
  currentStreak: number;
  longestStreak: number;
  isOwn: boolean;
}) {
  const isRanked = rank != null && totalRanked > 0;
  const pct = isRanked ? rank / totalRanked : null;
  const topBand = bandFor(pct);

  if (resolvedCount < 5) {
    return (
      <section className="mt-10 sm:mt-12 border-t border-border pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-overline text-muted-foreground">forecast score</p>
          {isOwn ? (
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link href="/settings">Edit profile</Link>
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex items-end gap-4">
          <span className="font-display text-display-md text-muted-foreground">
            Unranked
          </span>
        </div>
        <p className="mt-3 text-body-sm text-muted-foreground max-w-md">
          A Forecast Score appears here after{" "}
          <span className="font-mono text-foreground">5</span> resolved
          predictions.{" "}
          <span className="font-mono text-foreground">{resolvedCount}</span> so
          far.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 sm:mt-12 border-t border-border pt-8">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="text-overline text-muted-foreground">forecast score</p>
        {isOwn ? (
          <Button asChild variant="ghost" size="sm" className="-mr-2">
            <Link href="/settings">Edit profile</Link>
          </Button>
        ) : null}
      </div>

      <div className="flex items-baseline gap-3">
        <span className="font-display font-extrabold text-foreground text-display-lg sm:text-display-xl leading-none tabular-nums">
          {score.toLocaleString()}
        </span>
        <span className="font-mono text-body-sm text-muted-foreground tabular-nums">
          / 3,000
        </span>
      </div>

      {/* Three pills, one visual treatment — was three different shapes
          (accent pill, plain green, plain muted) stacked side-by-side
          looking like three design eras. Now all rounded-full with
          muted bg, color only on the foreground text. */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {topBand ? (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-foreground/8 text-foreground text-body-sm font-semibold tracking-tight tabular-nums">
            {topBand}
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-body-sm font-medium tabular-nums">
            Rank {rank?.toLocaleString()} / {totalRanked.toLocaleString()}
          </span>
        )}
        {currentStreak > 0 ? (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-signal-positive-soft text-signal-positive text-body-sm font-medium tabular-nums">
            {currentStreak}-call streak
          </span>
        ) : longestStreak > 0 ? (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-body-sm font-medium tabular-nums">
            best streak {longestStreak}
          </span>
        ) : null}
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-body-sm font-medium tabular-nums">
          {resolvedCount} resolved
        </span>
      </div>
    </section>
  );
}

function bandFor(pct: number | null): string | null {
  if (pct == null) return null;
  if (pct <= 0.01) return "Top 1%";
  if (pct <= 0.05) return "Top 5%";
  if (pct <= 0.1) return "Top 10%";
  if (pct <= 0.25) return "Top 25%";
  return null;
}
