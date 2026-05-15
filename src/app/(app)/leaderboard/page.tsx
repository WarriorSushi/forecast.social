import Link from "next/link";
import { asc, desc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  categories,
  user_category_scores,
  users,
} from "@/lib/db/schema";
import { UserAvatar } from "@/components/app/user-avatar";

export const metadata = { title: "Leaderboard" };

const TOP_LIMIT = 100;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category ?? "all";

  const allCategories = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sort_order));

  type Row = {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    score: number;
    resolved_count: number | null;
    streak: number;
  };

  let rows: Row[] = [];
  if (activeCategory === "all") {
    rows = (await db
      .select({
        user_id: users.id,
        username: users.username,
        display_name: users.display_name,
        avatar_url: users.avatar_url,
        score: users.forecast_score,
        resolved_count: sql<number>`NULL`.as("resolved_count"),
        streak: users.current_streak,
      })
      .from(users)
      .where(gt(users.forecast_score, 0))
      .orderBy(desc(users.forecast_score), asc(users.username))
      .limit(TOP_LIMIT)) as unknown as Row[];
  } else {
    rows = (await db
      .select({
        user_id: user_category_scores.user_id,
        username: users.username,
        display_name: users.display_name,
        avatar_url: users.avatar_url,
        score: user_category_scores.score,
        resolved_count: user_category_scores.resolved_count,
        streak: users.current_streak,
      })
      .from(user_category_scores)
      .innerJoin(users, eq(user_category_scores.user_id, users.id))
      .where(
        sql`${user_category_scores.category_slug} = ${activeCategory} AND ${user_category_scores.score} > 0`,
      )
      .orderBy(
        desc(user_category_scores.score),
        asc(users.username),
      )
      .limit(TOP_LIMIT)) as unknown as Row[];
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] py-10 sm:py-14">
      <header className="mb-10">
        <p className="text-overline text-muted-foreground mb-3">
          leaderboard
        </p>
        <h1 className="font-display text-display-md sm:text-display-lg text-foreground -tracking-[0.035em]">
          The proven.{" "}
          <span className="text-muted-foreground">
            {activeCategory === "all"
              ? "All categories."
              : `${labelForCategory(activeCategory, allCategories)}.`}
          </span>
        </h1>
      </header>

      <nav className="flex flex-wrap items-center gap-2 mb-8">
        <Pill href="/leaderboard" active={activeCategory === "all"}>
          All
        </Pill>
        {allCategories.map((c) => (
          <Pill
            key={c.slug}
            href={`/leaderboard?category=${c.slug}`}
            active={activeCategory === c.slug}
          >
            {c.name}
          </Pill>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ol className="rounded-2xl border border-border bg-surface overflow-hidden">
          {rows.map((row, idx) => {
            const rank = idx + 1;
            const podium = rank <= 3;
            return (
              <li
                key={`${row.user_id}-${activeCategory}`}
                className="grid grid-cols-[40px_40px_1fr_72px_88px] sm:grid-cols-[56px_40px_1fr_120px_120px_100px] items-center gap-3 sm:gap-5 px-5 py-4 border-b border-border last:border-b-0"
              >
                <span
                  className={
                    podium
                      ? "font-display text-display-sm font-extrabold text-foreground tabular-nums leading-none"
                      : "font-mono text-body-sm text-muted-foreground tabular-nums"
                  }
                >
                  {String(rank).padStart(2, "0")}
                </span>
                <UserAvatar
                  url={row.avatar_url}
                  displayName={row.display_name}
                  size="sm"
                />
                <Link
                  href={`/u/${row.username}`}
                  className="font-display text-body text-foreground hover:underline truncate"
                >
                  {row.display_name}
                </Link>
                <span className="hidden sm:inline font-mono text-caption text-muted-foreground tabular-nums">
                  @{row.username}
                </span>
                <span
                  className={
                    "hidden sm:inline font-mono text-caption tabular-nums " +
                    (row.streak > 0
                      ? "text-signal-positive"
                      : "text-muted-foreground")
                  }
                >
                  {row.streak > 0 ? `${row.streak}-call streak` : "—"}
                </span>
                <span className="font-display text-headline font-bold text-foreground tabular-nums text-right">
                  {row.score.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Pill({
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

function EmptyState() {
  return (
    <div className="border border-dashed border-border rounded-2xl py-16 px-6 flex flex-col items-start gap-4 max-w-xl">
      <h3 className="font-display text-display-sm text-foreground">
        No ranked forecasters yet.
      </h3>
      <p className="text-body-lg text-muted-foreground">
        Forecasters land here after 5 resolved predictions. Be one of
        the first.
      </p>
      <Link
        href="/markets"
        className="text-body-sm text-foreground font-medium hover:underline underline-offset-4"
      >
        Browse markets →
      </Link>
    </div>
  );
}

function labelForCategory(
  slug: string,
  cats: { slug: string; name: string }[],
) {
  return cats.find((c) => c.slug === slug)?.name ?? slug;
}
