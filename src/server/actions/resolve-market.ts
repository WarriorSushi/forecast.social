"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { markets, market_resolutions } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { recomputeUsersForMarket } from "@/lib/scoring/recompute";

const schema = z.object({
  marketId: z.string().uuid("Invalid market reference."),
  outcome: z.enum(["yes", "no", "invalid"]),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

type ResolveResult =
  | { status: "ok"; affectedUsers: number; outcome: "yes" | "no" | "invalid" }
  | { status: "error"; message: string };

/**
 * Admin-only. Marks the market resolved, writes an audit row, then
 * synchronously recomputes Forecast Scores for every predictor. SCORING.md
 * §10 also calls for a nightly cron — that's a follow-up; on-resolution
 * recompute covers the user-visible case.
 *
 * Idempotent enough: re-resolving with a new outcome overwrites the
 * market state and re-runs scoring. The audit log preserves history.
 */
export async function resolveMarket(formData: FormData): Promise<ResolveResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { status: "error", message: "Sign in required." };
  }
  if (!profile.is_admin) {
    return { status: "error", message: "Admin only." };
  }

  const parsed = schema.safeParse({
    marketId: formData.get("marketId")?.toString() ?? "",
    outcome: formData.get("outcome")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const [market] = await db
    .select({ id: markets.id, slug: markets.slug })
    .from(markets)
    .where(eq(markets.id, parsed.data.marketId))
    .limit(1);
  if (!market) {
    return { status: "error", message: "Market not found." };
  }

  const now = new Date();

  await db.insert(market_resolutions).values({
    market_id: parsed.data.marketId,
    outcome: parsed.data.outcome,
    resolved_by: profile.id,
    notes: parsed.data.notes,
    resolved_at: now,
  });

  await db
    .update(markets)
    .set({
      outcome: parsed.data.outcome,
      resolved_at: now,
      updated_at: now,
    })
    .where(eq(markets.id, parsed.data.marketId));

  const affectedUsers = await recomputeUsersForMarket(parsed.data.marketId);

  revalidatePath(`/markets/${market.slug}`);
  revalidatePath("/markets");
  revalidatePath("/leaderboard");
  revalidatePath("/feed");

  return {
    status: "ok",
    affectedUsers,
    outcome: parsed.data.outcome,
  };
}
