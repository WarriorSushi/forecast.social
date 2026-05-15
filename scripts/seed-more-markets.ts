/**
 * Seeds an additional batch of markets across categories so the launch
 * experience has 30+ markets to browse instead of the initial 10.
 *
 *   pnpm tsx scripts/seed-more-markets.ts
 *
 * Idempotent: skips slugs that already exist.
 */
import { config as loadEnv } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { markets, users } from "../src/lib/db/schema";

loadEnv({ path: ".env.local" });
loadEnv();

type Seed = {
  slug: string;
  title: string;
  description: string;
  category_slug: "tech-ai" | "crypto" | "sports" | "pop-culture";
  closes_in_days: number;
  resolves_in_days: number;
  resolution_source: string;
};

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const SEEDS: Seed[] = [
  // Tech & AI
  {
    slug: "apple-vision-pro-2-by-eoy-2026",
    title: "Does Apple announce Vision Pro 2 before the end of 2026?",
    description:
      "Resolves Yes if Apple announces a successor product branded as Vision Pro 2 (or a successor with a distinct model name and major hardware revision) before Dec 31, 2026. Resolves No otherwise.",
    category_slug: "tech-ai",
    closes_in_days: 200,
    resolves_in_days: 210,
    resolution_source: "https://www.apple.com/newsroom/",
  },
  {
    slug: "us-ai-export-controls-tightened-2026",
    title: "Does the US tighten AI chip export controls in 2026?",
    description:
      "Resolves Yes if the US Department of Commerce / BIS publishes new export controls in 2026 that materially restrict AI chip exports (any update that lowers thresholds, adds entities, or expands product coverage). Resolves No otherwise.",
    category_slug: "tech-ai",
    closes_in_days: 220,
    resolves_in_days: 230,
    resolution_source: "https://www.bis.doc.gov/",
  },
  {
    slug: "nvidia-market-cap-5t-2026",
    title: "Does NVIDIA's market cap close 2026 above $5T?",
    description:
      "Resolves Yes if NVIDIA's market capitalization on Dec 31, 2026 close is greater than or equal to $5 trillion USD. Resolves No otherwise. Source: NASDAQ official close × outstanding shares.",
    category_slug: "tech-ai",
    closes_in_days: 240,
    resolves_in_days: 245,
    resolution_source: "https://www.nasdaq.com/market-activity/stocks/nvda",
  },
  {
    slug: "tesla-robotaxi-public-2026",
    title: "Does Tesla launch a public Robotaxi service in any US city by EOY 2026?",
    description:
      "Resolves Yes if Tesla operates a Robotaxi service open to the general public (not invite-only) in at least one US city before Dec 31, 2026. Resolves No otherwise.",
    category_slug: "tech-ai",
    closes_in_days: 230,
    resolves_in_days: 240,
    resolution_source: "https://www.tesla.com",
  },

  // Crypto
  {
    slug: "ethereum-2x-2026",
    title: "Does ETH/USD close above 2x its Jan 1, 2026 price by EOY 2026?",
    description:
      "Resolves Yes if Ethereum's USD price on Coinbase at 23:59 UTC Dec 31, 2026 is at least 2× its open price on Jan 1, 2026. Resolves No otherwise.",
    category_slug: "crypto",
    closes_in_days: 235,
    resolves_in_days: 245,
    resolution_source: "https://pro.coinbase.com/trade/ETH-USD",
  },
  {
    slug: "us-spot-solana-etf-2026",
    title: "Does the SEC approve a spot Solana ETF in 2026?",
    description:
      "Resolves Yes if the SEC issues an approval order for any spot Solana ETF in 2026. Resolves No otherwise.",
    category_slug: "crypto",
    closes_in_days: 200,
    resolves_in_days: 210,
    resolution_source: "https://www.sec.gov/news/pressreleases",
  },
  {
    slug: "stablecoin-supply-300b-2026",
    title: "Does total stablecoin supply cross $300B by EOY 2026?",
    description:
      "Resolves Yes if the aggregate USD-denominated stablecoin supply (per Defi Llama's all-chains stablecoin tracker) crosses $300B at any 24h close in 2026. Resolves No otherwise.",
    category_slug: "crypto",
    closes_in_days: 220,
    resolves_in_days: 225,
    resolution_source: "https://defillama.com/stablecoins",
  },

  // Sports
  {
    slug: "yankees-2026-world-series",
    title: "Do the New York Yankees win the 2026 World Series?",
    description:
      "Resolves Yes if the Yankees win the 2026 MLB World Series. Resolves No otherwise.",
    category_slug: "sports",
    closes_in_days: 180,
    resolves_in_days: 200,
    resolution_source: "https://www.mlb.com/postseason",
  },
  {
    slug: "djokovic-grand-slam-2026",
    title: "Does Novak Djokovic win any Grand Slam in 2026?",
    description:
      "Resolves Yes if Djokovic wins the Australian Open, French Open, Wimbledon, or US Open in 2026. Resolves No otherwise.",
    category_slug: "sports",
    closes_in_days: 240,
    resolves_in_days: 250,
    resolution_source: "https://www.atptour.com/",
  },
  {
    slug: "wnba-mvp-2026-clark",
    title: "Does Caitlin Clark win the 2026 WNBA MVP?",
    description:
      "Resolves Yes if Caitlin Clark is named the 2026 WNBA Most Valuable Player. Resolves No otherwise.",
    category_slug: "sports",
    closes_in_days: 100,
    resolves_in_days: 120,
    resolution_source: "https://www.wnba.com/",
  },
  {
    slug: "epl-2026-arsenal-title",
    title: "Does Arsenal win the 2025–26 Premier League title?",
    description:
      "Resolves Yes if Arsenal FC win the 2025–26 English Premier League title. Resolves No otherwise.",
    category_slug: "sports",
    closes_in_days: 30,
    resolves_in_days: 45,
    resolution_source: "https://www.premierleague.com/tables",
  },

  // Pop culture
  {
    slug: "succession-spinoff-2026",
    title: "Is a Succession spinoff announced before EOY 2026?",
    description:
      "Resolves Yes if HBO officially announces a Succession spinoff series or film before Dec 31, 2026. Resolves No otherwise.",
    category_slug: "pop-culture",
    closes_in_days: 240,
    resolves_in_days: 250,
    resolution_source: "https://www.hbo.com/",
  },
  {
    slug: "beyonce-tour-announcement-2026",
    title: "Does Beyoncé announce a new world tour in 2026?",
    description:
      "Resolves Yes if Beyoncé officially announces a new world tour (any name; minimum 10 dates) in 2026. Resolves No otherwise.",
    category_slug: "pop-culture",
    closes_in_days: 250,
    resolves_in_days: 260,
    resolution_source: "https://www.beyonce.com/",
  },
  {
    slug: "marvel-film-1b-2026",
    title: "Does any Marvel Studios film cross $1B worldwide in 2026?",
    description:
      "Resolves Yes if any Marvel Studios theatrical release reaches $1B worldwide box office in 2026. Resolves No otherwise. Source: Box Office Mojo.",
    category_slug: "pop-culture",
    closes_in_days: 240,
    resolves_in_days: 280,
    resolution_source: "https://www.boxofficemojo.com",
  },
  {
    slug: "next-bond-actor-2026",
    title: "Is the next James Bond actor announced before EOY 2026?",
    description:
      "Resolves Yes if Eon Productions / MGM officially announces the new James Bond lead actor before Dec 31, 2026. Resolves No otherwise.",
    category_slug: "pop-culture",
    closes_in_days: 240,
    resolves_in_days: 250,
    resolution_source: "https://www.007.com/",
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  const [admin] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.is_admin, true))
    .limit(1);
  if (!admin) {
    console.error("No admin user. Run scripts/make-admin.ts first.");
    await client.end();
    process.exit(1);
  }

  const slugs = SEEDS.map((s) => s.slug);
  const existing = await db
    .select({ slug: markets.slug })
    .from(markets)
    .where(inArray(markets.slug, slugs));
  const existingSlugs = new Set(existing.map((r) => r.slug));

  const toInsert = SEEDS.filter((s) => !existingSlugs.has(s.slug)).map(
    (s) => ({
      slug: s.slug,
      title: s.title,
      description: s.description,
      category_slug: s.category_slug,
      created_by: admin.id,
      resolution_source: s.resolution_source,
      closes_at: new Date(NOW + s.closes_in_days * DAY),
      resolves_at: new Date(NOW + s.resolves_in_days * DAY),
    }),
  );

  if (toInsert.length === 0) {
    console.log("✓ all markets already present.");
  } else {
    await db.insert(markets).values(toInsert);
    console.log(`✓ inserted ${toInsert.length} new markets.`);
    if (existingSlugs.size > 0) {
      console.log(`  (${existingSlugs.size} already present, skipped)`);
    }
  }

  await client.end();
}

main().catch((err) => {
  console.error("✗ failed");
  console.error(err);
  process.exit(1);
});
