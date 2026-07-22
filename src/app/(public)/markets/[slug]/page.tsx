import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  categories,
  comment_upvotes,
  comments,
  markets,
  predictions,
  users,
} from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ConsensusSparkline } from "@/components/markets/consensus-sparkline";
import { LiveConsensus } from "@/components/markets/live-consensus";
import { PredictionSlider } from "@/components/markets/prediction-slider";
import { PredictionsTimeline } from "@/components/markets/predictions-timeline";
import { ResolveMarketPanel } from "@/components/admin/resolve-market-panel";
import {
  CommentsSection,
  type CommentRow,
} from "@/components/markets/comments-section";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [m] = await db
    .select({
      title: markets.title,
      description: markets.description,
    })
    .from(markets)
    .where(eq(markets.slug, slug))
    .limit(1);
  if (!m) return { title: "Market" };
  const ogImage = `/api/share/market/${slug}`;
  return {
    title: m.title,
    description: m.description.slice(0, 160),
    openGraph: {
      title: m.title,
      description: m.description.slice(0, 160),
      images: [{ url: ogImage, width: 1080, height: 1080 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description.slice(0, 160),
      images: [ogImage],
    },
  };
}

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  const [marketRow] = await db
    .select({
      market: markets,
      category_name: categories.name,
      author_username: users.username,
      author_display_name: users.display_name,
    })
    .from(markets)
    .leftJoin(categories, eq(markets.category_slug, categories.slug))
    .leftJoin(users, eq(markets.created_by, users.id))
    .where(eq(markets.slug, slug))
    .limit(1);

  if (!marketRow) {
    notFound();
  }
  const { market, category_name, author_username } = marketRow;

  const [timeline, sparklinePoints, profile] = await Promise.all([
    db
      .select({
        id: predictions.id,
        probability: predictions.probability,
        created_at: predictions.created_at,
        user_handle: users.username,
        user_display_name: users.display_name,
        user_avatar_url: users.avatar_url,
      })
      .from(predictions)
      .innerJoin(users, eq(predictions.user_id, users.id))
      .where(eq(predictions.market_id, market.id))
      .orderBy(desc(predictions.created_at))
      .limit(25),
    buildConsensusSeries(market.id),
    getCurrentProfile(),
  ]);

  // Pre-position the slider and load discussion in parallel once viewer
  // identity is known.
  const [myLatestRows, commentRows] = await Promise.all([
    profile != null
      ? db
            .select({
              id: predictions.id,
              probability: predictions.probability,
              created_at: predictions.created_at,
            })
            .from(predictions)
            .where(
              and(
                eq(predictions.market_id, market.id),
                eq(predictions.user_id, profile.id),
              ),
            )
            .orderBy(desc(predictions.created_at))
            .limit(1)
      : Promise.resolve([]),
    loadComments(market.id, profile?.id),
  ]);
  const myLatest = myLatestRows[0] ?? null;

  const consensusPct =
    market.consensus_probability != null
      ? Math.round(market.consensus_probability * 100)
      : null;

  // Server-component reads of Date.now() are per-request, not per-render.
  // eslint-disable-next-line react-hooks/purity -- intentional in RSC
  const now = Date.now();
  const closesMs = new Date(market.closes_at).getTime();
  const isClosed = closesMs <= now;
  const resolved = market.resolved_at != null;
  const canPredict = !!profile && !isClosed && !resolved;

  const initialSliderValue =
    myLatest != null
      ? Math.round(myLatest.probability * 100)
      : market.consensus_probability != null
        ? Math.round(market.consensus_probability * 100)
        : 50;

  const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  const marketLd = {
    "@context": "https://schema.org",
    "@type": "Question",
    name: market.title,
    text: market.description,
    url: `${baseUrl}/markets/${market.slug}`,
    dateCreated: market.created_at,
    answerCount: market.prediction_count,
    ...(market.resolved_at && market.outcome
      ? {
          acceptedAnswer: {
            "@type": "Answer",
            text: market.outcome,
            dateCreated: market.resolved_at,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto w-full max-w-[960px] py-10 sm:py-14">
      <JsonLd data={marketLd} />
      <Link
        href="/markets"
        className="inline-flex items-center text-body-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        ← All markets
      </Link>

      <header className="border-b border-border pb-10 mb-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-overline text-muted-foreground">
            {category_name ?? market.category_slug}
          </span>
          <StatusPill
            resolved={resolved}
            outcome={market.outcome}
            closesAt={market.closes_at}
          />
        </div>

        <h1 className="font-display font-extrabold text-foreground text-display-sm sm:text-display-md leading-[1] -tracking-[0.03em]">
          {market.title}
        </h1>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-overline text-muted-foreground">consensus</p>
            <p className="mt-2 font-display text-headline tabular-nums text-foreground">
              {resolved ? (
                consensusPct != null ? (
                  `${consensusPct}%`
                ) : (
                  "—"
                )
              ) : (
                <LiveConsensus
                  marketId={market.id}
                  initialConsensus={market.consensus_probability}
                  initialPredictionCount={market.prediction_count}
                  renderMode="consensus"
                />
              )}
            </p>
          </div>
          <div>
            <p className="text-overline text-muted-foreground">calls</p>
            <p className="mt-2 font-display text-headline tabular-nums text-foreground">
              {resolved ? (
                market.prediction_count.toLocaleString()
              ) : (
                <LiveConsensus
                  marketId={market.id}
                  initialConsensus={market.consensus_probability}
                  initialPredictionCount={market.prediction_count}
                  renderMode="count"
                />
              )}
            </p>
          </div>
          <Stat
            label="closes"
            value={formatDate(market.closes_at)}
            tone={isClosed ? "muted" : "foreground"}
          />
          <Stat
            label="resolves"
            value={formatDate(market.resolves_at)}
            tone="muted"
          />
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14">
        <div className="order-2 lg:order-1 lg:col-span-7">
          <p className="text-overline text-muted-foreground mb-4">about</p>
          <div className="text-body-lg text-foreground leading-[1.6] whitespace-pre-wrap">
            {market.description}
          </div>

          {market.resolution_source ? (
            <div className="mt-8 border-t border-border pt-6">
              <p className="text-overline text-muted-foreground mb-2">
                resolution source
              </p>
              <Link
                href={market.resolution_source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-body-sm text-foreground underline underline-offset-4 hover:text-accent transition-colors break-all"
              >
                {market.resolution_source}
              </Link>
            </div>
          ) : null}

          {author_username ? (
            <p className="mt-8 text-caption text-muted-foreground">
              Posted by{" "}
              <Link
                href={`/u/${author_username}`}
                className="font-mono text-foreground hover:underline"
              >
                @{author_username}
              </Link>
            </p>
          ) : null}
        </div>

        <aside className="order-1 self-start lg:order-2 lg:col-span-5 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-overline text-muted-foreground">
                consensus · {market.prediction_count > 0 ? "live" : "no calls yet"}
              </p>
              <ConsensusSparkline
                className="h-16"
                points={sparklinePoints}
              />
            </div>

            <div className="border-t border-border pt-6">
              {!profile ? (
                <SignInPrompt />
              ) : (
                <PredictionSlider
                  marketId={market.id}
                  initialValue={initialSliderValue}
                  consensus={market.consensus_probability}
                  hasPrevious={!!myLatest}
                  disabled={!canPredict}
                  disabledReason={
                    resolved
                      ? "This market has resolved."
                      : isClosed
                        ? "This market has closed."
                        : undefined
                  }
                />
              )}
            </div>

            {profile?.is_admin ? (
              <ResolveMarketPanel
                marketId={market.id}
                alreadyResolved={resolved}
              />
            ) : null}
          </div>
        </aside>
      </section>

      <section className="border-t border-border pt-10">
        <div className="flex items-baseline justify-between mb-5">
          <p className="text-overline text-muted-foreground">
            recent predictions
          </p>
          {timeline.length > 0 ? (
            <span className="font-mono text-caption text-muted-foreground tabular-nums">
              latest {timeline.length}
            </span>
          ) : null}
        </div>
        <PredictionsTimeline entries={timeline} />
      </section>

      <CommentsSection
        marketId={market.id}
        isSignedIn={!!profile}
        comments={commentRows}
      />
    </div>
  );
}

async function loadComments(
  marketId: string,
  myId: string | undefined,
): Promise<CommentRow[]> {
  // Top-level comments + replies, joined to author, sorted: tops by
  // upvote_count desc + created_at desc, replies inline by created_at
  // ascending. We sort in JS after loading since the result set is
  // small and the order on replies is straightforward.
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      upvote_count: comments.upvote_count,
      created_at: comments.created_at,
      parent_id: comments.parent_id,
      user_username: users.username,
      user_display_name: users.display_name,
      user_avatar_url: users.avatar_url,
    })
    .from(comments)
    .innerJoin(users, eq(comments.user_id, users.id))
    .where(eq(comments.market_id, marketId));

  let upvotedSet = new Set<string>();
  if (myId && rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const myVotes = await db
      .select({ comment_id: comment_upvotes.comment_id })
      .from(comment_upvotes)
      .where(
        and(
          eq(comment_upvotes.user_id, myId),
          inArray(comment_upvotes.comment_id, ids),
        ),
      );
    upvotedSet = new Set(myVotes.map((v) => v.comment_id));
  }

  const enriched: CommentRow[] = rows.map((r) => ({
    ...r,
    upvoted_by_me: upvotedSet.has(r.id),
  }));

  enriched.sort((a, b) => {
    // Top-levels first, sort by upvotes desc then created_at desc.
    if (!a.parent_id && !b.parent_id) {
      if (b.upvote_count !== a.upvote_count)
        return b.upvote_count - a.upvote_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    // Replies inline asc by created.
    if (a.parent_id && b.parent_id) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    // Mixed: top before reply for stability.
    return a.parent_id ? 1 : -1;
  });

  return enriched;
}

/**
 * Walk all predictions on a market chronologically, maintain a running
 * "latest call per user" map, and sample the consensus at 12 evenly
 * spaced points across the lifespan. Returns 0-1 values for the
 * sparkline.
 *
 * No predictions yet → returns null so the sparkline renders its flat
 * fallback.
 */
async function buildConsensusSeries(
  marketId: string,
): Promise<number[] | undefined> {
  const rows = await db
    .select({
      user_id: predictions.user_id,
      probability: predictions.probability,
      created_at: predictions.created_at,
    })
    .from(predictions)
    .where(eq(predictions.market_id, marketId))
    .orderBy(asc(predictions.created_at));

  if (rows.length === 0) return undefined;

  const series: number[] = [];
  const latest = new Map<string, number>();
  for (const row of rows) {
    latest.set(row.user_id, row.probability);
    const avg =
      Array.from(latest.values()).reduce((s, v) => s + v, 0) / latest.size;
    series.push(avg);
  }

  // Down/up-sample to 12 evenly spaced points so the SVG path is concise.
  const target = 12;
  if (series.length <= target) {
    if (series.length === 1) return [series[0], series[0]];
    return series;
  }
  const step = (series.length - 1) / (target - 1);
  const sampled: number[] = [];
  for (let i = 0; i < target; i++) {
    sampled.push(series[Math.round(i * step)]);
  }
  return sampled;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "foreground" | "muted";
}) {
  return (
    <div>
      <p className="text-overline text-muted-foreground">{label}</p>
      <p
        className={`mt-2 font-display text-headline tabular-nums ${
          tone === "foreground" ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  resolved,
  outcome,
  closesAt,
}: {
  resolved: boolean;
  outcome: string | null;
  closesAt: Date;
}) {
  if (resolved && outcome) {
    const tone =
      outcome === "yes"
        ? "bg-signal-positive-soft text-signal-positive"
        : outcome === "no"
          ? "bg-signal-negative-soft text-signal-negative"
          : "bg-muted text-muted-foreground";
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-mono ${tone}`}
      >
        Resolved · {outcome}
      </span>
    );
  }
  // eslint-disable-next-line react-hooks/purity -- intentional in RSC
  if (new Date(closesAt).getTime() < Date.now()) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-mono bg-muted text-muted-foreground">
        Closed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-mono bg-accent/12 text-accent">
      Open
    </span>
  );
}

function SignInPrompt() {
  return (
    <div className="relative flex flex-col gap-5">
      {/* Faded preview of the slider behind the CTA — shows what
          you'll get to use once you're signed in. */}
      <div
        aria-hidden
        className="opacity-40 pointer-events-none flex flex-col gap-3"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-overline text-muted-foreground">
            your call
          </span>
        </div>
        <div className="font-display font-extrabold text-foreground text-display-md tabular-nums tracking-[-0.03em] leading-none">
          50%
        </div>
        <div className="relative h-6 flex items-center">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-foreground"
            style={{ left: 0, width: "50%" }}
          />
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-6 rounded-full bg-foreground border-2 border-background" style={{ left: "50%" }} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-body-sm text-muted-foreground">
          Calls are permanent and feed your Forecast Score. Sign in to
          drag this slider for real.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full px-6 flex-1 justify-center"
          >
            <Link href="/sign-up">Get started</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-12 rounded-full px-6"
          >
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(d));
}
