import Link from "next/link";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { categories, markets, type Market } from "@/lib/db/schema";
import { MarketCard, type MarketCardData } from "@/components/markets/market-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Markets" };

const SORTS = {
  "closing-soon": "Closing soon",
  "most-predicted": "Most predicted",
  new: "New",
} as const;
type SortKey = keyof typeof SORTS;

const DEFAULT_SORT: SortKey = "closing-soon";
const PAGE_SIZE = 24;

export default async function MarketsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    q?: string;
    page?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category ?? "all";
  const activeSort: SortKey =
    params.sort && params.sort in SORTS ? (params.sort as SortKey) : DEFAULT_SORT;
  const query = (params.q ?? "").trim().slice(0, 100);
  const activeView = params.view === "all" ? "all" : "featured";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const currentTime = new Date();

  const orderBy =
    activeSort === "closing-soon"
      ? asc(markets.closes_at)
      : activeSort === "most-predicted"
        ? desc(markets.prediction_count)
        : desc(markets.created_at);

  const whereClause = and(
    isNull(markets.resolved_at),
    gt(markets.closes_at, currentTime),
    ne(markets.discovery_state, "hidden"),
    activeView === "featured"
      ? eq(markets.discovery_state, "featured")
      : undefined,
    activeCategory && activeCategory !== "all"
      ? eq(markets.category_slug, activeCategory)
      : undefined,
    query
      ? or(
          ilike(markets.title, `%${query}%`),
          ilike(markets.description, `%${query}%`),
        )
      : undefined,
  );

  const closingThreshold = new Date(
    currentTime.getTime() + 24 * 60 * 60 * 1000,
  );
  const [allCategories, filteredRows, openRows, closingRows] =
    await Promise.all([
      db
        .select({ slug: categories.slug, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.sort_order)),
      db
        .select({ filteredCount: sql<number>`COUNT(*)::int` })
        .from(markets)
        .where(whereClause),
      db
        .select({ totalOpen: sql<number>`COUNT(*)::int` })
        .from(markets)
        .where(
          and(isNull(markets.resolved_at), gt(markets.closes_at, currentTime)),
        ),
      db
        .select({ closingToday: sql<number>`COUNT(*)::int` })
        .from(markets)
        .where(
          and(
            isNull(markets.resolved_at),
            gt(markets.closes_at, currentTime),
            lt(markets.closes_at, closingThreshold),
          ),
        ),
    ]);

  const filteredCount = filteredRows[0]?.filteredCount ?? 0;
  const totalOpen = openRows[0]?.totalOpen ?? 0;
  const closingToday = closingRows[0]?.closingToday ?? 0;

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const activePage = Math.min(requestedPage, totalPages);

  const rows = (await db
    .select()
    .from(markets)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(PAGE_SIZE)
    .offset((activePage - 1) * PAGE_SIZE)) as Market[];

  return (
    <div className="mx-auto w-full max-w-[1200px] py-10 sm:py-14">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <p className="text-overline text-muted-foreground mb-3">
            open markets
          </p>
          <h1 className="font-display text-display-md sm:text-display-lg text-foreground -tracking-[0.035em]">
            Pick a probability.
          </h1>
        </div>
        <Link
          href="/markets/propose"
          className="text-body-sm text-foreground font-medium hover:underline self-start sm:self-end"
        >
          Propose a market →
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-10 border-y border-border py-5">
        <StatCell label="open" value={totalOpen} />
        <StatCell label="categories" value={allCategories.length} />
        <StatCell label="closing 24h" value={closingToday} />
      </div>

      <nav className="mb-6 flex items-center gap-1" aria-label="Market shelf">
        <Link
          href="/markets"
          className={`inline-flex h-9 items-center rounded-full px-4 text-body-sm ${activeView === "featured" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          Curated
        </Link>
        <Link
          href="/markets?view=all"
          className={`inline-flex h-9 items-center rounded-full px-4 text-body-sm ${activeView === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          All questions
        </Link>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <nav className="scrollbar-none -mx-5 flex flex-nowrap items-center gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          <CategoryPill
            href={buildHref({
              category: undefined,
              sort: activeSort,
              q: query,
              view: activeView,
            })}
            active={activeCategory === "all"}
          >
            All
          </CategoryPill>
          {allCategories.map((c) => (
            <CategoryPill
              key={c.slug}
              href={buildHref({
                category: c.slug,
                sort: activeSort,
                q: query,
                view: activeView,
              })}
              active={activeCategory === c.slug}
            >
              {c.name}
            </CategoryPill>
          ))}
        </nav>

          <nav className="scrollbar-none flex items-center gap-1 overflow-x-auto">
          {(Object.keys(SORTS) as SortKey[]).map((key) => (
            <SortLink
              key={key}
              href={buildHref({
                category: activeCategory === "all" ? undefined : activeCategory,
                sort: key,
                q: query,
                view: activeView,
              })}
              active={activeSort === key}
            >
              {SORTS[key]}
            </SortLink>
          ))}
        </nav>
      </div>

      <form
        action="/markets"
        className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {activeCategory !== "all" ? (
          <input type="hidden" name="category" value={activeCategory} />
        ) : null}
        {activeSort !== DEFAULT_SORT ? (
          <input type="hidden" name="sort" value={activeSort} />
        ) : null}
        {activeView === "all" ? (
          <input type="hidden" name="view" value="all" />
        ) : null}
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search questions, topics, or outcomes"
          aria-label="Search markets"
          className="h-11 sm:max-w-md"
        />
        <Button type="submit" variant="outline" className="h-11">
          Search
        </Button>
        {query ? (
          <Link
            href={buildHref({
              category:
                activeCategory === "all" ? undefined : activeCategory,
              sort: activeSort,
              view: activeView,
            })}
            className="text-body-sm text-muted-foreground hover:text-foreground"
          >
            Clear search
          </Link>
        ) : null}
      </form>

      <div className="mb-5 flex items-center justify-between gap-4 text-body-sm text-muted-foreground">
        <p>
          {filteredCount.toLocaleString()} callable market
          {filteredCount === 1 ? "" : "s"}
          {query ? ` matching “${query}”` : ""}
        </p>
        {totalPages > 1 ? (
          <span className="font-mono text-caption tabular-nums">
            page {activePage} / {totalPages}
          </span>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {rows.map((m) => (
              <MarketCard key={m.id} market={toCardData(m)} />
            ))}
          </div>
          {totalPages > 1 ? (
            <nav
              aria-label="Market pages"
              className="mt-10 flex items-center justify-between border-t border-border pt-6"
            >
              {activePage > 1 ? (
                <Button asChild variant="outline">
                  <Link
                    href={buildHref({
                      category:
                        activeCategory === "all" ? undefined : activeCategory,
                      sort: activeSort,
                      q: query,
                      view: activeView,
                      page: activePage - 1,
                    })}
                  >
                    ← Previous
                  </Link>
                </Button>
              ) : (
                <span />
              )}
              {activePage < totalPages ? (
                <Button asChild variant="outline">
                  <Link
                    href={buildHref({
                      category:
                        activeCategory === "all" ? undefined : activeCategory,
                      sort: activeSort,
                      q: query,
                      view: activeView,
                      page: activePage + 1,
                    })}
                  >
                    Next →
                  </Link>
                </Button>
              ) : null}
            </nav>
          ) : null}
        </>
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
  q,
  page,
  view,
}: {
  category?: string;
  sort: SortKey;
  q?: string;
  page?: number;
  view?: "featured" | "all";
}) {
  const sp = new URLSearchParams();
  if (category && category !== "all") sp.set("category", category);
  if (sort && sort !== DEFAULT_SORT) sp.set("sort", sort);
  if (q) sp.set("q", q);
  if (page && page > 1) sp.set("page", String(page));
  if (view === "all") sp.set("view", "all");
  const qs = sp.toString();
  return qs ? `/markets?${qs}` : "/markets";
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-overline text-muted-foreground">{label}</span>
      <span className="font-display font-extrabold text-foreground text-headline sm:text-display-sm tabular-nums -tracking-[0.02em]">
        {value.toLocaleString()}
      </span>
    </div>
  );
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
          ? "inline-flex shrink-0 items-center px-3 h-8 rounded-full text-body-sm font-medium bg-foreground text-background"
          : "inline-flex shrink-0 items-center px-3 h-8 rounded-full text-body-sm font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
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
    <div className="border border-dashed border-border rounded-2xl py-16 px-6 flex flex-col items-start gap-4 max-w-xl">
      <h3 className="font-display text-display-sm text-foreground">
        No callable markets found.
      </h3>
      <p className="text-body-lg text-muted-foreground">
        Try another category, clear the search, or propose a question worth
        tracking.
      </p>
      <Link
        href="/markets/propose"
        className="text-body-sm text-foreground font-medium hover:underline underline-offset-4"
      >
        Propose a market →
      </Link>
    </div>
  );
}
