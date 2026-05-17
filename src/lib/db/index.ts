// "server-only" import is intentionally omitted so CLI scripts under
// /scripts can import db without throwing at module load. App-code
// usage is server-side (server components, server actions) by where
// the imports live — no client component imports this file.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

/**
 * Single postgres client per Node.js process, reused across requests.
 *
 * Cached on globalThis so Next.js Fast Refresh / Turbopack module re-
 * evaluation doesn't open a new pool each cycle — Supabase's free-tier
 * direct connection has tight slot limits and we'd exhaust them in
 * minutes otherwise.
 *
 * `max: 5` is a conservative cap suitable for a single dev process and
 * Supabase's direct connection. Production with the pooler should be
 * fine at this level too.
 */
declare global {
  var __forecast_db__: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.__forecast_db__ ??
  postgres(env.DATABASE_URL, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__forecast_db__ = client;
}

export const db = drizzle(client, { schema });
export type Db = typeof db;
