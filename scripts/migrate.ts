/**
 * Applies every migration in /drizzle in journal order against DATABASE_URL.
 *
 *   pnpm migrate          → run against .env.local (dev)
 *   DATABASE_URL=... pnpm migrate  → run against an arbitrary target
 *
 * Uses postgres-js with max:1 because Supabase rejects too many concurrent
 * migration connections, and the migrator only needs one.
 */
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required.");
  }

  const safeUrl = url.replace(/:[^:@/]+@/, ":***@");
  console.log(`→ migrating ${safeUrl}`);

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await sql.end();

  console.log("✓ migrations applied");
}

main().catch((err) => {
  console.error("✗ migration failed");
  console.error(err);
  process.exit(1);
});
