import { and, asc, eq, inArray, isNull, lte, ne, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { growth_events, markets } from "@/lib/db/schema";
import { evaluateHttpJsonResolution } from "@/lib/resolution/evaluate";
import { finalizeMarketResolution } from "@/lib/resolution/finalize";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const queue = await db
    .select({
      id: markets.id,
      title: markets.title,
      method: markets.resolution_method,
      config: markets.resolution_config,
      resolvesAt: markets.resolves_at,
    })
    .from(markets)
    .where(
      and(
        isNull(markets.resolved_at),
        inArray(markets.resolution_status, ["pending", "review", "failed"]),
        or(ne(markets.resolution_method, "manual"), lte(markets.resolves_at, now)),
      ),
    )
    .orderBy(asc(markets.resolves_at))
    .limit(20);

  const summary = { checked: 0, resolved: 0, review: 0, failed: 0 };
  for (const market of queue) {
    summary.checked += 1;
    if (market.method === "manual") {
      await db
        .update(markets)
        .set({ resolution_status: "review", resolution_checked_at: now })
        .where(eq(markets.id, market.id));
      summary.review += 1;
      continue;
    }

    const [locked] = await db
      .update(markets)
      .set({ resolution_status: "resolving", resolution_checked_at: now })
      .where(
        and(
          eq(markets.id, market.id),
          inArray(markets.resolution_status, ["pending", "review", "failed"]),
        ),
      )
      .returning({ id: markets.id });
    if (!locked) continue;

    try {
      const evaluation = await evaluateHttpJsonResolution({
        config: market.config,
        resolvesAt: market.resolvesAt,
        now,
      });
      if (evaluation.status === "pending") {
        await db
          .update(markets)
          .set({
            resolution_status: "pending",
            resolution_evidence: evaluation.evidence,
            resolution_checked_at: now,
          })
          .where(eq(markets.id, market.id));
        continue;
      }
      await finalizeMarketResolution({
        marketId: market.id,
        outcome: evaluation.outcome,
        resolvedBy: null,
        resolver: "automation",
        notes: "Resolved automatically from a configured machine-readable source.",
        evidence: evaluation.evidence,
      });
      await db.insert(growth_events).values({
        event: "market_auto_resolved",
        metadata: { marketId: market.id, outcome: evaluation.outcome },
      });
      summary.resolved += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown resolution error";
      await db
        .update(markets)
        .set({
          resolution_status: "failed",
          resolution_checked_at: now,
          resolution_evidence: { error: message, checkedAt: now.toISOString() },
        })
        .where(eq(markets.id, market.id));
      summary.failed += 1;
    }
  }

  return Response.json({ ok: true, ...summary });
}
