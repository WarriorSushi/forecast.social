import Link from "next/link";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { categories, markets, type Market } from "@/lib/db/schema";
import { MarketCard, type MarketCardData } from "@/components/markets/market-card";

export const metadata = { title: "Markets" };

const SORTS = {
  "closing-soon": "Closing soon",
  "most-predicted": "Most predicted",
  new: "New",
} as const;
type SortKey = keyof typeof SORTS;

const DEFAULT_SORT: SortKey = "closing-soon";

export default async function MarketsListPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category ?? "all";
  const activeSort: SortKey =
    params.sort && params.sort in SORTS ? (params.sort as SortKey) : DEFAULT_SORT;

  const allCategories = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sort_order));

  const orderBy =
    activeSort === "closing-soon"
      ? asc(markets.closes_at)
      : activeSort === "most-predicted"
        ? desc(markets.prediction_count)
        : desc(markets.created_at);

  const whereClause =
    activeCategory && activeCategory !== "all"
      ? and(eq(markets.category_slug, activeCategory), isNull(markets.resolved_at))
      : isNull(markets.resolved_at);

  const rows = (await db
    .select()
    .from(markets)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(60)) as Market[];

  return (
    <div className="mx-auto w-full max-w-[1200px] py-10 sm:py-14">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-10">
        <div>
          <p className="text-overline text-muted-foreground mb-3">
            open markets
          </p>
          <h1 className="font-display text-display-md sm:text-display-lg text-foreground -tracking-[0.035em]">
            Pick a probability.
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/markets/propose"
            className="text-body-sm text-foreground font-medium hover:underline"
          >
            Propose a market →
          </Link>
          <p className="font-mono text-body-sm text-muted-foreground tabular-nums">
            {rows.length} open · {SORTS[activeSort].toLowerCase()}
          </p>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <nav className="flex flex-wrap items-center gap-2">
          <CategoryPill
            href={buildHref({ category: undefined, sort: activeSort })}
            active={activeCategory === "all"}
          >
            All
          </CategoryPill>
          {allCategories.map((c) => (
            <CategoryPill
              key={c.slug}
              href={buildHref({ category: c.slug, sort: activeSort })}
              active={activeCategory === c.slug}
            >
              {c.name}
            </CategoryPill>
          ))}
        </nav>

        <nav className="flex items-center gap-1">
          {(Object.keys(SORTS) as SortKey[]).map((key) => (
            <SortLink
              key={key}
              href={buildHref({
                category: activeCategory === "all" ? undefined : activeCategory,
                sort: key,
              })}
              active={activeSort === key}
            >
              {SORTS[key]}
            </SortLink>
          ))}
        </nav>
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {rows.map((m) => (
            <MarketCard key={m.id} market={toCardData(m)} />
          ))}
        </div>
      )}
    </div>
  );
}

function toCardData(m: Market): MarketCardData {
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

function buildHref({
  category,
  sort,
}: {
  category?: string;
  sort: SortKey;
}) {
  const sp = new URLSearchParams();
  if (category && category !== "all") sp.set("category", category);
  if (sort && sort !== DEFAULT_SORT) sp.set("sort", sort);
  const qs = sp.toString();
  return qs ? `/markets?${qs}` : "/markets";
}

function CategoryPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex items-center px-3 h-8 rounded-full text-body-sm font-medium bg-foreground text-background"
          : "inline-flex items-center px-3 h-8 rounded-full text-body-sm font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
      }
    >
      {children}
    </Link>
  );
}

function SortLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex items-center px-3 h-8 rounded-md text-body-sm font-medium text-foreground"
          : "inline-flex items-center px-3 h-8 rounded-md text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      }
    >
      {children}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-border rounded-2xl py-16 px-6 flex flex-col items-center text-center">
      <p className="font-display text-display-sm text-muted-foreground">
        No open markets here yet.
      </p>
      <p className="mt-3 text-body-sm text-muted-foreground max-w-sm">
        Try another category, or check back soon.
      </p>
    </div>
  );
}
