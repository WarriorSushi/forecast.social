import Link from "next/link";
import { and, asc, desc, isNull, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { markets } from "@/lib/db/schema";
import { CreateMarketForm } from "@/components/admin/create-market-form";
import { EmptyState } from "@/components/app/empty-state";

export const metadata = { title: "Admin · Markets" };

export default async function AdminMarketsPage() {
  const currentTime = new Date();
  const selection = {
    id: markets.id,
    slug: markets.slug,
    title: markets.title,
    category_slug: markets.category_slug,
    closes_at: markets.closes_at,
    resolved_at: markets.resolved_at,
    outcome: markets.outcome,
    created_at: markets.created_at,
  };

  const [rows, awaitingResolution] = await Promise.all([
    db
      .select(selection)
      .from(markets)
      .orderBy(desc(markets.created_at))
      .limit(100),
    db
      .select(selection)
      .from(markets)
      .where(
        and(isNull(markets.resolved_at), lte(markets.closes_at, currentTime)),
      )
      .orderBy(asc(markets.closes_at)),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1080px] py-10 sm:py-14 flex flex-col gap-12">
      <header>
        <p className="text-overline text-muted-foreground mb-4">
          admin · markets
        </p>
        <h1 className="font-display text-headline sm:text-display-sm text-foreground -tracking-[0.02em]">
          Create a market.
        </h1>
        <p className="mt-3 text-body-lg text-muted-foreground max-w-xl">
          New markets appear publicly the moment they&apos;re saved. Pick
          clean resolution sources. Phrase questions so a future reader
          knows exactly what Yes and No mean.
        </p>
      </header>

      <section>
        <CreateMarketForm />
      </section>

      {awaitingResolution.length > 0 ? (
        <section className="rounded-2xl border border-border-strong bg-muted/50 p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-overline text-muted-foreground mb-2">
                action required
              </p>
              <h2 className="font-display text-headline text-foreground">
                Resolve closed markets.
              </h2>
            </div>
            <span className="font-mono text-headline tabular-nums text-foreground">
              {awaitingResolution.length}
            </span>
          </div>
          <ul>
            {awaitingResolution.map((market) => (
              <li
                key={market.id}
                className="flex items-center justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-body font-medium text-foreground">
                    {market.title}
                  </p>
                  <p className="font-mono text-caption text-muted-foreground">
                    closed {formatDate(market.closes_at)}
                  </p>
                </div>
                <Link
                  href={`/markets/${market.slug}`}
                  className="shrink-0 text-body-sm font-medium text-foreground hover:underline"
                >
                  Resolve →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex items-end justify-between border-b border-border pb-4 mb-6">
          <h2 className="font-display text-headline text-foreground">
            Existing markets
          </h2>
          <span className="font-mono text-caption text-muted-foreground tabular-nums">
            {rows.length} total
          </span>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            variant="lane"
            title="No markets yet."
            body="The form above adds the first one. After that, every market lands here for editing or resolving."
          />
        ) : (
          <ul className="flex flex-col">
            {rows.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[1fr_72px] sm:grid-cols-[1fr_120px_120px_80px] gap-4 items-center py-3 border-b border-border last:border-b-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/markets/${m.slug}`}
                    className="font-display text-body text-foreground hover:underline truncate block"
                  >
                    {m.title}
                  </Link>
                  <p className="text-caption text-muted-foreground font-mono truncate">
                    /{m.slug}
                  </p>
                </div>
                <span className="hidden sm:inline text-caption text-muted-foreground font-mono uppercase tracking-wider">
                  {m.category_slug}
                </span>
                <span className="hidden sm:inline text-caption text-muted-foreground font-mono tabular-nums">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  }).format(new Date(m.closes_at))}
                </span>
                <StatusPill
                  resolvedAt={m.resolved_at}
                  outcome={m.outcome}
                  closesAt={m.closes_at}
                  now={currentTime}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusPill({
  resolvedAt,
  outcome,
  closesAt,
  now,
}: {
  resolvedAt: Date | null;
  outcome: string | null;
  closesAt: Date;
  now: Date;
}) {
  if (resolvedAt && outcome) {
    const tone =
      outcome === "yes"
        ? "bg-signal-positive-soft text-signal-positive"
        : outcome === "no"
          ? "bg-signal-negative-soft text-signal-negative"
          : "bg-muted text-muted-foreground";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-mono ${tone}`}
      >
        {outcome}
      </span>
    );
  }
  if (new Date(closesAt).getTime() < now.getTime()) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-mono bg-muted text-muted-foreground">
        closed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-mono bg-accent/12 text-accent">
      open
    </span>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
