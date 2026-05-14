import Link from "next/link";
import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { markets } from "@/lib/db/schema";
import { CreateMarketForm } from "@/components/admin/create-market-form";

export const metadata = { title: "Admin · Markets" };

export default async function AdminMarketsPage() {
  const rows = await db
    .select({
      id: markets.id,
      slug: markets.slug,
      title: markets.title,
      category_slug: markets.category_slug,
      closes_at: markets.closes_at,
      resolved_at: markets.resolved_at,
      outcome: markets.outcome,
      created_at: markets.created_at,
    })
    .from(markets)
    .orderBy(desc(markets.created_at))
    .limit(100);

  return (
    <div className="mx-auto w-full max-w-[1080px] py-10 sm:py-14 flex flex-col gap-12">
      <header>
        <p className="text-overline text-muted-foreground mb-4">
          admin · markets
        </p>
        <h1 className="font-display text-display-md text-foreground -tracking-[0.025em]">
          Create a market.
        </h1>
        <p className="mt-3 text-body-lg text-muted-foreground max-w-xl">
          New markets appear publicly the moment they're saved. Pick clean
          resolution sources. Phrase questions so a future reader knows
          exactly what Yes and No mean.
        </p>
      </header>

      <section>
        <CreateMarketForm />
      </section>

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
          <p className="text-body-sm text-muted-foreground">
            No markets yet. The form above adds the first one.
          </p>
        ) : (
          <ul className="flex flex-col">
            {rows.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[1fr_120px_120px_80px] gap-4 items-center py-3 border-b border-border last:border-b-0"
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
                <span className="text-caption text-muted-foreground font-mono uppercase tracking-wider">
                  {m.category_slug}
                </span>
                <span className="text-caption text-muted-foreground font-mono tabular-nums">
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
}: {
  resolvedAt: Date | null;
  outcome: string | null;
  closesAt: Date;
}) {
  const now = Date.now();
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
  if (new Date(closesAt).getTime() < now) {
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
