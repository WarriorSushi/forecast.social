import type { NextRequest } from "next/server";

import { env } from "@/lib/env";
import { recomputeAllActiveUsers } from "@/lib/scoring/recompute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (
    !env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`
  ) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const recomputedUsers = await recomputeAllActiveUsers();

  return Response.json({
    ok: true,
    recomputed_users: recomputedUsers,
    duration_ms: Date.now() - startedAt,
    completed_at: new Date().toISOString(),
  });
}
