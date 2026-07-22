import Link from "next/link";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
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
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import {
  MarketCard,
  type MarketCardData,
} from "@/components/markets/market-card";
import { VOLUME_GATE } from "@/lib/scoring/score";

export const metadata = { title: "Feed" };

type Horizon = "daily" | "weekly" | "monthly" | "yearly" | "long-term";
const HORIZONS: Array<{ value: Horizon; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "long-term", label: "Long term" },
];

const FOLLOW_WINDOW_HOURS = 48;
const TRENDING_WINDOW_HOURS = 24;
const BOLD_CALL_THRESHOLD_LOW = 0.15;
const BOLD_CALL_THRESHOLD_HIGH = 0.85;
const BOLD_CALL_CATEGORY_SCORE_MIN = 1800;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ horizon?: string }>;
}) {
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
  const params = await searchParams;
  const horizon = HORIZONS.some((item) => item.value === params.horizon)
    ? (params.horizon as Horizon)
    : "yearly";
  const horizonCondition = getHorizonCondition(horizon, now);
  const followCutoff = new Date(now - FOLLOW_WINDOW_HOURS * 3600_000);
  const trendingCutoff = new Date(now - TRENDING_WINDOW_HOURS * 3600_000);

  /* ---------------------------------------------------------------
     Personal desk: the signed-in user's live record and open calls.
     Keep this server-rendered so the dashboard arrives complete and
     ships no client-side data-fetching bundle.
  --------------------------------------------------------------- */
  const [resolvedRows, ownOpenRows] = await Promise.all([
    db
      .select({
        count: sql<number>`COUNT(DISTINCT ${markets.id})`,
      })
      .from(predictions)
      .innerJoin(markets, eq(predictions.market_id, markets.id))
      .where(
        and(
          eq(predictions.user_id, me.id),
          isNotNull(markets.resolved_at),
          ne(markets.outcome, "invalid"),
          lt(predictions.created_at, markets.closes_at),
          lt(predictions.created_at, markets.resolved_at),
        ),
      ),
    db
      .select({
        prediction_id: predictions.id,
        probability: predictions.probability,
        created_at: predictions.created_at,
        market_id: markets.id,
        market_slug: markets.slug,
        market_title: markets.title,
        market_closes_at: markets.closes_at,
        market_resolves_at: markets.resolves_at,
      })
      .from(predictions)
      .innerJoin(markets, eq(predictions.market_id, markets.id))
      .where(
        and(
          eq(predictions.user_id, me.id),
          isNull(markets.resolved_at),
          lt(predictions.created_at, markets.closes_at),
        ),
      )
      .orderBy(desc(predictions.created_at))
      .limit(50),
  ]);

  const resolvedCount = Number(resolvedRows[0]?.count ?? 0);
  const seenOpenMarkets = new Set<string>();
  const openCalls = ownOpenRows
    .filter((row) => {
      if (seenOpenMarkets.has(row.market_id)) return false;
      seenOpenMarkets.add(row.market_id);
      return true;
    })
    .slice(0, 5);
  const pendingCount = seenOpenMarkets.size;
  const callsUntilRanked = Math.max(0, VOLUME_GATE - resolvedCount);

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
        ne(markets.discovery_state, "hidden"),
        lt(predictions.created_at, markets.closes_at),
        or(
          isNull(markets.resolved_at),
          lt(predictions.created_at, markets.resolved_at),
        ),
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
      .innerJoin(markets, eq(predictions.market_id, markets.id))
      .where(
        and(
          eq(predictions.user_id, me.id),
          lt(predictions.created_at, markets.closes_at),
          or(
            isNull(markets.resolved_at),
            lt(predictions.created_at, markets.resolved_at),
          ),
        ),
      )
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
        lt(predictions.created_at, markets.closes_at),
        isNull(markets.resolved_at),
        gt(markets.closes_at, new Date()),
        ne(markets.discovery_state, "hidden"),
        eq(markets.discovery_state, "featured"),
        horizonCondition,
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
              eq(markets.discovery_state, "featured"),
              horizonCondition,
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
        ne(markets.discovery_state, "hidden"),
        lt(predictions.created_at, markets.closes_at),
        or(
          isNull(markets.resolved_at),
          lt(predictions.created_at, markets.resolved_at),
        ),
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
    <div className="mx-auto w-full max-w-[960px] py-8 sm:py-12 flex flex-col gap-12 sm:gap-14">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-border pb-8">
        <div>
          <p className="text-overline text-muted-foreground mb-3">dashboard</p>
          <h1 className="font-display text-display-sm sm:text-display-md text-foreground -tracking-[0.03em]">
            Your forecasting desk.
          </h1>
          <p className="mt-3 text-body text-muted-foreground max-w-xl">
            Your record, the calls still in play, and the best next questions together.
          </p>
        </div>
        <Button asChild size="lg" className="self-start sm:self-auto rounded-full">
          <Link href="/markets">Make the next call</Link>
        </Button>
      </header>

      <section aria-label="Your record at a glance">
        <div className="grid grid-cols-1 sm:grid-cols-3 border-y border-border sm:divide-x divide-border">
          <DashboardStat
            label="Forecast score"
            value={resolvedCount >= VOLUME_GATE ? me.forecast_score.toLocaleString() : "Unranked"}
            note={
              resolvedCount >= VOLUME_GATE
                ? `${resolvedCount} resolved calls`
                : `${resolvedCount}/${VOLUME_GATE} resolved · ${callsUntilRanked} to unlock`
            }
          />
          <DashboardStat
            label="Calls in play"
            value={pendingCount.toLocaleString()}
            note={pendingCount === 1 ? "1 market awaiting an outcome" : `${pendingCount} markets awaiting outcomes`}
          />
          <DashboardStat
            label="Invitations"
            value={`${me.invite_credits}/5`}
            note="One unlocks on each new market"
          />
        </div>
      </section>

      <section className="grid gap-5 border-y border-border py-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-overline text-muted-foreground">
            {me.founding_member_number
              ? `founding forecaster #${me.founding_member_number}`
              : "founding forecaster program"}
          </p>
          <h2 className="mt-2 font-display text-headline text-foreground">
            {me.founding_member_number
              ? "Your founding place is permanent."
              : "Make three calls. Earn your founding number."}
          </h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Share a question with someone whose judgment you respect.
          </p>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link href="/invites">Invite or challenge</Link>
        </Button>
      </section>

      <FeedSection title="Your calls in play" eyebrow="latest call per market">
        {openCalls.length === 0 ? (
          <EmptyState
            variant="lane"
            title="Your desk is clear."
            body="Make a call now and it will stay here until the market resolves."
            cta={{ label: "Find a question", href: "/markets?status=open&sort=closing" }}
          />
        ) : (
          <ul className="rounded-2xl border border-border bg-surface overflow-hidden shadow-card">
            {openCalls.map((row) => {
              const isClosed = row.market_closes_at.getTime() <= now;
              return (
                <li
                  key={row.prediction_id}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_150px_88px] items-center gap-3 sm:gap-5 px-4 sm:px-5 py-4 border-b border-border last:border-b-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/markets/${row.market_slug}`}
                      className="block font-display font-semibold text-body text-foreground hover:underline truncate"
                    >
                      {row.market_title}
                    </Link>
                    <p className="mt-1 font-mono text-caption text-muted-foreground sm:hidden">
                      {isClosed ? "awaiting result" : `closes ${formatDeskDate(row.market_closes_at)}`}
                    </p>
                  </div>
                  <span className="hidden sm:inline font-mono text-caption text-muted-foreground text-right">
                    {isClosed ? `resolves ${formatDeskDate(row.market_resolves_at)}` : `closes ${formatDeskDate(row.market_closes_at)}`}
                  </span>
                  <span className="font-display text-headline text-foreground tabular-nums text-right">
                    {Math.round(row.probability * 100)}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </FeedSection>

      <FeedSection title="From people you follow" eyebrow="last 48 hours">
        {followLane.length === 0 ? (
          <EmptyState
            variant="lane"
            title={
              myMarketIds.length === 0
                ? "Nobody to follow yet."
                : "Quiet over there."
            }
            body={
              myMarketIds.length === 0
                ? "Find a couple of forecasters worth following. The leaderboard is a good place to start."
                : "No calls from the people you follow in the last 48 hours."
            }
            cta={{ label: "See the leaderboard", href: "/leaderboard" }}
          />
        ) : (
          <ul className="flex flex-col">
            {followLane.map((row) => (
              <li
                key={row.pred_id}
                className="grid grid-cols-[1fr_64px] sm:grid-cols-[1fr_120px_72px_72px] items-center gap-3 sm:gap-5 py-3 border-b border-border last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/u/${row.author_username}`}
                      className="font-mono text-caption text-muted-foreground hover:text-foreground transition-colors"
                    >
                      @{row.author_username}
                    </Link>
                    <span
                      className="sm:hidden font-mono text-caption text-muted-foreground tabular-nums"
                      aria-hidden
                    >
                      · {relativeTime(row.created_at)}
                    </span>
                  </div>
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
                <div className="flex items-center justify-end gap-2 sm:contents">
                  <ResolutionBadge
                    resolved_at={row.market_resolved_at}
                    outcome={row.market_outcome}
                  />
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </FeedSection>

      <FeedSection title="Make your next call" eyebrow="curated questions">
        <nav aria-label="Forecast horizon" className="mb-5 flex gap-1 overflow-x-auto pb-1">
          {HORIZONS.map((item) => (
            <Link
              key={item.value}
              href={`/feed?horizon=${item.value}`}
              className={`inline-flex h-9 shrink-0 items-center rounded-full px-4 text-body-sm transition-colors ${
                item.value === horizon
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {trendingFinal.length === 0 ? (
          <EmptyState
            variant="lane"
            title={`No ${horizonLabel(horizon).toLowerCase()} questions yet.`}
            body="The shelf is deliberately small. Try another time horizon."
            cta={{ label: "See all open markets", href: "/markets?status=open" }}
          />
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
          <EmptyState
            variant="lane"
            title="No bold takes this week."
            body="When a top forecaster calls above 85% or below 15%, it shows up here."
            cta={{ label: "See the leaderboard", href: "/leaderboard" }}
          />
        ) : (
          <ul className="flex flex-col">
            {boldCalls.map((row) => (
              <li
                key={row.pred_id}
                className="grid grid-cols-[1fr_64px] sm:grid-cols-[1fr_96px_72px] items-center gap-3 sm:gap-4 py-3 border-b border-border last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/u/${row.author_username}`}
                      className="font-mono text-caption text-muted-foreground hover:text-foreground"
                    >
                      @{row.author_username}
                    </Link>
                    <span
                      className="sm:hidden font-mono text-caption text-muted-foreground"
                      aria-hidden
                    >
                      · {row.category_slug}
                    </span>
                  </div>
                  <Link
                    href={`/markets/${row.market_slug}`}
                    className="block font-display text-body text-foreground hover:underline truncate"
                  >
                    {row.market_title}
                  </Link>
                </div>
                <span className="hidden sm:inline font-mono text-caption text-muted-foreground tabular-nums text-right">
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

function DashboardStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="py-5 sm:px-6 first:sm:pl-0 last:sm:pr-0 border-b sm:border-b-0 border-border last:border-b-0">
      <p className="text-overline text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-headline text-foreground tabular-nums">{value}</p>
      <p className="mt-1 text-caption text-muted-foreground">{note}</p>
    </div>
  );
}

function formatDeskDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function ResolutionBadge({
  resolved_at,
  outcome,
}: {
  resolved_at: Date | null;
  outcome: string | null;
}) {
  const tone =
    !resolved_at || !outcome
      ? {
          label: "pending",
          dot: "bg-muted-foreground/50",
          pill: "bg-muted text-muted-foreground",
        }
      : outcome === "yes"
        ? {
            label: "yes",
            dot: "bg-signal-positive",
            pill: "bg-signal-positive-soft text-signal-positive",
          }
        : outcome === "no"
          ? {
              label: "no",
              dot: "bg-signal-negative",
              pill: "bg-signal-negative-soft text-signal-negative",
            }
          : {
              label: "invalid",
              dot: "bg-muted-foreground/50",
              pill: "bg-muted text-muted-foreground",
            };

  return (
    <>
      <span
        aria-label={`status: ${tone.label}`}
        className={`sm:hidden inline-block size-2.5 rounded-full shrink-0 ${tone.dot}`}
      />
      <span
        className={`hidden sm:inline-flex justify-self-end items-center px-2 py-0.5 rounded-full text-caption font-mono ${tone.pill}`}
      >
        {tone.label}
      </span>
    </>
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

function getHorizonCondition(horizon: Horizon, now: number) {
  const after = (days: number) => new Date(now + days * 24 * 60 * 60 * 1000);
  switch (horizon) {
    case "daily":
      return lte(markets.closes_at, after(1));
    case "weekly":
      return and(gt(markets.closes_at, after(1)), lte(markets.closes_at, after(7)));
    case "monthly":
      return and(gt(markets.closes_at, after(7)), lte(markets.closes_at, after(31)));
    case "yearly":
      return and(gt(markets.closes_at, after(31)), lte(markets.closes_at, after(365)));
    case "long-term":
      return gt(markets.closes_at, after(365));
  }
}

function horizonLabel(horizon: Horizon) {
  return HORIZONS.find((item) => item.value === horizon)?.label ?? "Open";
}
