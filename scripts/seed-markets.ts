/**
 * Seeds the markets table with a starter set of 10 markets across
 * categories. Skips any market whose slug already exists.
 *
 *   pnpm tsx scripts/seed-markets.ts
 *
 * Requires an admin to exist (see scripts/make-admin.ts); the script
 * picks the first admin it finds as `created_by`.
 */
import { config as loadEnv } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { markets, users } from "../src/lib/db/schema";

loadEnv({ path: ".env.local" });
loadEnv();

type SeedMarket = {
  slug: string;
  title: string;
  description: string;
  category_slug: "tech-ai" | "crypto" | "sports" | "pop-culture";
  closes_in_days: number;
  resolves_in_days: number;
  resolution_source: string;
};

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

const SEEDS: SeedMarket[] = [
  {
    slug: "gpt-5-launches-before-july-2026",
    title: "Will GPT-5 publicly launch before July 1, 2026?",
    description:
      "Resolves Yes if OpenAI announces a model branded as GPT-5 (not GPT-4.5 or GPT-4 Turbo) with public API or product availability before July 1, 2026 (Pacific Time).\n\nResolves No otherwise. A research preview gated to a closed waitlist counts as Yes only if anyone can sign up; if the waitlist is invite-only, this resolves No.",
    category_slug: "tech-ai",
    closes_in_days: 60,
    resolves_in_days: 75,
    resolution_source: "https://openai.com/blog",
  },
  {
    slug: "claude-opus-5-before-q4-2026",
    title: "Anthropic ships Claude Opus 5 before October 1, 2026?",
    description:
      "Resolves Yes if Anthropic publicly releases a model branded as Claude Opus 5 (or higher) with API availability before October 1, 2026.\n\nResolves No otherwise. Beta or paid-preview availability counts.",
    category_slug: "tech-ai",
    closes_in_days: 120,
    resolves_in_days: 150,
    resolution_source: "https://www.anthropic.com/news",
  },
  {
    slug: "open-source-model-beats-gpt4-mmlu",
    title:
      "Does an open-weights model surpass GPT-4 on MMLU by EOY 2026?",
    description:
      "Resolves Yes if any model with weights released under an open license (Apache 2.0, MIT, or comparable) scores higher than GPT-4 on the published MMLU benchmark by December 31, 2026.\n\nResolves based on the standard 5-shot MMLU evaluation as reported on the Hugging Face Open LLM Leaderboard or an equivalent third-party eval.",
    category_slug: "tech-ai",
    closes_in_days: 200,
    resolves_in_days: 220,
    resolution_source:
      "https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard",
  },
  {
    slug: "btc-above-120k-eoy-2026",
    title: "Bitcoin closes above $120,000 USD on December 31, 2026?",
    description:
      "Resolves Yes if the BTC/USD close price on Coinbase at 23:59 UTC on December 31, 2026 is greater than or equal to $120,000.\n\nResolves No otherwise. Uses the official Coinbase Pro daily close as the source of truth.",
    category_slug: "crypto",
    closes_in_days: 220,
    resolves_in_days: 230,
    resolution_source: "https://pro.coinbase.com/trade/BTC-USD",
  },
  {
    slug: "eth-flips-btc-marketcap-2026",
    title: "ETH market cap surpasses BTC market cap at any point in 2026?",
    description:
      "Resolves Yes if Ethereum's circulating supply market capitalization exceeds Bitcoin's circulating supply market capitalization, as reported by CoinGecko, at any 24-hour close between Jan 1, 2026 and Dec 31, 2026.\n\nResolves No if it never crosses.",
    category_slug: "crypto",
    closes_in_days: 240,
    resolves_in_days: 245,
    resolution_source:
      "https://www.coingecko.com/en/global-charts",
  },
  {
    slug: "lakers-win-2026-nba-finals",
    title: "Do the Los Angeles Lakers win the 2026 NBA Finals?",
    description:
      "Resolves Yes if the Lakers win the 2025–2026 NBA Finals.\n\nResolves No otherwise. Source of truth is the official NBA.com Finals page.",
    category_slug: "sports",
    closes_in_days: 45,
    resolves_in_days: 60,
    resolution_source: "https://www.nba.com/playoffs",
  },
  {
    slug: "world-cup-2026-winner-brazil",
    title: "Does Brazil win the 2026 FIFA Men's World Cup?",
    description:
      "Resolves Yes if Brazil wins the 2026 FIFA Men's World Cup final.\n\nResolves No otherwise. Source: FIFA official result.",
    category_slug: "sports",
    closes_in_days: 30,
    resolves_in_days: 50,
    resolution_source: "https://www.fifa.com/fifaplus/en/tournaments",
  },
  {
    slug: "f1-2026-verstappen-champion",
    title: "Does Max Verstappen win the 2026 F1 Drivers' Championship?",
    description:
      "Resolves Yes if Max Verstappen is crowned the 2026 Formula 1 World Drivers' Champion.\n\nResolves No otherwise. Source: official FIA classification.",
    category_slug: "sports",
    closes_in_days: 180,
    resolves_in_days: 200,
    resolution_source: "https://www.formula1.com/en/results",
  },
  {
    slug: "dune-part-three-700m-box-office",
    title: "Does Dune: Part Three gross at least $700M worldwide?",
    description:
      "Resolves Yes if Dune: Part Three reaches a worldwide theatrical gross of at least $700,000,000 USD within 180 days of its public theatrical release.\n\nResolves based on Box Office Mojo's final domestic + international totals.",
    category_slug: "pop-culture",
    closes_in_days: 90,
    resolves_in_days: 280,
    resolution_source: "https://www.boxofficemojo.com",
  },
  {
    slug: "taylor-swift-album-2026",
    title: "Does Taylor Swift release a new studio album in 2026?",
    description:
      "Resolves Yes if Taylor Swift releases a new full-length studio album (not a re-recording, EP, or compilation) between Jan 1, 2026 and Dec 31, 2026.\n\nResolves based on official announcements on her social channels and major digital storefronts (Spotify, Apple Music).",
    category_slug: "pop-culture",
    closes_in_days: 250,
    resolves_in_days: 260,
    resolution_source: "https://taylorswift.com",
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  // Pick an admin to credit as creator.
  const adminRows = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.is_admin, true))
    .limit(1);

  if (adminRows.length === 0) {
    console.error(
      "No admin user found. Run scripts/make-admin.ts <email> first.",
    );
    await client.end();
    process.exit(1);
  }
  const adminId = adminRows[0].id;
  console.log(`→ seeding as admin @${adminRows[0].username}`);

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
      created_by: adminId,
      resolution_source: s.resolution_source,
      closes_at: new Date(NOW + s.closes_in_days * DAY_MS),
      resolves_at: new Date(NOW + s.resolves_in_days * DAY_MS),
    }),
  );

  if (toInsert.length === 0) {
    console.log("✓ all 10 seed markets already present; nothing to do.");
  } else {
    await db.insert(markets).values(toInsert);
    console.log(`✓ inserted ${toInsert.length} markets.`);
    if (existingSlugs.size > 0) {
      console.log(`  (${existingSlugs.size} were already there, skipped)`);
    }
  }

  // Sanity touch: ensure we have categories that match.
  void and;
  await client.end();
}

main().catch((err) => {
  console.error("✗ seed failed");
  console.error(err);
  process.exit(1);
});
