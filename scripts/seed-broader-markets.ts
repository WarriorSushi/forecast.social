/**
 * Second wave of categories + markets — broadens the product beyond
 * the original four buckets (tech-ai, crypto, sports, pop-culture) so
 * forecast.social appeals to weather nerds, gamers, music fans,
 * finance heads, science twitter, and the cinema set, not just crypto
 * + AI tech bros.
 *
 *   pnpm tsx scripts/seed-broader-markets.ts
 *
 * Inserts 6 new categories (idempotent via ON CONFLICT) and ~50 new
 * markets, skipping any slugs already in the markets table.
 */
import { config as loadEnv } from "dotenv";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories, markets, users } from "../src/lib/db/schema";

loadEnv({ path: ".env.local" });
loadEnv();

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

type NewCategory = {
  slug: string;
  name: string;
  description: string;
  sort_order: number;
};

const NEW_CATEGORIES: NewCategory[] = [
  {
    slug: "science",
    name: "Science",
    description:
      "Discoveries, missions, and breakthroughs across space, biology, and physics.",
    sort_order: 5,
  },
  {
    slug: "business",
    name: "Business",
    description:
      "IPOs, earnings, macro calls, and the moves shaping the global economy.",
    sort_order: 6,
  },
  {
    slug: "climate",
    name: "Climate",
    description:
      "Temperature records, storms, energy transitions, and the planet's vitals.",
    sort_order: 7,
  },
  {
    slug: "gaming",
    name: "Gaming",
    description:
      "Releases, sales milestones, and the cultural moments of video games.",
    sort_order: 8,
  },
  {
    slug: "entertainment",
    name: "Entertainment",
    description:
      "Box office, streaming, awards, and the verdicts of mainstream culture.",
    sort_order: 9,
  },
  {
    slug: "music",
    name: "Music",
    description:
      "Album drops, tour announcements, chart races, and award show calls.",
    sort_order: 10,
  },
];

type SeedMarket = {
  slug: string;
  title: string;
  description: string;
  category_slug: string;
  closes_in_days: number;
  resolves_in_days: number;
  resolution_source: string;
};

