import "server-only";

import { and, desc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { markets, market_resolutions, predictions } from "@/lib/db/schema";
import { createNotifications } from "@/lib/notifications";
import { recomputeUsersForMarket } from "@/lib/scoring/recompute";
import { wasCorrect } from "@/lib/scoring/score";

type ResolutionOutcome = "yes" | "no" | "invalid";
const STALE_LEASE_MS = 15 * 60 * 1000;

type ResolutionWork = {
  resolutionId: string;
  marketId: string;
  marketSlug: string;
  marketTitle: string;
  closesAt: Date;
  outcome: ResolutionOutcome;
  resolvedAt: Date;
};

export async function finalizeMarketResolution(input: {
  marketId: string;
  outcome: ResolutionOutcome;
  resolvedBy: string | null;
  resolver: "admin" | "automation";
  notes: string | null;
  evidence?: Record<string, unknown> | null;
  allowCorrection?: boolean;
  useExistingLease?: boolean;
}) {
  const now = new Date();
  const work = await db.transaction(async (tx) => {
    // Serialize admin and automation decisions for this market. The lock lives
    // only for this short state transition; scoring happens after commit.
    await tx.execute(
      sql`select id from public.markets where id = ${input.marketId} for update`,
    );

    const [market] = await tx
      .select({
        id: markets.id,
        slug: markets.slug,
        title: markets.title,
        closesAt: markets.closes_at,
        resolvedAt: markets.resolved_at,
        resolutionStatus: markets.resolution_status,
        resolutionLockedAt: markets.resolution_locked_at,
      })
      .from(markets)
      .where(eq(markets.id, input.marketId))
      .limit(1);
    if (!market) throw new Error("Market not found.");

    const leaseIsFresh =
      market.resolutionStatus === "resolving" &&
      market.resolutionLockedAt != null &&
      now.getTime() - new Date(market.resolutionLockedAt).getTime() <
        STALE_LEASE_MS;
    if (leaseIsFresh && !input.useExistingLease) {
      throw new Error("This market is already being resolved. Try again shortly.");
    }
    if (market.resolvedAt && !input.allowCorrection) {
      throw new Error("This market has already been resolved.");
    }

    const [resolution] = await tx
      .insert(market_resolutions)
      .values({
        market_id: input.marketId,
        outcome: input.outcome,
        resolved_by: input.resolvedBy,
        resolver: input.resolver,
        notes: input.notes,
        evidence: input.evidence ?? null,
        resolved_at: now,
      })
      .returning({ id: market_resolutions.id });

    await tx
      .update(markets)
      .set({
        outcome: input.outcome,
        resolved_at: now,
        updated_at: now,
        // "resolving" means the outcome is committed but retryable score and
        // notification effects have not all completed yet.
        resolution_status: "resolving",
        resolution_evidence: input.evidence ?? null,
        resolution_checked_at: now,
        resolution_locked_at: now,
      })
      .where(eq(markets.id, input.marketId));

    return {
      resolutionId: resolution.id,
      marketId: market.id,
      marketSlug: market.slug,
      marketTitle: market.title,
      closesAt: market.closesAt,
      outcome: input.outcome,
      resolvedAt: now,
    } satisfies ResolutionWork;
  });

  return processResolutionEffects(work);
}

/** Retry the current committed resolution after a worker crash or timeout. */
export async function retryResolutionEffects(marketId: string) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_LEASE_MS);
  const [claimed] = await db
    .update(markets)
    .set({ resolution_status: "resolving", resolution_locked_at: now })
    .where(
      and(
        eq(markets.id, marketId),
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
    .returning({
      id: markets.id,
      slug: markets.slug,
      title: markets.title,
      closesAt: markets.closes_at,
      outcome: markets.outcome,
      resolvedAt: markets.resolved_at,
    });
  if (!claimed?.resolvedAt || !claimed.outcome) return null;

  const [resolution] = await db
    .select({ id: market_resolutions.id })
    .from(market_resolutions)
    .where(eq(market_resolutions.market_id, claimed.id))
    .orderBy(desc(market_resolutions.resolved_at))
    .limit(1);
  if (!resolution) {
    await db
      .update(markets)
      .set({ resolution_status: "failed", resolution_locked_at: null })
      .where(
        and(
          eq(markets.id, claimed.id),
          eq(markets.resolved_at, claimed.resolvedAt),
        ),
      );
    return null;
  }

  return processResolutionEffects({
    resolutionId: resolution.id,
    marketId: claimed.id,
    marketSlug: claimed.slug,
    marketTitle: claimed.title,
    closesAt: claimed.closesAt,
    outcome: claimed.outcome,
    resolvedAt: claimed.resolvedAt,
  });
}

async function processResolutionEffects(work: ResolutionWork) {
  try {
    const affectedUsers = await recomputeUsersForMarket(work.marketId);
    if (work.outcome !== "invalid") {
      const latestPredictions = await db
        .selectDistinctOn([predictions.user_id], {
          userId: predictions.user_id,
          probability: predictions.probability,
        })
        .from(predictions)
        .where(
          and(
            eq(predictions.market_id, work.marketId),
            lt(predictions.created_at, work.closesAt),
          ),
        )
        .orderBy(predictions.user_id, desc(predictions.created_at));
      await createNotifications(
        latestPredictions.map((prediction) => ({
          userId: prediction.userId,
          dedupeKey: `market-resolution:${work.resolutionId}:${prediction.userId}`,
          payload: {
            kind: "market_resolved" as const,
            market_slug: work.marketSlug,
            market_title: work.marketTitle,
            outcome: work.outcome as "yes" | "no",
            user_call: prediction.probability,
            was_correct: wasCorrect(
              prediction.probability,
              work.outcome === "yes",
            ),
          },
        })),
      );
    }

    await db
      .update(markets)
      .set({
        resolution_status: "resolved",
        resolution_locked_at: null,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(markets.id, work.marketId),
          eq(markets.resolved_at, work.resolvedAt),
        ),
      );
    revalidateResolutionPaths(work.marketSlug);
    return {
      affectedUsers,
      marketSlug: work.marketSlug,
      effectsPending: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown post-resolution error";
    await db
      .update(markets)
      .set({
        resolution_status: "failed",
        resolution_locked_at: null,
        resolution_checked_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(markets.id, work.marketId),
          eq(markets.resolved_at, work.resolvedAt),
        ),
      );
    console.error("[resolution] post-processing queued for retry", {
      marketId: work.marketId,
      resolutionId: work.resolutionId,
      error: message,
    });
    revalidateResolutionPaths(work.marketSlug);
    return {
      affectedUsers: 0,
      marketSlug: work.marketSlug,
      effectsPending: true,
    };
  }
}

function revalidateResolutionPaths(slug: string) {
  revalidatePath(`/markets/${slug}`);
  revalidatePath("/markets");
  revalidatePath("/leaderboard");
  revalidatePath("/feed");
  revalidatePath("/notifications");
}
