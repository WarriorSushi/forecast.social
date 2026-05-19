/**
 * One-off: dump every market in the DB so we can audit for staleness.
 *
 *   pnpm tsx scripts/list-markets.ts
 */
import { config as loadEnv } from "dotenv";
import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { markets } from "../src/lib/db/schema";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  const rows = await db
    .select({
      slug: markets.slug,
      title: markets.title,
      category: markets.category_slug,
      closes_at: markets.closes_at,
      resolved_at: markets.resolved_at,
      prediction_count: markets.prediction_count,
    })
    .from(markets)
    .orderBy(asc(markets.created_at));

  console.log(`\nTotal: ${rows.length} markets\n`);
  for (const r of rows) {
    const closes = r.closes_at.toISOString().slice(0, 10);
    const status = r.resolved_at ? "RESOLVED" : "open";
    const cat = r.category.padEnd(11);
    console.log(`  [${cat}] ${r.slug}`);
    console.log(`              ${r.title}`);
    console.log(`              closes=${closes}  ${status}  calls=${r.prediction_count}`);
    console.log("");
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