const SEEDS: SeedMarket[] = [
  // ============ TECH / AI (3 new — gemini-4, databricks, openai-ipo skipped as dupes) ============
  {
    slug: "nvidia-rubin-shipping-2026",
    title:
      "Will NVIDIA's Rubin systems be shipping to a hyperscaler before December 1, 2026?",
    description:
      "Resolves Yes if at least one of AWS, Microsoft Azure, Google Cloud, or Oracle Cloud announces that NVIDIA Rubin-based instances (VR200 / NVL72 or successor SKU) are generally available to customers before 23:59 UTC on Nov 30, 2026.\n\nInternal-only deployments do not count.",
    category_slug: "tech-ai",
    closes_in_days: 195,
    resolves_in_days: 200,
    resolution_source: "https://nvidianews.nvidia.com/",
  },
  {
    slug: "iphone-fold-announced-2026",
    title:
      "Will Apple officially announce a foldable iPhone before November 1, 2026?",
    description:
      "Resolves Yes if Apple, at a keynote or via apple.com newsroom, formally unveils a foldable iPhone product (any name) with a confirmed release window before 23:59 UTC on Oct 31, 2026.\n\nSupply-chain leaks and analyst reports do not count.",
    category_slug: "tech-ai",
    closes_in_days: 165,
    resolves_in_days: 170,
    resolution_source: "https://www.apple.com/newsroom/",
  },
  {
    slug: "waymo-overseas-launch-2026",
    title:
      "Will Waymo open a paid public robotaxi service outside North America before February 1, 2027?",
    description:
      "Resolves Yes if Waymo launches a paid, public (non-waitlist-gated) robotaxi service available via its app in any city outside the US, Canada, or Mexico before 23:59 UTC on Jan 31, 2027.\n\nClosed pilots and employee-only rides do not count.",
    category_slug: "tech-ai",
    closes_in_days: 256,
    resolves_in_days: 258,
    resolution_source: "https://waymo.com/blog/",
  },
  {
    slug: "tesla-optimus-paid-customer-2026",
    title:
      "Will Tesla announce a paying commercial customer for Optimus before January 1, 2027?",
    description:
      "Resolves Yes if Tesla, via earnings call, SEC filing, or official tesla.com post, names at least one paying external customer that has taken delivery of Optimus robots before 23:59 UTC on Dec 31, 2026.\n\nInternal Tesla factory deployment does not count.",
    category_slug: "tech-ai",
    closes_in_days: 225,
    resolves_in_days: 230,
    resolution_source: "https://ir.tesla.com/press",
  },

  // ============ CRYPTO (4 new) ============
  {
    slug: "solana-spot-etf-approved-2026",
    title:
      "Will a spot Solana ETF begin trading on a US exchange before December 1, 2026?",
    description:
      "Resolves Yes if the US SEC approves a spot Solana ETF (not futures-based) for trading on NYSE Arca, Nasdaq, or Cboe BZX, and the ETF begins trading before 23:59 UTC on Nov 30, 2026.",
    category_slug: "crypto",
    closes_in_days: 195,
    resolves_in_days: 197,
    resolution_source: "https://www.sec.gov/news/pressreleases",
  },
  {
    slug: "xrp-above-5-by-end-2026",
    title: "Will XRP close above $5.00 on any day before January 1, 2027?",
    description:
      "Resolves Yes if XRP's daily closing price on CoinGecko exceeds $5.00 USD on at least one day between resolution and Dec 31, 2026 23:59 UTC.",
    category_slug: "crypto",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.coingecko.com/en/coins/xrp",
  },
  {
    slug: "stablecoin-supply-300b-by-2027",
    title:
      "Will total stablecoin market cap exceed $300 billion before January 1, 2027?",
    description:
      "Resolves Yes if the aggregate stablecoin market capitalization, as reported by DefiLlama's Stablecoins dashboard, exceeds $300B USD on any day before 23:59 UTC on Dec 31, 2026.",
    category_slug: "crypto",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://defillama.com/stablecoins",
  },
  {
    slug: "btc-dominance-below-50-2026",
    title:
      "Will Bitcoin's market-cap dominance drop below 50% on any day before January 1, 2027?",
    description:
      "Resolves Yes if Bitcoin's share of total crypto market capitalization on CoinGecko's Global page falls below 50.0% on at least one day before 23:59 UTC on Dec 31, 2026.",
    category_slug: "crypto",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.coingecko.com/en/global-charts",
  },

  // ============ SPORTS (4 new — alcaraz-wimbledon-2026 and thunder-repeat dupes skipped) ============
  {
    slug: "hurricanes-stanley-cup-2026",
    title: "Will the Carolina Hurricanes win the 2026 Stanley Cup?",
    description:
      "Resolves Yes if the Carolina Hurricanes are awarded the Stanley Cup at the conclusion of the 2026 NHL playoffs (scheduled to conclude no later than June 21, 2026).",
    category_slug: "sports",
    closes_in_days: 12,
    resolves_in_days: 34,
    resolution_source: "https://www.nhl.com/news/2026-stanley-cup-playoffs",
  },
  {
    slug: "england-world-cup-final-2026",
    title: "Will England reach the 2026 FIFA World Cup Final?",
    description:
      "Resolves Yes if the England national team plays in the FIFA World Cup 2026 Final on July 19, 2026 at MetLife Stadium.\n\nResolves No otherwise, including elimination at any earlier stage.",
    category_slug: "sports",
    closes_in_days: 40,
    resolves_in_days: 62,
    resolution_source:
      "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
  },
  {
    slug: "vingegaard-tour-de-france-2026",
    title: "Will Jonas Vingegaard win the 2026 Tour de France?",
    description:
      "Resolves Yes if Jonas Vingegaard wins the general classification at the 2026 Tour de France (final stage in Paris, July 26, 2026).",
    category_slug: "sports",
    closes_in_days: 60,
    resolves_in_days: 69,
    resolution_source: "https://www.letour.fr/en/",
  },
  {
    slug: "dodgers-world-series-2026",
    title: "Will the Los Angeles Dodgers win the 2026 MLB World Series?",
    description:
      "Resolves Yes if the Los Angeles Dodgers are crowned 2026 World Series champions (Series to conclude no later than November 5, 2026).",
    category_slug: "sports",
    closes_in_days: 155,
    resolves_in_days: 170,
    resolution_source: "https://www.mlb.com/world-series",
  },

  // ============ POP CULTURE (4 new — beyonce act-iii skipped as dup) ============
  {
    slug: "spider-man-brand-new-day-1b-2026",
    title:
      "Will 'Spider-Man: Brand New Day' gross over $1B globally before January 1, 2027?",
    description:
      "Resolves Yes if the worldwide theatrical gross of Spider-Man: Brand New Day (Sony/Marvel, released July 31, 2026) exceeds $1.000 billion USD on Box Office Mojo before 23:59 UTC on Dec 31, 2026.",
    category_slug: "pop-culture",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.boxofficemojo.com/release/rl3823600641/",
  },
  {
    slug: "vmas-vanguard-sabrina-2026",
    title:
      "Will Sabrina Carpenter receive the MTV Video Vanguard Award at the 2026 VMAs?",
    description:
      "Resolves Yes if MTV announces Sabrina Carpenter as the 2026 Video Vanguard Award recipient at the September 27, 2026 ceremony.",
    category_slug: "pop-culture",
    closes_in_days: 130,
    resolves_in_days: 132,
    resolution_source: "https://www.mtv.com/vma",
  },
  {
    slug: "2026-song-1b-streams",
    title:
      "Will any song first released in 2026 hit 1 billion Spotify streams before January 1, 2027?",
    description:
      "Resolves Yes if at least one track first released in calendar year 2026 reaches 1.0 billion streams on Spotify (as reflected on the artist's official Spotify page or Kworb tracking) before 23:59 UTC on Dec 31, 2026.",
    category_slug: "pop-culture",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://kworb.net/spotify/songs.html",
  },
  {
    slug: "mrbeast-500m-subs-2026",
    title:
      "Will MrBeast's main YouTube channel surpass 500 million subscribers before January 1, 2027?",
    description:
      "Resolves Yes if the official MrBeast YouTube channel reaches 500,000,000 subscribers (as shown on the channel page) before 23:59 UTC on Dec 31, 2026.",
    category_slug: "pop-culture",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.youtube.com/@MrBeast",
  },

  // ============ SCIENCE (6 new) ============
  {
    slug: "starship-orbital-refuel-2026",
    title:
      "Will SpaceX complete a Starship-to-Starship orbital propellant transfer before January 1, 2027?",
    description:
      "Resolves Yes if SpaceX successfully transfers propellant between two Starship vehicles in orbit, as confirmed by SpaceX on spacex.com or @SpaceX, before 23:59 UTC on Dec 31, 2026.\n\nInternal tank-to-tank transfers within a single Starship do not count.",
    category_slug: "science",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.spacex.com/updates/",
  },
  {
    slug: "jwst-biosignature-confirmed-2026",
    title:
      "Will JWST data lead to a peer-reviewed claim of confirmed biosignatures before January 1, 2027?",
    description:
      "Resolves Yes if a peer-reviewed paper indexed on NASA ADS or published in Nature/Science explicitly claims confirmed (not 'possible' or 'tentative') biosignature detection on any exoplanet using JWST data before 23:59 UTC on Dec 31, 2026.",
    category_slug: "science",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://ui.adsabs.harvard.edu/",
  },
  {
    slug: "new-glenn-5-launches-2026",
    title:
      "Will Blue Origin's New Glenn complete at least 5 successful orbital launches in 2026?",
    description:
      "Resolves Yes if New Glenn completes 5 or more successful orbital launches (payload successfully deployed) between Jan 1 and Dec 31, 2026, per Blue Origin's mission log.",
    category_slug: "science",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.blueorigin.com/news",
  },
  {
    slug: "private-fusion-q-above-1-2026",
    title:
      "Will any private fusion company announce sustained Q > 1 ignition before January 1, 2027?",
    description:
      "Resolves Yes if any private fusion company (e.g., Commonwealth Fusion Systems, Helion, TAE Technologies, Tokamak Energy) announces an independently-verifiable plasma shot with Q > 1 sustained for at least 1 second before 23:59 UTC on Dec 31, 2026.\n\nNational lab announcements (e.g., NIF) do not count.",
    category_slug: "science",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.fusionindustryassociation.org/news",
  },
  {
    slug: "h5n1-human-cluster-2026",
    title:
      "Will the WHO confirm sustained human-to-human H5N1 transmission before January 1, 2027?",
    description:
      "Resolves Yes if the World Health Organization issues a Disease Outbreak News bulletin or DG statement confirming sustained (>2 generations) human-to-human H5N1 transmission before 23:59 UTC on Dec 31, 2026.",
    category_slug: "science",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source:
      "https://www.who.int/emergencies/disease-outbreak-news",
  },
  {
    slug: "starship-flight-20-success-2026",
    title:
      "Will any Starship test flight (#20 or later) achieve full mission success before January 1, 2027?",
    description:
      "Resolves Yes if any Starship integrated test flight numbered 20 or higher launches and completes its full announced mission profile (including booster recovery and ship splashdown/recovery as planned) before 23:59 UTC on Dec 31, 2026.",
    category_slug: "science",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.spacex.com/launches/",
  },

  // ============ BUSINESS (4 new — databricks, openai-ipo skipped as dupes) ============
  {
    slug: "fed-cuts-september-2026",
    title:
      "Will the Federal Reserve cut rates at the September 15-16, 2026 FOMC meeting?",
    description:
      "Resolves Yes if the FOMC statement issued on September 16, 2026 announces a cut (any size) to the federal funds target range.\n\nResolves No if the rate is held or raised.",
    category_slug: "business",
    closes_in_days: 119,
    resolves_in_days: 121,
    resolution_source:
      "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
  },
  {
    slug: "nvidia-5t-market-cap-2026",
    title:
      "Will NVIDIA's market cap exceed $5 trillion on any day before January 1, 2027?",
    description:
      "Resolves Yes if NVIDIA's closing market cap on any US trading day before Dec 31, 2026 exceeds $5.000 trillion USD per CompaniesMarketCap.com or Yahoo Finance.",
    category_slug: "business",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://companiesmarketcap.com/nvidia/marketcap/",
  },
  {
    slug: "tesla-byd-q3-deliveries-2026",
    title: "Will Tesla deliver more BEVs than BYD in Q3 2026?",
    description:
      "Resolves Yes if Tesla's Q3 2026 (July-September) battery-electric vehicle deliveries reported on ir.tesla.com exceed BYD's Q3 2026 pure-BEV (not PHEV) deliveries reported in BYD's monthly sales releases.",
    category_slug: "business",
    closes_in_days: 145,
    resolves_in_days: 165,
    resolution_source: "https://ir.tesla.com/press",
  },
  {
    slug: "gold-4000-by-end-2026",
    title:
      "Will spot gold close above $4,000 per ounce on any day before January 1, 2027?",
    description:
      "Resolves Yes if the London PM Fix or spot XAU/USD close on any trading day before Dec 31, 2026 exceeds $4,000.00 per troy ounce.",
    category_slug: "business",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source:
      "https://www.lbma.org.uk/prices-and-data/precious-metal-prices",
  },

  // ============ CLIMATE (5 new) ============
  {
    slug: "atlantic-14-named-storms-2026",
    title:
      "Will the 2026 Atlantic hurricane season produce 14 or more named storms?",
    description:
      "Resolves Yes if NOAA's National Hurricane Center end-of-season report for the 2026 Atlantic hurricane season (June 1 - November 30, 2026) lists 14 or more named tropical storms or hurricanes.",
    category_slug: "climate",
    closes_in_days: 195,
    resolves_in_days: 210,
    resolution_source: "https://www.nhc.noaa.gov/",
  },
  {
    slug: "strong-el-nino-2026",
    title:
      "Will NOAA classify the 2026 El Niño as 'strong' or 'very strong' before January 1, 2027?",
    description:
      "Resolves Yes if NOAA's Climate Prediction Center ENSO Diagnostic Discussion classifies the active El Niño event as 'strong' or 'very strong' (ONI >= +1.5°C) in any monthly update before 23:59 UTC on Dec 31, 2026.",
    category_slug: "climate",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source:
      "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml",
  },
  {
    slug: "2026-warmest-year-on-record",
    title: "Will 2026 be ranked the warmest calendar year on record by NASA GISS?",
    description:
      "Resolves Yes if NASA GISS's annual global temperature analysis for 2026 (typically published in January 2027) ranks 2026 as the warmest year in the instrumental record.",
    category_slug: "climate",
    closes_in_days: 225,
    resolves_in_days: 245,
    resolution_source: "https://data.giss.nasa.gov/gistemp/",
  },
  {
    slug: "atlantic-cat5-2026",
    title: "Will at least one Category 5 hurricane form in the Atlantic basin in 2026?",
    description:
      "Resolves Yes if NOAA's National Hurricane Center classifies any 2026 Atlantic-basin tropical cyclone as Category 5 (sustained winds >= 157 mph) at any point during the storm's lifecycle before 23:59 UTC on Nov 30, 2026.",
    category_slug: "climate",
    closes_in_days: 195,
    resolves_in_days: 197,
    resolution_source: "https://www.nhc.noaa.gov/",
  },
  {
    slug: "global-coal-demand-declines-2026",
    title:
      "Will the IEA report global coal demand declined year-over-year in 2026?",
    description:
      "Resolves Yes if the International Energy Agency's annual Coal Report (or equivalent statement) for 2026 indicates that global coal demand in 2026 fell below 2025's level.",
    category_slug: "climate",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.iea.org/reports/coal",
  },

  // ============ GAMING (5 new) ============
  {
    slug: "gta6-launches-november-2026",
    title: "Will Grand Theft Auto VI launch on consoles before December 1, 2026?",
    description:
      "Resolves Yes if Grand Theft Auto VI is released for purchase on PlayStation 5 or Xbox Series X|S before 23:59 UTC on Nov 30, 2026.\n\nPre-orders, betas, and early access do not count.",
    category_slug: "gaming",
    closes_in_days: 195,
    resolves_in_days: 197,
    resolution_source: "https://www.rockstargames.com/VI",
  },
  {
    slug: "gta6-pc-port-announced-2026",
    title:
      "Will Rockstar announce a PC version of GTA VI with a release date before January 1, 2027?",
    description:
      "Resolves Yes if Rockstar Games publishes an official announcement (rockstargames.com or @RockstarGames) of GTA VI on PC with a specific release date or quarter before 23:59 UTC on Dec 31, 2026.",
    category_slug: "gaming",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.rockstargames.com/newswire",
  },
  {
    slug: "switch-2-35m-sales-2026",
    title:
      "Will Nintendo Switch 2 lifetime sales exceed 35 million before January 1, 2027?",
    description:
      "Resolves Yes if Nintendo's quarterly financial report covering any period ending on or before Dec 31, 2026 reports cumulative Switch 2 hardware sales above 35.00 million units.",
    category_slug: "gaming",
    closes_in_days: 225,
    resolves_in_days: 240,
    resolution_source:
      "https://www.nintendo.co.jp/ir/en/finance/hard_soft/",
  },
  {
    slug: "gta6-game-of-the-year-2026",
    title: "Will Grand Theft Auto VI win Game of the Year at The Game Awards 2026?",
    description:
      "Resolves Yes if Grand Theft Auto VI is announced as Game of the Year at The Game Awards ceremony in December 2026.\n\nResolves No if GTA VI is not nominated or not released in time for eligibility.",
    category_slug: "gaming",
    closes_in_days: 200,
    resolves_in_days: 210,
    resolution_source: "https://thegameawards.com/",
  },
  {
    slug: "fable-launches-2026",
    title: "Will Microsoft's 'Fable' reboot launch before January 1, 2027?",
    description:
      "Resolves Yes if Playground Games' Fable is released for sale on Xbox Series X|S or PC before 23:59 UTC on Dec 31, 2026.\n\nClosed betas and early access do not count.",
    category_slug: "gaming",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.xbox.com/en-US/games/fable",
  },

  // ============ ENTERTAINMENT (6 new) ============
  {
    slug: "dune-3-700m-2026",
    title:
      "Will 'Dune: Part Three' gross over $700M globally before January 1, 2027?",
    description:
      "Resolves Yes if the worldwide theatrical gross of Dune: Part Three (Warner Bros, release date Dec 18, 2026) exceeds $700.0 million USD on Box Office Mojo before 23:59 UTC on Dec 31, 2026.",
    category_slug: "entertainment",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.boxofficemojo.com/",
  },
  {
    slug: "the-bear-comedy-emmy-2026",
    title:
      "Will 'The Bear' win Outstanding Comedy Series at the 2026 Emmys?",
    description:
      "Resolves Yes if FX/Hulu's 'The Bear' wins Outstanding Comedy Series at the 78th Primetime Emmy Awards on September 14, 2026.",
    category_slug: "entertainment",
    closes_in_days: 117,
    resolves_in_days: 119,
    resolution_source: "https://www.emmys.com/",
  },
  {
    slug: "summer-2026-box-office-4-4b",
    title:
      "Will the US summer 2026 box office (May 1 - Sept 1) exceed $4.4 billion?",
    description:
      "Resolves Yes if cumulative domestic theatrical box office between May 1 and Sept 1, 2026 exceeds $4.400 billion USD per Box Office Mojo's Summer 2026 report.",
    category_slug: "entertainment",
    closes_in_days: 105,
    resolves_in_days: 110,
    resolution_source: "https://www.boxofficemojo.com/season/summer/2026/",
  },
  {
    slug: "toy-story-5-beats-mario-2026",
    title:
      "Will 'Toy Story 5' out-gross 'The Super Mario Galaxy Movie' domestically by January 1, 2027?",
    description:
      "Resolves Yes if the US domestic theatrical gross of Pixar's Toy Story 5 exceeds The Super Mario Galaxy Movie's US domestic gross on Box Office Mojo before 23:59 UTC on Dec 31, 2026.",
    category_slug: "entertainment",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.boxofficemojo.com/",
  },
  {
    slug: "2026-booker-debut-novelist",
    title: "Will the 2026 Booker Prize be awarded to a debut novelist?",
    description:
      "Resolves Yes if the author named 2026 Booker Prize winner on November 9, 2026 has no prior published novel listed on their official Booker bibliography.",
    category_slug: "entertainment",
    closes_in_days: 173,
    resolves_in_days: 175,
    resolution_source:
      "https://thebookerprizes.com/the-booker-library/prize-years/2026",
  },
  {
    slug: "severance-drama-emmy-2026",
    title:
      "Will 'Severance' win Outstanding Drama Series at the 2026 Emmys?",
    description:
      "Resolves Yes if Apple TV+'s 'Severance' wins Outstanding Drama Series at the 78th Primetime Emmy Awards on September 14, 2026.",
    category_slug: "entertainment",
    closes_in_days: 117,
    resolves_in_days: 119,
    resolution_source: "https://www.emmys.com/",
  },

  // ============ MUSIC (5 new) ============
  {
    slug: "country-4-weeks-hot100-2026",
    title:
      "Will a country song top the Billboard Hot 100 for 4+ consecutive weeks in 2026?",
    description:
      "Resolves Yes if any song classified as 'country' on Billboard's Hot 100 chart holds the #1 position for 4 or more consecutive weeks at any point between resolution and Dec 31, 2026.",
    category_slug: "music",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.billboard.com/charts/hot-100/",
  },
  {
    slug: "kendrick-album-2026",
    title: "Will Kendrick Lamar release a new studio album before January 1, 2027?",
    description:
      "Resolves Yes if Kendrick Lamar releases a new full-length studio album (not a remix, deluxe edition, or compilation) for sale or streaming via official channels before 23:59 UTC on Dec 31, 2026.",
    category_slug: "music",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://oklama.com/",
  },
  {
    slug: "rihanna-r9-released-2026",
    title:
      "Will Rihanna release R9, her ninth studio album, before January 1, 2027?",
    description:
      "Resolves Yes if Rihanna releases a new full-length studio album (her first since Anti, 2016) for sale or streaming via official channels before 23:59 UTC on Dec 31, 2026.",
    category_slug: "music",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.rihannanow.com/",
  },
  {
    slug: "spotify-wrapped-taylor-2026",
    title:
      "Will Taylor Swift end 2026 as Spotify's #1 most-streamed artist globally?",
    description:
      "Resolves Yes if Spotify's official 'Wrapped 2026' announcement (typically released early December 2026) names Taylor Swift the most-streamed global artist of 2026.",
    category_slug: "music",
    closes_in_days: 195,
    resolves_in_days: 200,
    resolution_source: "https://newsroom.spotify.com/",
  },
  {
    slug: "tour-grosses-500m-2026",
    title: "Will any 2026 concert tour gross over $500M before January 1, 2027?",
    description:
      "Resolves Yes if Billboard Boxscore or Pollstar reports at least one tour with a cumulative 2026 gross above $500.0 million USD before 23:59 UTC on Dec 31, 2026.",
    category_slug: "music",
    closes_in_days: 225,
    resolves_in_days: 227,
    resolution_source: "https://www.billboard.com/c/touring/",
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  // -- 1. Insert categories (ON CONFLICT DO UPDATE so re-runs refresh
  // description/sort_order without erroring on existing primary key)
  console.log(`→ inserting ${NEW_CATEGORIES.length} new categories…`);
  for (const c of NEW_CATEGORIES) {
    await db.execute(sql`
      insert into public.categories (slug, name, description, sort_order)
      values (${c.slug}, ${c.name}, ${c.description}, ${c.sort_order})
      on conflict (slug) do update set
        name = excluded.name,
        description = excluded.description,
        sort_order = excluded.sort_order
    `);
  }

  // -- 2. Find admin to credit as market author
  const adminRows = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.is_admin, true))
    .limit(1);
  if (adminRows.length === 0) {
    console.error("✗ no admin user found");
    await client.end();
    process.exit(1);
  }
  const adminId = adminRows[0].id;
  console.log(`→ seeding ${SEEDS.length} markets as @${adminRows[0].username}`);

  // -- 3. Skip slugs already in the markets table
  const slugs = SEEDS.map((s) => s.slug);
  const existing = await db
    .select({ slug: markets.slug })
    .from(markets)
    .where(inArray(markets.slug, slugs));
  const have = new Set(existing.map((r) => r.slug));

  const toInsert = SEEDS.filter((s) => !have.has(s.slug)).map((s) => ({
    slug: s.slug,
    title: s.title,
    description: s.description,
    category_slug: s.category_slug,
    created_by: adminId,
    resolution_source: s.resolution_source,
    closes_at: new Date(NOW + s.closes_in_days * DAY_MS),
    resolves_at: new Date(NOW + s.resolves_in_days * DAY_MS),
  }));

  if (toInsert.length === 0) {
    console.log("✓ all markets already present, nothing to insert");
  } else {
    await db.insert(markets).values(toInsert);
    console.log(`✓ inserted ${toInsert.length} markets`);
    if (have.size > 0) {
      console.log(`  (${have.size} already existed, skipped)`);
    }
  }

  // -- 4. Show category breakdown
  const counts = await db.execute(sql`
    select c.slug, c.name, count(m.id)::int as open_count
    from public.categories c
    left join public.markets m
      on m.category_slug = c.slug and m.resolved_at is null
    group by c.slug, c.name, c.sort_order
    order by c.sort_order
  `);
  console.log("\n→ open markets per category:");
  for (const row of counts as unknown as Array<{
    slug: string;
    name: string;
    open_count: number;
  }>) {
    console.log(`  ${row.name.padEnd(16)} ${row.open_count}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error("✗ seed failed");
  console.error(err);
  process.exit(1);
});
