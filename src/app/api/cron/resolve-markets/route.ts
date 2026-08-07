import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { growth_events, markets } from "@/lib/db/schema";
import { evaluateHttpJsonResolution } from "@/lib/resolution/evaluate";
import {
  finalizeMarketResolution,
  retryResolutionEffects,
} from "@/lib/resolution/finalize";

export const runtime = "nodejs";
export const maxDuration = 60;

const LEASE_MS = 15 * 60 * 1000;
const SOURCE_BATCH_SIZE = 6;
const RETRY_BATCH_SIZE = 4;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const staleBefore = new Date(now.getTime() - LEASE_MS);
  const summary = {
    checked: 0,
    resolved: 0,
    review: 0,
    failed: 0,
    effectsRetried: 0,
    effectsPending: 0,
  };

  // Retry committed outcomes whose idempotent scoring/notification effects
  // were interrupted. A stale resolving lease is safe to reclaim.
  const retryQueue = await db
    .select({ id: markets.id })
    .from(markets)
    .where(
      and(
        isNotNull(markets.resolved_at),
        or(
          eq(markets.resolution_status, "failed"),
          and(
            eq(markets.resolution_status, "resolving"),
            or(
              isNull(markets.resolution_locked_at),
              lt(markets.resolution_locked_at, staleBefore),
            ),
          ),
        ),
      ),
    )
    .orderBy(asc(markets.resolution_checked_at))
    .limit(RETRY_BATCH_SIZE);
  for (const market of retryQueue) {
    const retried = await retryResolutionEffects(market.id);
    if (!retried) continue;
    summary.effectsRetried += 1;
    if (retried.effectsPending) summary.effectsPending += 1;
  }

  // Manual work is escalated once, outside the automatic source queue. Rows
  // already in review never consume the limited automatic batch again.
  const manualReviews = await db
    .update(markets)
    .set({
      resolution_status: "review",
      resolution_checked_at: now,
      resolution_locked_at: null,
    })
    .where(
      and(
        isNull(markets.resolved_at),
        eq(markets.resolution_method, "manual"),
        inArray(markets.resolution_status, ["pending", "failed"]),
        lte(markets.resolves_at, now),
      ),
    )
    .returning({ id: markets.id });
  summary.review = manualReviews.length;

  const queue = await db
    .select({
      id: markets.id,
      config: markets.resolution_config,
      resolvesAt: markets.resolves_at,
    })
    .from(markets)
    .where(
      and(
        isNull(markets.resolved_at),
        eq(markets.resolution_method, "http_json"),
        or(
          inArray(markets.resolution_status, ["pending", "failed"]),
          and(
            eq(markets.resolution_status, "resolving"),
            or(
              isNull(markets.resolution_locked_at),
              lt(markets.resolution_locked_at, staleBefore),
            ),
          ),
        ),
      ),
    )
    .orderBy(asc(markets.resolves_at))
    .limit(SOURCE_BATCH_SIZE);

  for (const market of queue) {
    const [claimed] = await db
      .update(markets)
      .set({
        resolution_status: "resolving",
        resolution_checked_at: now,
        resolution_locked_at: now,
      })
      .where(
        and(
          eq(markets.id, market.id),
          isNull(markets.resolved_at),
          or(
            inArray(markets.resolution_status, ["pending", "failed"]),
            and(
              eq(markets.resolution_status, "resolving"),
              or(
                isNull(markets.resolution_locked_at),
                lt(markets.resolution_locked_at, staleBefore),
              ),
            ),
          ),
        ),
      )
      .returning({ id: markets.id });
    if (!claimed) continue;
    summary.checked += 1;

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
            resolution_locked_at: null,
          })
          .where(and(eq(markets.id, market.id), isNull(markets.resolved_at)));
        continue;
      }

      const result = await finalizeMarketResolution({
        marketId: market.id,
        outcome: evaluation.outcome,
        resolvedBy: null,
        resolver: "automation",
        notes: "Resolved automatically from a configured machine-readable source.",
        evidence: evaluation.evidence,
        useExistingLease: true,
      });
      await db.insert(growth_events).values({
        event: "market_auto_resolved",
        metadata: {
          marketId: market.id,
          outcome: evaluation.outcome,
          effectsPending: result.effectsPending,
        },
      });
      summary.resolved += 1;
      if (result.effectsPending) summary.effectsPending += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown resolution error";
      await db
        .update(markets)
        .set({
          resolution_status: "failed",
          resolution_checked_at: now,
          resolution_locked_at: null,
          resolution_evidence: {
            error: message,
            checkedAt: now.toISOString(),
          },
        })
        .where(and(eq(markets.id, market.id), isNull(markets.resolved_at)));
      summary.failed += 1;
    }
  }

  return Response.json({ ok: true, ...summary });
}
