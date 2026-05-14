/**
 * Promote a user to admin by email or username.
 *
 *   pnpm tsx scripts/make-admin.ts test@test.com
 *   pnpm tsx scripts/make-admin.ts --username warriorsushi
 *
 * Uses the service-role Supabase client so it can join `auth.users.email`
 * → `public.users.id`. Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";

import { users } from "../src/lib/db/schema";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Usage: pnpm tsx scripts/make-admin.ts <email | --username <handle>>",
    );
    process.exit(2);
  }

  let userId: string | null = null;
  let resolvedAs = "";

  if (args[0] === "--username") {
    const handle = args[1];
    if (!handle) {
      console.error("Pass a username after --username.");
      process.exit(2);
    }
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL missing.");
    const client = postgres(url, { max: 1 });
    const db = drizzle(client);
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, handle))
      .limit(1);
    await client.end();
    if (rows.length === 0) {
      console.error(`No user with username @${handle}.`);
      process.exit(1);
    }
    userId = rows[0].id;
    resolvedAs = `@${handle}`;
  } else {
    const email = args[0];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    // Use the admin listUsers API; filter client-side since Supabase Auth
    // doesn't expose a server-side filter by email in v2.
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw error;
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!match) {
      console.error(`No auth user with email ${email}.`);
      process.exit(1);
    }
    userId = match.id;
    resolvedAs = email;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing.");
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  const result = await db
    .update(users)
    .set({ is_admin: true })
    .where(eq(users.id, userId!))
    .returning({ username: users.username });
  await client.end();

  if (result.length === 0) {
    console.error(
      "Auth user exists but no profile row found. The handle_new_auth_user trigger should have created one. Check DB.",
    );
    process.exit(1);
  }

  console.log(`✓ promoted ${resolvedAs} (@${result[0].username}) to admin.`);
}

main().catch((err) => {
  console.error("✗ failed");
  console.error(err);
  process.exit(1);
});
