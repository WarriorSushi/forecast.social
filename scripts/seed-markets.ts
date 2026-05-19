/**
 * Seeds the markets table with the launch set across four categories.
 * Skips any market whose slug already exists, so safe to re-run.
 *
 *   pnpm tsx scripts/seed-markets.ts
 *
 * Requires an admin to exist (see scripts/make-admin.ts); the script
 * picks the first admin it finds as `created_by`.
 */
import { config as loadEnv } from "dotenv";
import { eq, inArray } from "drizzle-orm";
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
  // ============ TECH / AI ============
  {
    slug: "claude-5-released-by-oct-2026",
    title: "Will Anthropic release a model branded 'Claude 5' before October 1, 2026?",
    description:
      "Resolves Yes if Anthropic publicly releases a generally-available model marketed as Claude 5, Claude 5.x, or any major version number above 4.x on the Anthropic API or claude.ai before 23:59 UTC on Sep 30, 2026.\n\nInternal previews, research betas, or codenamed unreleased models do not count unless renamed and shipped GA.",
    category_slug: "tech-ai",
    closes_in_days: 130,
    resolves_in_days: 135,
    resolution_source: "https://www.anthropic.com/news",
  },
  {
    slug: "gpt-6-released-by-2026-end",
    title: "Will OpenAI ship GPT-6 to the public before January 1, 2027?",
    description:
      "Resolves Yes if OpenAI launches a generally-available model branded 'GPT-6' (any tier) on chatgpt.com or the OpenAI API before 23:59 UTC on Dec 31, 2026.\n\nGPT-5.5 and incremental dot-releases do not count. Limited research previews count only if pricing and a public model card are posted.",
    category_slug: "tech-ai",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source: "https://openai.com/blog",
  },
  {
    slug: "gemini-4-announced-by-feb-2027",
    title: "Will Google announce Gemini 4 before February 1, 2027?",
    description:
      "Resolves Yes if Google or Google DeepMind makes an official public announcement of a Gemini 4 (Pro/Flash/Ultra) model before 23:59 UTC on Jan 31, 2027.\n\nGemini 3.x releases (including 3.5, 3.7, etc.) do not satisfy. Blog post or keynote suffices; GA shipping not required.",
    category_slug: "tech-ai",
    closes_in_days: 252,
    resolves_in_days: 257,
    resolution_source: "https://blog.google/technology/google-deepmind/",
  },
  {
    slug: "swe-bench-pro-85-by-jan-2027",
    title: "Will any AI model score 85%+ on SWE-bench Pro before January 1, 2027?",
    description:
      "Resolves Yes if any model (any company) posts a verified score of 85.0% or greater on the SWE-bench Pro public leaderboard before 23:59 UTC on Dec 31, 2026.\n\nScore must appear on the official Scale leaderboard.",
    category_slug: "tech-ai",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source: "https://labs.scale.com/leaderboard/swe_bench_pro_public",
  },
  {
    slug: "openai-files-s1-by-2027",
    title: "Will OpenAI publicly file an S-1 (IPO prospectus) before February 1, 2027?",
    description:
      "Resolves Yes if OpenAI (or its capped-profit / PBC parent) files an S-1 or F-1 with the U.S. SEC before 23:59 UTC on Jan 31, 2027.\n\nResolves No if only a confidential draft (DRS) is filed, or no filing exists.",
    category_slug: "tech-ai",
    closes_in_days: 252,
    resolves_in_days: 257,
    resolution_source:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=openai",
  },
  {
    slug: "databricks-ipo-by-2026-end",
    title: "Will Databricks complete its IPO before January 1, 2027?",
    description:
      "Resolves Yes if Databricks shares begin trading on a U.S. national securities exchange (NYSE or Nasdaq) before 23:59 ET on Dec 31, 2026.\n\nDirect listing counts. A confidential filing or pricing without a first trade does not.",
    category_slug: "tech-ai",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=databricks",
  },
  {
    slug: "siri-2-ships-by-oct-2026",
    title: "Will Apple ship the redesigned Siri to consumers before October 1, 2026?",
    description:
      "Resolves Yes if Apple releases the LLM-rebuilt Siri to non-beta production iOS users before 23:59 UTC on Sep 30, 2026.\n\nDeveloper or public betas do not count; the final 'Release' build pushed via Software Update is required.",
    category_slug: "tech-ai",
    closes_in_days: 130,
    resolves_in_days: 135,
    resolution_source: "https://www.apple.com/newsroom/",
  },
  {
    slug: "iphone-fold-ships-by-2026-end",
    title: "Will Apple ship the foldable iPhone to consumers before January 1, 2027?",
    description:
      "Resolves Yes if Apple's first foldable iPhone is available for purchase and delivery to retail customers before 23:59 ET on Dec 31, 2026.\n\nPre-orders without shipment do not count; first units in customers' hands is the standard.",
    category_slug: "tech-ai",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source: "https://www.apple.com/shop/buy-iphone",
  },
  {
    slug: "tesla-cybercab-1k-delivered",
    title: "Will Tesla deliver 1,000+ Cybercabs before January 1, 2027?",
    description:
      "Resolves Yes if Tesla confirms (via 10-Q, 10-K, earnings call, or official press release) that cumulative Cybercab deliveries exceed 1,000 units before 23:59 ET on Dec 31, 2026.\n\nProduction counts alone do not satisfy — units must be delivered to customers or operating in the Tesla Network.",
    category_slug: "tech-ai",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source: "https://ir.tesla.com/",
  },
  {
    slug: "eu-ai-act-first-gpai-fine",
    title: "Will the EU issue its first GPAI fine under the AI Act before February 1, 2027?",
    description:
      "Resolves Yes if the European Commission's AI Office publicly announces a monetary penalty against a general-purpose AI provider (OpenAI, Anthropic, Google, Meta, xAI, Mistral, etc.) under the AI Act before 23:59 CET on Jan 31, 2027.\n\nEnforcement begins Aug 2, 2026. Settlements with disclosed fine amounts count.",
    category_slug: "tech-ai",
    closes_in_days: 252,
    resolves_in_days: 257,
    resolution_source:
      "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
  },

  // ============ CRYPTO ============
  {
    slug: "btc-100k-by-aug-2026",
    title: "Will Bitcoin close above $100,000 on any day before September 1, 2026?",
    description:
      "Resolves Yes if the daily UTC close of BTC/USD on Coinbase is ≥ $100,000.00 on any calendar day between now and Aug 31, 2026 inclusive.\n\nIntra-day wicks do not count; the daily close is the bar.",
    category_slug: "crypto",
    closes_in_days: 100,
    resolves_in_days: 105,
    resolution_source: "https://www.coinbase.com/price/bitcoin",
  },
  {
    slug: "btc-new-ath-by-2026-end",
    title: "Will Bitcoin set a new all-time high before January 1, 2027?",
    description:
      "Resolves Yes if BTC/USD prints an intra-day price above the prior all-time high ($126,251 set in Oct 2025) at any point before 23:59 UTC on Dec 31, 2026.\n\nSource: CoinGecko's BTC all-time-high field. Wicks count.",
    category_slug: "crypto",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source: "https://www.coingecko.com/en/coins/bitcoin",
  },
  {
    slug: "eth-3k-by-oct-2026",
    title: "Will Ethereum close above $3,000 on any day before October 1, 2026?",
    description:
      "Resolves Yes if the daily UTC close of ETH/USD on Coinbase is ≥ $3,000.00 on any calendar day between now and Sep 30, 2026 inclusive.\n\nIntra-day spikes alone do not satisfy.",
    category_slug: "crypto",
    closes_in_days: 130,
    resolves_in_days: 135,
    resolution_source: "https://www.coinbase.com/price/ethereum",
  },
  {
    slug: "ibit-1m-btc-by-2026-end",
    title: "Will BlackRock's IBIT hold more than 1,000,000 BTC before January 1, 2027?",
    description:
      "Resolves Yes if BlackRock's iShares Bitcoin Trust (IBIT) reports holdings of more than 1,000,000 BTC on any published holdings update before 23:59 ET on Dec 31, 2026.",
    category_slug: "crypto",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source:
      "https://www.ishares.com/us/products/333011/ishares-bitcoin-trust",
  },
  {
    slug: "spot-xrp-etf-by-2026-end",
    title: "Will a spot XRP ETF begin trading on a U.S. exchange before January 1, 2027?",
    description:
      "Resolves Yes if at least one spot XRP exchange-traded product (not a futures or trust-based vehicle) lists and trades on NYSE, Nasdaq, or Cboe before 23:59 ET on Dec 31, 2026.\n\nApproval alone does not count — actual ticker trading is required.",
    category_slug: "crypto",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source: "https://www.sec.gov/news/pressreleases",
  },
  {
    slug: "genius-act-final-rules-by-jul-2026",
    title: "Will U.S. regulators issue final GENIUS Act stablecoin rules before August 1, 2026?",
    description:
      "Resolves Yes if the OCC, Federal Reserve, FDIC, or Treasury publish the final implementing regulations required by the GENIUS Act in the Federal Register before 23:59 ET on Jul 31, 2026.\n\nProposed or interim rules do not count.",
    category_slug: "crypto",
    closes_in_days: 70,
    resolves_in_days: 73,
    resolution_source:
      "https://www.federalregister.gov/agencies/comptroller-of-the-currency",
  },
  {
    slug: "ethereum-glamsterdam-by-2026-end",
    title: "Will Ethereum activate the Glamsterdam upgrade on mainnet before January 1, 2027?",
    description:
      "Resolves Yes if the Ethereum Foundation confirms the Glamsterdam hard fork has activated on mainnet (not testnets) before 23:59 UTC on Dec 31, 2026.",
    category_slug: "crypto",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source: "https://ethereum.org/roadmap/",
  },

  // ============ SPORTS ============
  {
    slug: "argentina-wins-2026-world-cup",
    title: "Will Argentina win the 2026 FIFA World Cup?",
    description:
      "Resolves Yes if Argentina lifts the trophy at the 2026 World Cup final on July 19, 2026 in New York-New Jersey.\n\nResolves No if any other team wins.",
    category_slug: "sports",
    closes_in_days: 23,
    resolves_in_days: 61,
    resolution_source:
      "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
  },
  {
    slug: "usa-reaches-2026-wc-quarterfinal",
    title: "Will the USMNT reach the 2026 World Cup quarterfinals?",
    description:
      "Resolves Yes if the United States men's national team advances to the quarterfinal stage (final 8) of the 2026 FIFA World Cup.\n\nElimination in the group stage, Round of 32, or Round of 16 resolves No.",
    category_slug: "sports",
    closes_in_days: 23,
    resolves_in_days: 50,
    resolution_source:
      "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
  },
  {
    slug: "okc-thunder-win-2026-nba-finals",
    title: "Will the Oklahoma City Thunder win the 2026 NBA Finals?",
    description:
      "Resolves Yes if OKC defeats their opponent 4 games to fewer in the 2026 NBA Finals, which begin June 3 and conclude no later than June 19, 2026.\n\nResolves No if their opponent wins.",
    category_slug: "sports",
    closes_in_days: 14,
    resolves_in_days: 31,
    resolution_source: "https://www.nba.com/playoffs/2026/nba-finals",
  },
  {
    slug: "antonelli-wins-2026-f1-title",
    title: "Will Kimi Antonelli win the 2026 F1 Drivers' Championship?",
    description:
      "Resolves Yes if Andrea Kimi Antonelli (Mercedes) is the highest-points driver after the final round of the 2026 Formula 1 season (Abu Dhabi GP, Dec 6, 2026).\n\nResolves per official FIA classification.",
    category_slug: "sports",
    closes_in_days: 180,
    resolves_in_days: 202,
    resolution_source: "https://www.formula1.com/en/results/2026/drivers",
  },
  {
    slug: "chiefs-win-super-bowl-lxi",
    title: "Will the Kansas City Chiefs win Super Bowl LXI?",
    description:
      "Resolves Yes if the Kansas City Chiefs are the winning team of Super Bowl LXI, played February 14, 2027 at SoFi Stadium.\n\nResolves No if any other team wins or if the Chiefs do not appear.",
    category_slug: "sports",
    closes_in_days: 252,
    resolves_in_days: 271,
    resolution_source: "https://www.nfl.com/super-bowl/",
  },
  {
    slug: "alcaraz-wins-wimbledon-2026",
    title: "Will Carlos Alcaraz win Wimbledon 2026?",
    description:
      "Resolves Yes if Carlos Alcaraz wins the 2026 Wimbledon men's singles title (final scheduled July 12, 2026).\n\nWithdrawal from the tournament or any loss prior to or in the final resolves No.",
    category_slug: "sports",
    closes_in_days: 23,
    resolves_in_days: 54,
    resolution_source: "https://www.wimbledon.com/en_GB/draws/index.html",
  },
  {
    slug: "arsenal-pl-leader-jan-2027",
    title: "Will Arsenal be top of the Premier League table on January 31, 2027?",
    description:
      "Resolves Yes if Arsenal is the highest-placed club in the 2026-27 Premier League standings as published on premierleague.com at 23:59 GMT on Jan 31, 2027.\n\nTies in points: resolves by the official tiebreaker order used on the league table (goal difference, then goals scored).",
    category_slug: "sports",
    closes_in_days: 100,
    resolves_in_days: 257,
    resolution_source: "https://www.premierleague.com/tables",
  },
  {
    slug: "aspinall-defends-ufc-hw-title",
    title: "Will Tom Aspinall successfully defend the UFC heavyweight title before January 1, 2027?",
    description:
      "Resolves Yes if Tom Aspinall defends his UFC heavyweight title in a sanctioned UFC bout and wins before 23:59 ET on Dec 31, 2026.\n\nA loss, vacating, or no fight booked and contested before the deadline resolves No.",
    category_slug: "sports",
    closes_in_days: 220,
    resolves_in_days: 226,
    resolution_source: "https://www.ufc.com/athlete/tom-aspinall",
  },

  // ============ POP CULTURE ============
  {
    slug: "avengers-doomsday-1b-by-2026-end",
    title: "Will 'Avengers: Doomsday' gross $1B+ worldwide before January 1, 2027?",
    description:
      "Resolves Yes if Marvel's Avengers: Doomsday (release date Dec 18, 2026) reports a worldwide theatrical gross of at least $1,000,000,000 USD on Box Office Mojo before 23:59 ET on Dec 31, 2026.\n\nDomestic-only totals do not satisfy.",
    category_slug: "pop-culture",
    closes_in_days: 210,
    resolves_in_days: 226,
    resolution_source: "https://www.boxofficemojo.com/title/tt9419884/",
  },
  {
    slug: "odyssey-best-picture-nom-2027",
    title: "Will Christopher Nolan's 'The Odyssey' be nominated for Best Picture at the 2027 Oscars?",
    description:
      "Resolves Yes if The Odyssey (Universal, July 17, 2026) appears in the list of Best Picture nominees announced by the Academy on January 22, 2027.\n\nNomination is the bar — winning is not required.",
    category_slug: "pop-culture",
    closes_in_days: 245,
    resolves_in_days: 248,
    resolution_source: "https://www.oscars.org/oscars/ceremonies/2027",
  },
  {
    slug: "taylor-swift-aoty-2027-grammys",
    title: "Will Taylor Swift win Album of the Year at the 2027 Grammys?",
    description:
      "Resolves Yes if Taylor Swift wins Album of the Year at the 69th Annual Grammy Awards, scheduled Feb 7, 2027, for any eligible album.\n\nThe eligibility window is Sep 1, 2025 – Aug 30, 2026. Resolves No otherwise.",
    category_slug: "pop-culture",
    closes_in_days: 252,
    resolves_in_days: 265,
    resolution_source: "https://www.grammy.com/awards",
  },
  {
    slug: "beyonce-act-iii-by-aug-2026",
    title: "Will Beyoncé release 'Act III' before September 1, 2026?",
    description:
      "Resolves Yes if Beyoncé officially releases the third album in her trilogy (following Renaissance / Cowboy Carter) on streaming services before 23:59 UTC on Aug 31, 2026.\n\nSingle drops, EPs, or visual albums of older material do not count — a full new studio album branded or positioned as Act III is required.",
    category_slug: "pop-culture",
    closes_in_days: 100,
    resolves_in_days: 105,
    resolution_source: "https://music.beyonce.com/",
  },
  {
    slug: "drop-dead-billboard-10-weeks",
    title: "Will Olivia Rodrigo's 'Drop Dead' spend 10+ weeks at #1 on the Billboard Hot 100?",
    description:
      "Resolves Yes if 'Drop Dead' accumulates 10 or more weeks at #1 on the Billboard Hot 100 chart before 23:59 ET on Nov 30, 2026.",
    category_slug: "pop-culture",
    closes_in_days: 192,
    resolves_in_days: 195,
    resolution_source: "https://www.billboard.com/charts/hot-100/",
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

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
  console.log(`→ seeding ${SEEDS.length} markets as admin @${adminRows[0].username}`);

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
    console.log(`✓ all ${SEEDS.length} seed markets already present; nothing to do.`);
  } else {
    await db.insert(markets).values(toInsert);
    console.log(`✓ inserted ${toInsert.length} markets.`);
    if (existingSlugs.size > 0) {
      console.log(`  (${existingSlugs.size} were already there, skipped)`);
    }
  }

  await client.end();
}

main().catch((err) => {
  console.error("✗ seed failed");
  console.error(err);
  process.exit(1);
});
