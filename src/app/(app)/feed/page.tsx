import Link from "next/link";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  follows,
  markets,
  predictions,
  user_category_scores,
  users,
} from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import {
  MarketCard,
  type MarketCardData,
} from "@/components/markets/market-card";

export const metadata = { title: "Feed" };

const FOLLOW_WINDOW_HOURS = 48;
const TRENDING_WINDOW_HOURS = 24;
const BOLD_CALL_THRESHOLD_LOW = 0.15;
const BOLD_CALL_THRESHOLD_HIGH = 0.85;
const BOLD_CALL_CATEGORY_SCORE_MIN = 1800;

export default async function FeedPage() {
  const me = await getCurrentProfile();
  if (!me) {
    return (
      <div className="mx-auto max-w-[720px] py-16 text-center">
        <h1 className="font-display text-display-sm text-foreground">
          Your feed lives here.
        </h1>
        <p className="mt-4 text-body-lg text-muted-foreground">
          Sign in to see calls from people you follow, trending markets, and
          bold calls in your categories.
        </p>
      </div>
    );
  }

  // Server-component reads of Date.now() are per-request, not per-render.
  // eslint-disable-next-line react-hooks/purity -- intentional in RSC
  const now = Date.now();
  const followCutoff = new Date(now - FOLLOW_WINDOW_HOURS * 3600_000);
  const trendingCutoff = new Date(now - TRENDING_WINDOW_HOURS * 3600_000);

  /* ---------------------------------------------------------------
     Lane 1: Recent calls from people I follow (last 48h).
  --------------------------------------------------------------- */
  const followLane = await db
    .select({
      pred_id: predictions.id,
      probability: predictions.probability,
      created_at: predictions.created_at,
      market_slug: markets.slug,
      market_title: markets.title,
      market_outcome: markets.outcome,
      market_resolved_at: markets.resolved_at,
      author_username: users.username,
      author_display_name: users.display_name,
    })
    .from(predictions)
    .innerJoin(markets, eq(predictions.market_id, markets.id))
    .innerJoin(users, eq(predictions.user_id, users.id))
    .innerJoin(follows, eq(follows.followee_id, predictions.user_id))
    .where(
      and(
        eq(follows.follower_id, me.id),
        gt(predictions.created_at, followCutoff),
      ),
    )
    .orderBy(desc(predictions.created_at))
    .limit(25);

  /* ---------------------------------------------------------------
     Lane 2: Trending markets I haven't called.
  --------------------------------------------------------------- */
  const myMarketIds = (
    await db
      .selectDistinctOn([predictions.market_id], {
        market_id: predictions.market_id,
      })
      .from(predictions)
      .where(eq(predictions.user_id, me.id))
  ).map((r) => r.market_id);

  // Filter to open, unresolved markets at the aggregate step so the
  // top-N count actually reflects markets you can still call. Without
  // this, resolved markets win the trending slots and the fallback
  // fires unnecessarily.
  const trendingRaw = await db
    .select({
      market_id: predictions.market_id,
      hot_count: sql<number>`COUNT(*)`.as("hot_count"),
    })
    .from(predictions)
    .innerJoin(markets, eq(predictions.market_id, markets.id))
    .where(
      and(
        gt(predictions.created_at, trendingCutoff),
        isNull(markets.resolved_at),
        gt(markets.closes_at, new Date()),
      ),
    )
    .groupBy(predictions.market_id)
    .orderBy(desc(sql`hot_count`))
    .limit(12);

  const candidateIds = trendingRaw
    .filter((r) => !myMarketIds.includes(r.market_id))
    .slice(0, 6)
    .map((r) => r.market_id);

  const trendingMarkets =
    candidateIds.length > 0
      ? await db
          .select()
          .from(markets)
          .where(
            and(inArray(markets.id, candidateIds), isNull(markets.resolved_at)),
          )
      : [];

  // Fallback: surface 6 open markets the user hasn't called, soonest-closing.
  const trendingFinal =
    trendingMarkets.length > 0
      ? trendingMarkets
      : await db
          .select()
          .from(markets)
          .where(
            and(
              myMarketIds.length > 0
                ? notInArray(markets.id, myMarketIds)
                : sql`true`,
              isNull(markets.resolved_at),
              gt(markets.closes_at, new Date()),
            ),
          )
          .orderBy(markets.closes_at)
          .limit(6);

  /* ---------------------------------------------------------------
     Lane 3: Bold calls — strong claims from strong forecasters.
  --------------------------------------------------------------- */
  const boldWindow = new Date(now - 7 * 24 * 3600_000);
  const boldCalls = await db
    .select({
      pred_id: predictions.id,
      probability: predictions.probability,
      created_at: predictions.created_at,
      market_slug: markets.slug,
      market_title: markets.title,
      category_slug: markets.category_slug,
      author_username: users.username,
      author_display_name: users.display_name,
      category_score: user_category_scores.score,
    })
    .from(predictions)
    .innerJoin(markets, eq(predictions.market_id, markets.id))
    .innerJoin(users, eq(predictions.user_id, users.id))
    .innerJoin(
      user_category_scores,
      and(
        eq(user_category_scores.user_id, predictions.user_id),
        eq(user_category_scores.category_slug, markets.category_slug),
      ),
    )
    .where(
      and(
        gt(predictions.created_at, boldWindow),
        gt(user_category_scores.score, BOLD_CALL_CATEGORY_SCORE_MIN),
        or(
          lte(predictions.probability, BOLD_CALL_THRESHOLD_LOW),
          gt(predictions.probability, BOLD_CALL_THRESHOLD_HIGH),
        ),
      ),
    )
    .orderBy(desc(predictions.created_at))
    .limit(6);

  return (
    <div className="mx-auto w-full max-w-[960px] py-10 sm:py-14 flex flex-col gap-14">
      <header>
        <p className="text-overline text-muted-foreground mb-3">your feed</p>
        <h1 className="font-display text-display-md sm:text-display-lg text-foreground -tracking-[0.035em]">
          What&apos;s moving.
        </h1>
      </header>

      <FeedSection title="Recent calls" eyebrow="people you follow">
        {followLane.length === 0 ? (
          <EmptyLane
            line={
              myMarketIds.length === 0
                ? "Find a couple of forecasters worth following."
                : "Quiet from the people you follow in the last 48h."
            }
            href="/leaderboard"
            cta="See the leaderboard →"
          />
        ) : (
          <ul className="flex flex-col">
            {followLane.map((row) => (
              <li
                key={row.pred_id}
                className="grid grid-cols-[1fr_64px_72px] sm:grid-cols-[1fr_120px_72px_72px] items-center gap-3 sm:gap-5 py-3 border-b border-border last:border-b-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/u/${row.author_username}`}
                    className="font-mono text-caption text-muted-foreground hover:text-foreground transition-colors"
                  >
                    @{row.author_username}
                  </Link>
                  <Link
                    href={`/markets/${row.market_slug}`}
                    className="block font-display text-body text-foreground hover:underline truncate"
                  >
                    {row.market_title}
                  </Link>
                </div>
                <span className="hidden sm:inline font-mono text-caption text-muted-foreground tabular-nums">
                  {relativeTime(row.created_at)}
                </span>
                <span
                  className={
                    "font-display text-headline tabular-nums text-right " +
                    (row.probability >= 0.5
                      ? "text-signal-positive"
                      : "text-foreground")
                  }
                >
                  {Math.round(row.probability * 100)}%
                </span>
                <ResolutionBadge
                  resolved_at={row.market_resolved_at}
                  outcome={row.market_outcome}
                />
              </li>
            ))}
          </ul>
        )}
      </FeedSection>

      <FeedSection title="Trending" eyebrow="markets to call">
        {trendingFinal.length === 0 ? (
          <EmptyLane line="No open markets need your call right now." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {trendingFinal.map((m) => (
              <MarketCard key={m.id} market={toCardData(m)} />
            ))}
          </div>
        )}
      </FeedSection>

      <FeedSection
        title="Bold calls"
        eyebrow="strong claims from strong forecasters"
      >
        {boldCalls.length === 0 ? (
          <EmptyLane line="No bold calls in your categories this week." />
        ) : (
          <ul className="flex flex-col">
            {boldCalls.map((row) => (
              <li
                key={row.pred_id}
                className="grid grid-cols-[1fr_72px_72px] items-center gap-4 py-3 border-b border-border last:border-b-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/u/${row.author_username}`}
                    className="font-mono text-caption text-muted-foreground hover:text-foreground"
                  >
                    @{row.author_username}
                  </Link>
                  <Link
                    href={`/markets/${row.market_slug}`}
                    className="block font-display text-body text-foreground hover:underline truncate"
                  >
                    {row.market_title}
                  </Link>
                </div>
                <span className="font-mono text-caption text-muted-foreground tabular-nums text-right">
                  {row.category_slug}
                </span>
                <span
                  className={
                    "font-display text-headline tabular-nums text-right " +
                    (row.probability >= 0.5
                      ? "text-signal-positive"
                      : "text-signal-negative")
                  }
                >
                  {Math.round(row.probability * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </FeedSection>
    </div>
  );
}

function toCardData(m: typeof markets.$inferSelect): MarketCardData {
  return {
    slug: m.slug,
    title: m.title,
    category_slug: m.category_slug,
    closes_at: m.closes_at,
    resolved_at: m.resolved_at,
    outcome: m.outcome as MarketCardData["outcome"],
    prediction_count: m.prediction_count,
    consensus_probability: m.consensus_probability,
  };
}

function FeedSection({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-headline text-foreground -tracking-[0.02em]">
          {title}
        </h2>
        <span className="text-overline text-muted-foreground">{eyebrow}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyLane({
  line,
  href,
  cta,
}: {
  line: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-10 px-6 flex flex-col items-center text-center gap-3">
      <p className="text-body-sm text-muted-foreground">{line}</p>
      {href && cta ? (
        <Link
          href={href}
          className="text-body-sm text-foreground font-medium hover:underline"
        >
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

function ResolutionBadge({
  resolved_at,
  outcome,
}: {
  resolved_at: Date | null;
  outcome: string | null;
}) {
  if (!resolved_at || !outcome) {
    return (
      <span className="hidden sm:inline-flex justify-self-end items-center px-2 py-0.5 rounded-full text-caption font-mono bg-muted text-muted-foreground">
        pending
      </span>
    );
  }
  if (outcome === "yes") {
    return (
      <span className="hidden sm:inline-flex justify-self-end items-center px-2 py-0.5 rounded-full text-caption font-mono bg-signal-positive-soft text-signal-positive">
        yes
      </span>
    );
  }
  if (outcome === "no") {
    return (
      <span className="hidden sm:inline-flex justify-self-end items-center px-2 py-0.5 rounded-full text-caption font-mono bg-signal-negative-soft text-signal-negative">
        no
      </span>
    );
  }
  return (
    <span className="hidden sm:inline-flex justify-self-end items-center px-2 py-0.5 rounded-full text-caption font-mono bg-muted text-muted-foreground">
      invalid
    </span>
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
  return `${d}d ago`;
}
