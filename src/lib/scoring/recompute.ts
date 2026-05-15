// "server-only" import is intentionally omitted. recompute is called
// from server components / server actions (where the surrounding file
// already enforces server context) AND from CLI scripts under /scripts
// that run via tsx. Adding "server-only" here would throw at load time
// when the script tries to import it.
import { and, asc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  markets,
  predictions,
  user_category_scores,
  users,
} from "@/lib/db/schema";
import { createNotification } from "@/lib/notifications";
import {
  brier,
  computeForecastScore,
  computeStreaks,
  VOLUME_GATE,
  wasCorrect,
  type Prediction,
} from "./score";

const MILESTONES = [1500, 2000, 2500] as const;

/**
 * Recomputes a user's score from scratch. Reads every resolved
 * prediction the user has, applies the SCORING.md algorithm, and writes:
 *
 *   - users.forecast_score (gated by VOLUME_GATE — see SCORING.md §8)
 *   - users.current_streak, longest_streak
 *   - users.correct_predictions
 *   - user_category_scores per category present
 *
 * Idempotent: always reads predictions fresh, never trusts cached score.
 */
export async function recomputeUserScore(userId: string): Promise<void> {
  // Pull every prediction the user has on resolved, non-invalid markets.
  // For each market, take the user's latest submission before close.
  const rows = await db
    .select({
      market_id: predictions.market_id,
      probability: predictions.probability,
      created_at: predictions.created_at,
      outcome: markets.outcome,
      category_slug: markets.category_slug,
      closes_at: markets.closes_at,
      resolved_at: markets.resolved_at,
    })
    .from(predictions)
    .innerJoin(markets, eq(predictions.market_id, markets.id))
    .where(
      and(
        eq(predictions.user_id, userId),
        isNotNull(markets.resolved_at),
        ne(markets.outcome, "invalid"),
      ),
    )
    .orderBy(asc(predictions.created_at));

  // Keep only the user's most recent submission per market that was
  // submitted strictly before the market closed (SCORING.md §11).
  const latestPerMarket = new Map<
    string,
    {
      probability: number;
      outcome: "yes" | "no";
      resolved_at: Date;
      category_slug: string;
    }
  >();
  for (const r of rows) {
    if (r.outcome !== "yes" && r.outcome !== "no") continue;
    if (!r.resolved_at) continue;
    if (new Date(r.created_at) >= new Date(r.closes_at)) continue;
    latestPerMarket.set(r.market_id, {
      probability: r.probability,
      outcome: r.outcome,
      resolved_at: r.resolved_at,
      category_slug: r.category_slug,
    });
  }

  const scoringRows = Array.from(latestPerMarket.values());

  // Streaks: order by resolution time ascending. wasCorrect from
  // scoring/score for consistency.
  const streakRows = [...scoringRows]
    .sort((a, b) => new Date(a.resolved_at).getTime() - new Date(b.resolved_at).getTime())
    .map((p) => ({
      wasCorrect: wasCorrect(p.probability, p.outcome === "yes"),
    }));
  const streaks = computeStreaks(streakRows);

  // Last activity (most-recent prediction on ANY market, resolved or
  // not). Determines decay per SCORING.md §5.
  const [activity] = await db
    .select({
      latest: sql<Date>`MAX(${predictions.created_at})`,
    })
    .from(predictions)
    .where(eq(predictions.user_id, userId));
  const daysIdle = activity?.latest
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(activity.latest).getTime()) / 86_400_000),
      )
    : 0;

  // Backfill prediction.brier + was_correct + resolved_at for every
  // resolved prediction so the profile timeline can show correct/missed
  // pills without re-deriving the math at render time.
  await stampPredictionScoring(userId);

  // Global score.
  const globalPreds: Prediction[] = scoringRows.map((r) => ({
    probability: r.probability,
    outcome: r.outcome,
  }));

  const internalScore = computeForecastScore({
    predictions: globalPreds,
    currentStreak: streaks.current,
    daysIdle,
  });

  const ranked = globalPreds.length >= VOLUME_GATE;
  const publicScore = ranked ? internalScore : 0;

  const correctCount = streakRows.filter((r) => r.wasCorrect).length;

  // Read the previous score so we can detect milestone crossings.
  const [prev] = await db
    .select({ forecast_score: users.forecast_score })
    .from(users)
    .where(eq(users.id, userId));
  const previousScore = prev?.forecast_score ?? 0;

  await db
    .update(users)
    .set({
      forecast_score: publicScore,
      current_streak: streaks.current,
      longest_streak: Math.max(streaks.longest, 0),
      correct_predictions: correctCount,
      updated_at: new Date(),
    })
    .where(eq(users.id, userId));

  // Milestone fan-out: a user who crosses 1500 / 2000 / 2500 upward gets
  // a single notification per threshold per crossing. We only fire when
  // the previous score was BELOW the threshold and the new one is AT or
  // ABOVE; that gives idempotent behavior across re-resolutions.
  if (ranked) {
    for (const threshold of MILESTONES) {
      if (previousScore < threshold && publicScore >= threshold) {
        await createNotification(userId, {
          kind: "score_milestone",
          score: publicScore,
          threshold,
        });
      }
    }
  }

  // Per-category scores.
  const byCategory = new Map<string, Prediction[]>();
  for (const r of scoringRows) {
    const arr = byCategory.get(r.category_slug) ?? [];
    arr.push({ probability: r.probability, outcome: r.outcome });
    byCategory.set(r.category_slug, arr);
  }

  for (const [categorySlug, preds] of byCategory) {
    const catStreakRows = [...scoringRows]
      .filter((r) => r.category_slug === categorySlug)
      .sort(
        (a, b) =>
          new Date(a.resolved_at).getTime() -
          new Date(b.resolved_at).getTime(),
      )
      .map((p) => ({
        wasCorrect: wasCorrect(p.probability, p.outcome === "yes"),
      }));
    const catStreaks = computeStreaks(catStreakRows);
    const catScore = computeForecastScore({
      predictions: preds,
      currentStreak: catStreaks.current,
      daysIdle,
    });
    const correct = catStreakRows.filter((r) => r.wasCorrect).length;
    const avgBrier =
      preds.reduce(
        (sum, p) => sum + brier(p.probability, p.outcome === "yes"),
        0,
      ) / preds.length;

    await db
      .insert(user_category_scores)
      .values({
        user_id: userId,
        category_slug: categorySlug,
        score: catScore,
        resolved_count: preds.length,
        correct_count: correct,
        avg_brier: avgBrier,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          user_category_scores.user_id,
          user_category_scores.category_slug,
        ],
        set: {
          score: catScore,
          resolved_count: preds.length,
          correct_count: correct,
          avg_brier: avgBrier,
          updated_at: new Date(),
        },
      });
  }
}

