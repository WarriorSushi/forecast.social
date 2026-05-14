import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { categories, markets, users } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { ConsensusSparkline } from "@/components/markets/consensus-sparkline";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [m] = await db
    .select({ title: markets.title })
    .from(markets)
    .where(eq(markets.slug, slug))
    .limit(1);
  return { title: m?.title ?? "Market" };
}

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const rows = await db
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

  if (rows.length === 0) {
    notFound();
  }
  const { market, category_name, author_username } = rows[0];

  const consensusPct =
    market.consensus_probability != null
      ? Math.round(market.consensus_probability * 100)
      : null;

  const now = Date.now();
  const closesMs = new Date(market.closes_at).getTime();
  const isClosed = closesMs <= now;
  const resolved = market.resolved_at != null;

  return (
    <div className="mx-auto w-full max-w-[960px] py-10 sm:py-14">
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
          <Stat
            label="consensus"
            value={consensusPct != null ? `${consensusPct}%` : "—"}
            tone="foreground"
          />
          <Stat
            label="calls"
            value={market.prediction_count.toLocaleString()}
            tone="foreground"
          />
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

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
        <div className="lg:col-span-7">
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

        <aside className="lg:col-span-5">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 flex flex-col gap-5">
            <p className="text-overline text-muted-foreground">consensus · 90d</p>
            <ConsensusSparkline className="h-16" />
            <Button
              size="lg"
              disabled
              className="h-12 rounded-full"
              aria-disabled
              title="Predictions land in Phase 3"
            >
              Lock in your call
            </Button>
            <p className="text-caption text-muted-foreground">
              The slider opens in Phase 3. For now, browse and follow.
            </p>
          </div>
        </aside>
      </section>

      <section className="border-t border-border pt-10">
        <p className="text-overline text-muted-foreground mb-4">
          recent predictions
        </p>
        <div className="rounded-2xl border border-dashed border-border py-12 px-6 flex flex-col items-center text-center">
          <p className="font-display text-headline text-muted-foreground">
            No calls yet.
          </p>
          <p className="mt-2 text-body-sm text-muted-foreground max-w-md">
            Predictions appear here as forecasters lock them in. The first
            call belongs to whoever shows up first.
          </p>
        </div>
      </section>
    </div>
  );
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

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(d));
}
