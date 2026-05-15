import { and, desc, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import {
  follows,
  markets,
  predictions,
  users,
} from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { ForecastScoreHero } from "@/components/profile/forecast-score-hero";
import { FollowButton } from "@/components/profile/follow-button";
import { VOLUME_GATE } from "@/lib/scoring/score";

type Params = { username: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const ogImage = `/api/share/user/${username}`;
  return {
    title: `@${username}`,
    openGraph: {
      title: `@${username} · forecast.social`,
      images: [{ url: ogImage, width: 1080, height: 1080 }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `@${username} · forecast.social`,
      images: [ogImage],
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!profile) notFound();

  const me = await getCurrentProfile();
  const isOwn = me?.id === profile.id;

  // Follower / following counts and the viewer's relationship to this
  // profile. All three queries are tiny — index hits on (followee_id)
  // and the composite PK.
  const [followerAgg] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(follows)
    .where(eq(follows.followee_id, profile.id));
  const followerCount = Number(followerAgg?.count ?? 0);

  const [followingAgg] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(follows)
    .where(eq(follows.follower_id, profile.id));
  const followingCount = Number(followingAgg?.count ?? 0);

  let viewerFollows = false;
  if (me && !isOwn) {
    const [existing] = await db
      .select({ follower_id: follows.follower_id })
      .from(follows)
      .where(
        and(
          eq(follows.follower_id, me.id),
          eq(follows.followee_id, profile.id),
        ),
      )
      .limit(1);
    viewerFollows = !!existing;
  }

  // Resolved-prediction count gates the public Forecast Score. Only
  // counts non-invalid resolved markets, matching SCORING.md §8.
  const [resolvedAgg] = await db
    .select({
      resolved_count: sql<number>`COUNT(DISTINCT ${markets.id})`.as("resolved_count"),
    })
    .from(predictions)
    .innerJoin(markets, eq(predictions.market_id, markets.id))
    .where(
      and(
        eq(predictions.user_id, profile.id),
        isNotNull(markets.resolved_at),
        ne(markets.outcome, "invalid"),
      ),
    );
  const resolvedCount = Number(resolvedAgg?.resolved_count ?? 0);

  // Rank: dense rank over users.forecast_score desc among ranked users.
  // We pull the user's rank only if they're ranked themselves.
  let rank: number | null = null;
  let totalRanked = 0;
  const isRanked = resolvedCount >= VOLUME_GATE && profile.forecast_score > 0;
  if (isRanked) {
    const [totalAgg] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(gt(users.forecast_score, 0));
    totalRanked = Number(totalAgg?.count ?? 0);
    const [rankAgg] = await db
      .select({ rank: sql<number>`COUNT(*) + 1` })
      .from(users)
      .where(gt(users.forecast_score, profile.forecast_score));
    rank = Number(rankAgg?.rank ?? 1);
  }

  // Profile prediction history — pulls the latest 25 calls across all
  // markets, with the market title + consensus snapshot for context.
  // Status pill derives from the market state: resolved + outcome
  // versus the user's call gives correct/missed; otherwise pending.
  const history = await db
    .select({
      id: predictions.id,
      probability: predictions.probability,
      consensus_at_time: predictions.consensus_at_time,
      created_at: predictions.created_at,
      market_slug: markets.slug,
      market_title: markets.title,
      market_outcome: markets.outcome,
      market_resolved_at: markets.resolved_at,
    })
    .from(predictions)
    .innerJoin(markets, eq(predictions.market_id, markets.id))
    .where(eq(predictions.user_id, profile.id))
    .orderBy(desc(predictions.created_at))
    .limit(25);

  return (
    <div className="max-w-2xl">
      {/* ============================================================
          Identity row
      ============================================================ */}
      <section className="flex items-start gap-5 sm:gap-7">
        <Avatar className="size-20 sm:size-24 rounded-md border border-border-strong shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="size-full object-cover rounded-md"
            />
          ) : (
            <AvatarFallback className="rounded-md bg-muted text-foreground font-display text-display-sm">
              {getInitials(profile.display_name)}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-headline sm:text-display-sm text-foreground leading-[1.05]">
                {profile.display_name}
              </h1>
              <p className="font-mono text-body-sm text-muted-foreground mt-1">
                @{profile.username}
              </p>
            </div>
            {me && !isOwn ? (
              <FollowButton
                targetUserId={profile.id}
                initialIsFollowing={viewerFollows}
              />
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-4 text-body-sm text-muted-foreground">
            <span>
              <span className="font-mono text-foreground tabular-nums">
                {followerCount.toLocaleString()}
              </span>{" "}
              followers
            </span>
            <span>
              <span className="font-mono text-foreground tabular-nums">
                {followingCount.toLocaleString()}
              </span>{" "}
              following
            </span>
          </div>
          {profile.bio ? (
            <p className="mt-3 text-body text-foreground/90 max-w-lg">
              {profile.bio}
            </p>
          ) : null}
        </div>
      </section>

      {/* ============================================================
          Forecast Score — Unranked until ≥ 5 resolved predictions
          (SCORING.md §8).
      ============================================================ */}
      <ForecastScoreHero
        score={profile.forecast_score}
        rank={rank}
        totalRanked={totalRanked}
        resolvedCount={resolvedCount}
        currentStreak={profile.current_streak}
        longestStreak={profile.longest_streak}
        isOwn={isOwn}
      />

      {/* ============================================================
          Prediction history
      ============================================================ */}
      <section className="mt-10 sm:mt-12 border-t border-border pt-8">
        <div className="flex items-baseline justify-between mb-5">
          <p className="text-overline text-muted-foreground">recent calls</p>
          {history.length > 0 ? (
            <span className="font-mono text-caption text-muted-foreground tabular-nums">
              latest {history.length}
            </span>
          ) : null}
        </div>
        {history.length === 0 ? (
          <div className="flex flex-col gap-3 max-w-lg">
            <p className="font-display text-title text-foreground">
              No calls yet.
            </p>
            <p className="text-body-sm text-muted-foreground">
              {isOwn
                ? "When you make a prediction, it'll appear here permanently. No edits, no takebacks."
                : `When @${profile.username} makes a prediction, it'll appear here.`}
            </p>
            {isOwn ? (
              <Button
                asChild
                variant="ghost"
                className="self-start px-0 hover:bg-transparent hover:underline underline-offset-4"
              >
                <Link href="/markets">Browse markets →</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="rounded-2xl border border-border bg-surface overflow-hidden">
            {history.map((row) => {
              const callPct = Math.round(row.probability * 100);
              const consensusPct =
                row.consensus_at_time != null
                  ? Math.round(row.consensus_at_time * 100)
                  : null;
              const status = deriveCallStatus(
                row.probability,
                row.market_outcome,
                row.market_resolved_at,
              );
              return (
                <li
                  key={row.id}
                  className="grid grid-cols-[1fr_72px_72px] sm:grid-cols-[1fr_88px_88px_96px_72px] items-center gap-3 sm:gap-5 px-5 py-4 border-b border-border last:border-b-0"
                >
                  <Link
                    href={`/markets/${row.market_slug}`}
                    className="font-display text-body text-foreground hover:underline truncate"
                  >
                    {row.market_title}
                  </Link>
                  <span className="hidden sm:inline font-mono text-caption text-muted-foreground tabular-nums">
                    {consensusPct != null ? `consensus ${consensusPct}%` : "—"}
                  </span>
                  <span
                    className={
                      "font-display text-headline tabular-nums text-right " +
                      (callPct >= 50 ? "text-signal-positive" : "text-foreground")
                    }
                  >
                    {callPct}%
                  </span>
                  <CallStatusPill status={status} />
                  {status === "correct" ? (
                    <a
                      href={`/api/share/prediction/${row.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:inline-flex items-center justify-center px-2 py-1 rounded-full text-caption font-mono bg-muted text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      share ↗
                    </a>
                  ) : (
                    <span aria-hidden className="hidden sm:inline" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

type CallStatus = "pending" | "correct" | "missed" | "invalid";

function deriveCallStatus(
  probability: number,
  outcome: string | null,
  resolvedAt: Date | null,
): CallStatus {
  if (!resolvedAt || !outcome) return "pending";
  if (outcome === "invalid") return "invalid";
  // "Correct" if the user leaned the same way as the resolution.
  // For a binary market, leaning ≥50% on Yes when Yes resolved = correct.
  const leanedYes = probability >= 0.5;
  if (outcome === "yes" && leanedYes) return "correct";
  if (outcome === "no" && !leanedYes) return "correct";
  return "missed";
}

function CallStatusPill({ status }: { status: CallStatus }) {
  const map = {
    pending: {
      label: "pending",
      className: "bg-muted text-muted-foreground",
    },
    correct: {
      label: "correct",
      className: "bg-signal-positive-soft text-signal-positive",
    },
    missed: {
      label: "missed",
      className: "bg-signal-negative-soft text-signal-negative",
    },
    invalid: {
      label: "invalid",
      className: "bg-muted text-muted-foreground",
    },
  } as const;
  const { label, className } = map[status];
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-caption font-mono ${className}`}
    >
      {label}
    </span>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
