import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * Liveness + readiness probe. Reports app version (commit-ish) and DB
 * connectivity. Used by uptime monitors and Vercel's health checks.
 *
 * Returns 503 when the DB ping fails — that's the difference between
 * "process is up" and "ready to serve traffic."
 */
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let dbMessage: string | undefined;
  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch (err) {
    dbMessage = err instanceof Error ? err.message : "db ping failed";
  }

  const body = {
    status: dbOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    latency_ms: Date.now() - startedAt,
    components: {
      db: dbOk ? "ok" : "down",
      ...(dbMessage ? { db_message: dbMessage } : {}),
    },
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: dbOk ? 200 : 503,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
