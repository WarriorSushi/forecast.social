"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { markets, predictions } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { SubmitPredictionState } from "./predictions.types";

const submitSchema = z.object({
  marketId: z.string().uuid("Invalid market reference."),
  probability: z
    .number()
    .min(0, "Probability must be between 0 and 100.")
    .max(1, "Probability must be between 0 and 100."),
});

export async function submitPrediction(
  _prev: SubmitPredictionState,
  formData: FormData,
): Promise<SubmitPredictionState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { status: "error", message: "Sign in to lock in a call." };
  }

  const limit = rateLimit({
    actor: profile.id,
    action: "submitPrediction",
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return {
      status: "error",
      message: "Slow down — too many calls. Try again in a minute.",
    };
  }

  const rawProb = Number(formData.get("probability"));
  const probability = Number.isFinite(rawProb) ? rawProb / 100 : NaN;

  const parsed = submitSchema.safeParse({
    marketId: formData.get("marketId")?.toString() ?? "",
    probability,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  // Verify the market is open + unresolved before inserting. The RLS policy
  // enforces this too, but we want a nicer error message for the user.
  const [market] = await db
    .select({
      id: markets.id,
      slug: markets.slug,
      closes_at: markets.closes_at,
      resolved_at: markets.resolved_at,
    })
    .from(markets)
    .where(eq(markets.id, parsed.data.marketId))
    .limit(1);

  if (!market) {
    return { status: "error", message: "Market not found." };
  }
  if (market.resolved_at) {
    return { status: "error", message: "This market is already resolved." };
  }
  if (new Date(market.closes_at).getTime() <= Date.now()) {
    return { status: "error", message: "This market has closed." };
  }

  try {
    await db.insert(predictions).values({
      market_id: parsed.data.marketId,
      user_id: profile.id,
      probability: parsed.data.probability,
      // consensus_at_time is snapshotted by the BEFORE INSERT trigger.
    });
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error ? err.message : "Could not save your call.",
    };
  }

  revalidatePath(`/markets/${market.slug}`);
  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/markets");
  revalidatePath("/feed");

  return {
    status: "success",
    probability: parsed.data.probability,
  };
}

/**
 * Loads the signed-in user's most recent prediction on a given market, if
 * any. Used by the market detail page to pre-position the slider.
 */
export async function getMyLatestPrediction(marketId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [latest] = await db
    .select({
      id: predictions.id,
      probability: predictions.probability,
      consensus_at_time: predictions.consensus_at_time,
      created_at: predictions.created_at,
    })
    .from(predictions)
    .where(
      and(
        eq(predictions.market_id, marketId),
        eq(predictions.user_id, profile.id),
      ),
    )
    .orderBy(desc(predictions.created_at))
    .limit(1);

  return latest ?? null;
}
