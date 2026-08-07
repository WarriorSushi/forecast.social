import Link from "next/link";
import { ArrowUpDown, Check, ChevronDown, Search, X } from "lucide-react";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { categories, markets, type Market } from "@/lib/db/schema";
import { MarketCard, type MarketCardData } from "@/components/markets/market-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const shelfClause = and(
    isNull(markets.resolved_at),
    gt(markets.closes_at, currentTime),
    ne(markets.discovery_state, "hidden"),
    activeView === "featured"
      ? eq(markets.discovery_state, "featured")
      : undefined,
  );

  const closingThreshold = new Date(
    currentTime.getTime() + 24 * 60 * 60 * 1000,
  );
  const [allCategories, filteredRows, shelfRows] =
    await Promise.all([
      db
        .select({ slug: categories.slug, name: categories.name })
        .from(categories)
        .innerJoin(markets, eq(categories.slug, markets.category_slug))
        .where(shelfClause)
        .groupBy(categories.slug, categories.name, categories.sort_order)
        .orderBy(asc(categories.sort_order)),
      db
        .select({ filteredCount: sql<number>`COUNT(*)::int` })
        .from(markets)
        .where(whereClause),
      db
        .select({
          totalOpen: sql<number>`COUNT(*)::int`,
          categoryCount: sql<number>`COUNT(DISTINCT ${markets.category_slug})::int`,
          closingToday: sql<number>`COUNT(*) FILTER (WHERE ${markets.closes_at} < ${closingThreshold.toISOString()})::int`,
        })
        .from(markets)
        .where(shelfClause),
    ]);

  const filteredCount = filteredRows[0]?.filteredCount ?? 0;
  const totalOpen = shelfRows[0]?.totalOpen ?? 0;
  const categoryCount = shelfRows[0]?.categoryCount ?? 0;
  const closingToday = shelfRows[0]?.closingToday ?? 0;

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
      <header>
        <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-overline text-muted-foreground mb-3">
              market desk
            </p>
            <h1 className="font-display text-display-sm sm:text-display-md text-foreground -tracking-[0.035em]">
              Pick a probability.
            </h1>
            <p className="mt-4 max-w-[56ch] text-body text-muted-foreground">
              Clear questions with explicit deadlines. Make a call now, then
              let the record speak when reality arrives.
            </p>
          </div>
          <Button asChild variant="outline" className="self-start sm:self-auto">
            <Link href="/markets/propose">Propose a market</Link>
          </Button>
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-muted-foreground">
          <span>{totalOpen.toLocaleString()} open</span>
          <span>{categoryCount.toLocaleString()} topics</span>
          <span>
            {closingToday > 0
              ? `${closingToday} closing within 24 hours`
              : "Nothing closing today"}
          </span>
        </div>
      </header>

      <section className="mb-8 mt-8 border-y border-border" aria-label="Market filters">
        <div className="flex items-center justify-between gap-4 border-b border-border">
          <nav className="flex items-center gap-6" aria-label="Market shelf">
            <ShelfLink href="/markets" active={activeView === "featured"}>
              Featured
            </ShelfLink>
            <ShelfLink href="/markets?view=all" active={activeView === "all"}>
              All markets
            </ShelfLink>
          </nav>
          <span className="hidden font-mono text-caption text-muted-foreground sm:inline">
            {filteredCount.toLocaleString()} result{filteredCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <form action="/markets" className="flex min-w-0 flex-1 items-center gap-2">
            {activeCategory !== "all" ? (
              <input type="hidden" name="category" value={activeCategory} />
            ) : null}
            {activeSort !== DEFAULT_SORT ? (
              <input type="hidden" name="sort" value={activeSort} />
            ) : null}
            {activeView === "all" ? (
              <input type="hidden" name="view" value="all" />
            ) : null}
            <div className="relative min-w-0 flex-1 sm:max-w-[560px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search markets"
                aria-label="Search markets"
                className="h-11 rounded-xl pl-10"
              />
            </div>
            <Button type="submit" variant="outline" className="h-11 rounded-xl px-4">
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
                aria-label="Clear search"
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-body-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-3"
              >
                <X className="size-4" />
                <span className="sr-only sm:not-sr-only">Clear</span>
              </Link>
            ) : null}
          </form>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-11 w-full justify-between rounded-xl px-4 sm:w-[210px]"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowUpDown className="size-4 text-muted-foreground" />
                  {SORTS[activeSort]}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[210px]">
              {(Object.keys(SORTS) as SortKey[]).map((key) => (
                <DropdownMenuItem key={key} asChild>
                  <Link
                    href={buildHref({
                      category:
                        activeCategory === "all" ? undefined : activeCategory,
                      sort: key,
                      q: query,
                      view: activeView,
                    })}
                    className="flex w-full items-center"
                  >
                    {SORTS[key]}
                    {activeSort === key ? <Check className="ml-auto size-4" /> : null}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4 border-t border-border">
          <span className="hidden shrink-0 text-overline text-muted-foreground sm:inline">
            Topics
          </span>
          <nav className="scrollbar-none -mx-5 flex min-w-0 flex-1 items-center gap-5 overflow-x-auto px-5 sm:mx-0 sm:px-0" aria-label="Market topics">
            <TopicLink
              href={buildHref({
                category: undefined,
                sort: activeSort,
                q: query,
                view: activeView,
              })}
              active={activeCategory === "all"}
            >
              All topics
            </TopicLink>
            {allCategories.map((c) => (
              <TopicLink
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
              </TopicLink>
            ))}
          </nav>
        </div>
      </section>

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
        <EmptyState
          resetHref={
            query || activeCategory !== "all" || activeSort !== DEFAULT_SORT
              ? buildHref({ sort: DEFAULT_SORT, view: activeView })
              : activeView === "featured"
                ? "/markets?view=all"
                : null
          }
          resetLabel={
            query || activeCategory !== "all" || activeSort !== DEFAULT_SORT
              ? "Clear filters"
              : "Browse all markets"
          }
        />
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

function ShelfLink({
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
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-12 items-center border-b-2 text-body-sm font-medium transition-colors ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function TopicLink({
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
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-11 shrink-0 items-center border-b-2 text-body-sm font-medium transition-colors ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function EmptyState({
  resetHref,
  resetLabel,
}: {
  resetHref: string | null;
  resetLabel: string;
}) {
  return (
    <div className="border border-dashed border-border rounded-2xl py-16 px-6 flex flex-col items-start gap-4 max-w-xl">
      <h3 className="font-display text-display-sm text-foreground">
        No callable markets found.
      </h3>
      <p className="text-body-lg text-muted-foreground">
        Try another category, clear the search, or propose a question worth
        tracking.
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {resetHref ? (
          <Button asChild variant="outline">
            <Link href={resetHref}>{resetLabel}</Link>
          </Button>
        ) : null}
        <Link
          href="/markets/propose"
          className="text-body-sm text-foreground font-medium hover:underline underline-offset-4"
        >
          Propose a market →
        </Link>
      </div>
    </div>
  );
}