/**
 * Stamps brier + was_correct + resolved_at onto every resolved
 * prediction this user has. Used both during full-user recompute and
 * during the per-market resolution flow.
 */
async function stampPredictionScoring(userId: string): Promise<void> {
  const rows = await db
    .select({
      id: predictions.id,
      probability: predictions.probability,
      outcome: markets.outcome,
      resolved_at: markets.resolved_at,
    })
    .from(predictions)
    .innerJoin(markets, eq(predictions.market_id, markets.id))
    .where(
      and(eq(predictions.user_id, userId), isNotNull(markets.resolved_at)),
    );

  if (rows.length === 0) return;

  // Group updates by their stamped values to minimise round-trips.
  for (const r of rows) {
    if (r.outcome === "invalid" || !r.resolved_at) {
      // Clear scoring stamps on invalid markets so they don't pollute
      // future recomputes (SCORING.md §11 edge case).
      await db
        .update(predictions)
        .set({ brier: null, was_correct: null, resolved_at: null })
        .where(eq(predictions.id, r.id));
      continue;
    }
    if (r.outcome !== "yes" && r.outcome !== "no") continue;
    const b = brier(r.probability, r.outcome === "yes");
    const correct = wasCorrect(r.probability, r.outcome === "yes");
    await db
      .update(predictions)
      .set({
        brier: b,
        was_correct: correct,
        resolved_at: r.resolved_at,
      })
      .where(eq(predictions.id, r.id));
  }
}

/**
 * Recomputes scores for all users that have ANY prediction on a given
 * market. Called from the resolveMarket flow.
 */
export async function recomputeUsersForMarket(
  marketId: string,
): Promise<number> {
  const rows = await db
    .selectDistinct({ user_id: predictions.user_id })
    .from(predictions)
    .where(eq(predictions.market_id, marketId));

  const userIds = rows.map((r) => r.user_id);
  if (userIds.length === 0) return 0;

  // Run sequentially. Phase 3 has small N; we can parallelise later.
  for (const userId of userIds) {
    await recomputeUserScore(userId);
  }
  return userIds.length;
}

void inArray; // reserved for batched updates in Phase 5
