import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";

import { users } from "../src/lib/db/schema";

config({ path: ".env.local" });

async function main() {
  const c = postgres(process.env.DATABASE_URL!);
  const db = drizzle(c);
  const r = await db
    .select()
    .from(users)
    .where(eq(users.id, "f26508d0-0351-4856-93c1-163ec0a36d07"));
  console.log(JSON.stringify(r[0] ?? null, null, 2));
  await c.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
