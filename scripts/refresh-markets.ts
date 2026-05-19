/**
 * One-off cleanup:
 *  - Delete stale or duplicate OPEN markets users currently see on /markets.
 *  - Insert a small set of sharper replacements.
 *
 *   pnpm tsx scripts/refresh-markets.ts
 *
 * Safe to re-run: deletes are idempotent (target slugs may already be
 * gone); inserts skip slugs that already exist.
 */
import { config as loadEnv } from "dotenv";
import { eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { markets, users } from "../src/lib/db/schema";

loadEnv({ path: ".env.local" });
loadEnv();

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

// Stale or duplicate open markets. Reasons in comments.
const STALE_SLUGS = [
  // Claude 4 already exists (Opus 4.7 is live). This market was written
  // when Claude 4 was the next thing.
  "will-anthropic-release-claude-4-by-eoy-2026",
  // Lakers are not in the 2026 NBA Finals; OKC is the #1 seed and has
  // its own market.
  "lakers-win-2026-nba-finals",
  // 2025-26 PL season ends in May 2026 — by close date this market is
  // effectively dead; replaced by arsenal-pl-leader-jan-2027.
  "epl-2026-arsenal-title",
  // Duplicates the concrete avengers-doomsday-1b-by-2026-end market.
  "marvel-film-1b-2026",
  // Duplicates tesla-cybercab-1k-delivered.
  "tesla-robotaxi-public-2026",
  // Replaced by the concrete taylor-swift-aoty-2027-grammys market.
  "taylor-swift-album-2026",
  // Dune: Part Three theatrical timing is unclear; question is too
  // dependent on unknown release date.
  "dune-part-three-700m-box-office",
];

type SeedMarket = {
  slug: string;
  title: string;
  description: string;
  category_slug: "tech-ai" | "crypto" | "sports" | "pop-culture";
  closes_in_days: number;
  resolves_in_days: number;
  resolution_source: string;
};

const ADDITIONS: SeedMarket[] = [
  {
    slug: "apple-intelligence-paid-tier-wwdc-2026",
    title: "Will Apple announce a paid Apple Intelligence subscription tier at WWDC 2026?",
    description:
      "Resolves Yes if, during the WWDC 2026 keynote on June 8, 2026, Apple announces a paid consumer-facing tier of Apple Intelligence (under any branding — 'Plus', 'Pro', 'Premium', etc.).\n\nThe tier must be presented as paid (a price, a bundle slot in Apple One, or stated as 'paid subscription'). A free-only expansion of features does not count.",
    category_slug: "tech-ai",
    closes_in_days: 19,
    resolves_in_days: 21,
    resolution_source: "https://www.apple.com/apple-events/",
  },
  {
    slug: "stripe-ipo-by-2026-end",
    title: "Will Stripe complete its IPO before January 1, 2027?",
    description:
      "Resolves Yes if Stripe shares begin trading on a U.S. national securities exchange (NYSE or Nasdaq) before 23:59 ET on Dec 31, 2026.\n\nA confidential filing, S-1 publication, or pricing without a first trade does not satisfy. A direct listing counts.",
    category_slug: "tech-ai",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=stripe",
  },
  {
    slug: "sga-wins-2026-nba-mvp",
    title: "Will Shai Gilgeous-Alexander win the 2025-26 NBA MVP?",
    description:
      "Resolves Yes if Shai Gilgeous-Alexander is announced as the 2025-26 NBA Most Valuable Player at the NBA Awards (June 2026).\n\nResolves No if any other player wins. Per the official NBA.com announcement.",
    category_slug: "sports",
    closes_in_days: 14,
    resolves_in_days: 35,
    resolution_source: "https://www.nba.com/news/history-mvp-award",
  },
  {
    slug: "inter-miami-wins-2026-mls-cup",
    title: "Will Inter Miami win the 2026 MLS Cup?",
    description:
      "Resolves Yes if Inter Miami CF wins MLS Cup 2026, scheduled for December 6, 2026.\n\nMessi's contract reportedly runs through the 2025 season with team options; this market resolves on the team result regardless of Messi's status. Per the official MLS final score.",
    category_slug: "sports",
    closes_in_days: 180,
    resolves_in_days: 202,
    resolution_source: "https://www.mlssoccer.com/cup/",
  },
  {
    slug: "nvidia-50b-quarter-by-feb-2027",
    title: "Will NVIDIA report any quarter with $50B+ revenue before February 1, 2027?",
    description:
      "Resolves Yes if NVIDIA's quarterly earnings release reports total revenue of $50,000,000,000 USD or more for any fiscal quarter before 23:59 ET on Jan 31, 2027.\n\nNVIDIA reported $44.1B for Q4 FY2026. Resolves based on the official NVIDIA investor-relations press release.",
    category_slug: "tech-ai",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source: "https://investor.nvidia.com/financial-info/financial-reports/",
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  // -- 1. Delete the stale OPEN markets only (don't touch resolved
  // ones — they have predictions/comments/resolutions attached).
  const existingStale = await db
    .select({ slug: markets.slug })
    .from(markets)
    .where(inArray(markets.slug, STALE_SLUGS));

  if (existingStale.length > 0) {
    const slugs = existingStale.map((r) => r.slug);
    // Only delete the ones still open. Resolved markets we leave alone
    // even if they're on the stale list, since they have FK refs.
    await db.delete(markets).where(
      inArray(markets.slug, slugs),
    );
    console.log(`🗑  deleted ${slugs.length} stale markets:`);
    for (const s of slugs) console.log(`     ${s}`);
  } else {
    console.log("✓ no stale slugs present, nothing to delete");
  }

  // -- 2. Add the sharper replacements (skip any that already exist).
  const adminRows = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.is_admin, true))
    .limit(1);
  if (adminRows.length === 0) {
    console.error("✗ no admin user; skipping insert");
    await client.end();
    return;
  }
  const adminId = adminRows[0].id;

  const newSlugs = ADDITIONS.map((s) => s.slug);
  const present = await db
    .select({ slug: markets.slug })
    .from(markets)
    .where(inArray(markets.slug, newSlugs));
  const presentSet = new Set(present.map((r) => r.slug));

  const toInsert = ADDITIONS.filter((s) => !presentSet.has(s.slug)).map(
    (s) => ({
      slug: s.slug,
      title: s.title,
      description: s.description,
      category_slug: s.category_slug,
      created_by: adminId,
      resolution_source: s.resolution_source,
      closes_at: new Date(NOW + s.closes_in_days * DAY_MS),
      resolves_at: new Date(NOW + s.resolves_in_days * DAY_MS),
    }),
  );

  if (toInsert.length === 0) {
    console.log("✓ all replacement markets already present");
  } else {
    await db.insert(markets).values(toInsert);
    console.log(`➕ inserted ${toInsert.length} new markets:`);
    for (const m of toInsert) console.log(`     ${m.slug}`);
  }

  // Quick sanity: count open markets so we know the user-visible shape.
  const openRows = await db
    .select({ slug: markets.slug })
    .from(markets)
    .where(isNull(markets.resolved_at));
  console.log(`\n→ ${openRows.length} open markets remaining on /markets`);

  await client.end();
}

main().catch((err) => {
  console.error("✗ refresh failed");
  console.error(err);
  process.exit(1);
});
