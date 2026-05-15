/**
 * Quickly seeds the admin's account with a small set of resolved
 * predictions so we can test the scoring math and the leaderboard end
 * to end. Uses the service-role connection to bypass the
 * "markets must be open" constraint when resolving immediately.
 *
 *   pnpm tsx scripts/seed-test-predictions.ts
 *
 * Idempotent enough for a dev seed — re-running adds new predictions
 * (admin user re-predicts) and re-resolves each market with the same
 * outcome (no scoring drift).
 */
import { config as loadEnv } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  markets,
  market_resolutions,
  predictions,
  users,
} from "../src/lib/db/schema";

loadEnv({ path: ".env.local" });
loadEnv();

// (slug, probability, outcome). Probability is what the admin user
// "called"; outcome is what the market actually resolves to. Five
// outcomes here, designed so the admin is mostly correct (a believable
// shape for a top-of-leaderboard test user).
const SCENARIOS: { slug: string; probability: number; outcome: "yes" | "no" }[] = [
  { slug: "claude-opus-5-before-q4-2026",      probability: 0.72, outcome: "yes" },
  { slug: "open-source-model-beats-gpt4-mmlu", probability: 0.58, outcome: "yes" },
  { slug: "btc-above-120k-eoy-2026",           probability: 0.34, outcome: "no" },
  { slug: "eth-flips-btc-marketcap-2026",      probability: 0.18, outcome: "no" },
  { slug: "world-cup-2026-winner-brazil",      probability: 0.41, outcome: "yes" }, // miss
  { slug: "f1-2026-verstappen-champion",       probability: 0.81, outcome: "yes" },
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
  console.log(`→ seeding test predictions for @${admin.username}`);

  const targetSlugs = SCENARIOS.map((s) => s.slug);
  const targetMarkets = await db
    .select({
      id: markets.id,
      slug: markets.slug,
      outcome: markets.outcome,
    })
    .from(markets)
    .where(inArray(markets.slug, targetSlugs));

  const bySlug = new Map(targetMarkets.map((m) => [m.slug, m]));

  const now = new Date();

  for (const scenario of SCENARIOS) {
    const m = bySlug.get(scenario.slug);
    if (!m) {
      console.warn(`  skip ${scenario.slug}: not seeded`);
      continue;
    }

    // Insert a prediction (the trigger handles consensus + counts).
    await db.insert(predictions).values({
      market_id: m.id,
      user_id: admin.id,
      probability: scenario.probability,
    });

    // Resolve if not already resolved (re-resolution would be a noop).
    if (m.outcome == null) {
      await db.insert(market_resolutions).values({
        market_id: m.id,
        outcome: scenario.outcome,
        resolved_by: admin.id,
        notes: "seeded by scripts/seed-test-predictions.ts",
        resolved_at: now,
      });
      await db
        .update(markets)
        .set({
          outcome: scenario.outcome,
          resolved_at: now,
          updated_at: now,
        })
        .where(eq(markets.id, m.id));
    }

    console.log(
      `  ${scenario.slug}: pred ${(scenario.probability * 100).toFixed(0)}% / outcome ${scenario.outcome}`,
    );
  }

  // Run the recompute via dynamic import so we don't bring the whole
  // server tree into this script's resolution graph.
  const { recomputeUserScore } = await import("../src/lib/scoring/recompute");
  await recomputeUserScore(admin.id);

  await client.end();
  console.log("✓ done. score recomputed.");
}

main().catch((err) => {
  console.error("✗ failed");
  console.error(err);
  process.exit(1);
});
