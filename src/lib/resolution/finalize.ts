import "server-only";

import { and, desc, eq, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { markets, market_resolutions, predictions } from "@/lib/db/schema";
import { createNotifications } from "@/lib/notifications";
import { recomputeUsersForMarket } from "@/lib/scoring/recompute";
import { wasCorrect } from "@/lib/scoring/score";

export async function finalizeMarketResolution(input: {
  marketId: string;
  outcome: "yes" | "no" | "invalid";
  resolvedBy: string | null;
  resolver: "admin" | "automation";
  notes: string | null;
  evidence?: Record<string, unknown> | null;
}) {
  const [market] = await db
    .select({ id: markets.id, slug: markets.slug, title: markets.title, closesAt: markets.closes_at })
    .from(markets)
    .where(eq(markets.id, input.marketId))
    .limit(1);
  if (!market) throw new Error("Market not found.");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(market_resolutions).values({
      market_id: input.marketId,
      outcome: input.outcome,
      resolved_by: input.resolvedBy,
      resolver: input.resolver,
      notes: input.notes,
      evidence: input.evidence ?? null,
      resolved_at: now,
    });
    await tx
      .update(markets)
      .set({
        outcome: input.outcome,
        resolved_at: now,
        updated_at: now,
        resolution_status: "resolved",
        resolution_evidence: input.evidence ?? null,
        resolution_checked_at: now,
      })
      .where(eq(markets.id, input.marketId));
  });

  const affectedUsers = await recomputeUsersForMarket(input.marketId);
  if (input.outcome !== "invalid") {
    const latestPredictions = await db
      .selectDistinctOn([predictions.user_id], {
        userId: predictions.user_id,
        probability: predictions.probability,
      })
      .from(predictions)
      .where(and(eq(predictions.market_id, input.marketId), lt(predictions.created_at, market.closesAt)))
      .orderBy(predictions.user_id, desc(predictions.created_at));
    await createNotifications(
      latestPredictions.map((prediction) => ({
        userId: prediction.userId,
        payload: {
          kind: "market_resolved" as const,
          market_slug: market.slug,
          market_title: market.title,
          outcome: input.outcome as "yes" | "no",
          user_call: prediction.probability,
          was_correct: wasCorrect(prediction.probability, input.outcome === "yes"),
        },
      })),
    );
  }

  revalidatePath(`/markets/${market.slug}`);
  revalidatePath("/markets");
  revalidatePath("/leaderboard");
  revalidatePath("/feed");
  revalidatePath("/notifications");
  return { affectedUsers, marketSlug: market.slug };
}
