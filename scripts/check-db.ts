/**
 * One-shot sanity check: counts categories and prints sample rows.
 * Use after migrate to confirm the seed landed and RLS isn't blocking us
 * (this connects as postgres, which bypasses RLS — exactly what we want).
 */
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories } from "../src/lib/db/schema";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql);

  const cats = await db.select().from(categories);
  console.log(`categories: ${cats.length} rows`);
  for (const c of cats) {
    console.log(`  ${c.sort_order}. ${c.slug.padEnd(12)} — ${c.name}`);
  }

  const userCount = await sql`select count(*)::int as n from public.users`;
  console.log(`public.users: ${userCount[0].n} rows`);

  const triggerExists = await sql`
    select tgname from pg_trigger
    where tgname = 'on_auth_user_created'
  `;
  console.log(
    `on_auth_user_created trigger: ${triggerExists.length > 0 ? "present" : "MISSING"}`,
  );

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
