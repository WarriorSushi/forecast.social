// "server-only" import is intentionally omitted. recompute is called
// from server components / server actions (where the surrounding file
// already enforces server context) AND from CLI scripts under /scripts
// that run via tsx. Adding "server-only" here would throw at load time
// when the script tries to import it.
import { and, asc, eq, isNotNull, ne, sql } from "drizzle-orm";

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
const RECOMPUTE_CONCURRENCY = 4;

type RecomputeOptions = {
  stampPredictions?: boolean;
};

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
export async function recomputeUserScore(
  userId: string,
  options: RecomputeOptions = {},
): Promise<void> {
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
  if (options.stampPredictions !== false) {
    await stampPredictionScoring(userId);
  }

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

  // Per-category scores.
  const byCategory = new Map<string, Prediction[]>();
  for (const r of scoringRows) {
    const arr = byCategory.get(r.category_slug) ?? [];
    arr.push({ probability: r.probability, outcome: r.outcome });
    byCategory.set(r.category_slug, arr);
  }

  const categoryValues: (typeof user_category_scores.$inferInsert)[] = [];
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

    categoryValues.push({
      user_id: userId,
      category_slug: categorySlug,
      score: catScore,
      resolved_count: preds.length,
      correct_count: correct,
      avg_brier: avgBrier,
      updated_at: new Date(),
    });
  }

  // Keep the global score and its category breakdown atomic. Deleting stale
  // category rows is important when a market is re-resolved as invalid.
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        forecast_score: publicScore,
        current_streak: streaks.current,
        longest_streak: Math.max(streaks.longest, 0),
        correct_predictions: correctCount,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    await tx
      .delete(user_category_scores)
      .where(eq(user_category_scores.user_id, userId));

    if (categoryValues.length > 0) {
      await tx.insert(user_category_scores).values(categoryValues);
    }
  });

  // Milestone fan-out happens only after the score transaction commits.
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
}

/**
 * Stamps brier + was_correct + resolved_at onto every resolved
 * prediction this user has. Used both during full-user recompute and
 * during the per-market resolution flow.
 */
async function stampPredictionScoring(userId: string): Promise<void> {
  await db.execute(sql`
    update predictions as p
    set
      brier = case
        when m.outcome = 'invalid' then null
        when m.outcome = 'yes' then power(p.probability - 1.0, 2)::real
        when m.outcome = 'no' then power(p.probability, 2)::real
        else null
      end,
      was_correct = case
        when m.outcome = 'yes' then p.probability > 0.5
        when m.outcome = 'no' then p.probability < 0.5
        else null
      end,
      resolved_at = case
        when m.outcome in ('yes', 'no') then m.resolved_at
        else null
      end
    from markets as m
    where p.market_id = m.id
      and p.user_id = ${userId}
      and m.resolved_at is not null
  `);
}

async function stampMarketPredictionScoring(marketId: string): Promise<void> {
  await db.execute(sql`
    update predictions as p
    set
      brier = case
        when m.outcome = 'invalid' then null
        when m.outcome = 'yes' then power(p.probability - 1.0, 2)::real
        when m.outcome = 'no' then power(p.probability, 2)::real
        else null
      end,
      was_correct = case
        when m.outcome = 'yes' then p.probability > 0.5
        when m.outcome = 'no' then p.probability < 0.5
        else null
      end,
      resolved_at = case
        when m.outcome in ('yes', 'no') then m.resolved_at
        else null
      end
    from markets as m
    where p.market_id = m.id
      and m.id = ${marketId}
      and m.resolved_at is not null
  `);
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

  await stampMarketPredictionScoring(marketId);
  await recomputeUsers(userIds);
  return userIds.length;
}

export async function recomputeAllActiveUsers(): Promise<number> {
  const rows = await db
    .selectDistinct({ user_id: predictions.user_id })
    .from(predictions)
    .innerJoin(markets, eq(predictions.market_id, markets.id))
    .where(and(isNotNull(markets.resolved_at), ne(markets.outcome, "invalid")));

  const userIds = rows.map((row) => row.user_id);
  await recomputeUsers(userIds);
  return userIds.length;
}

async function recomputeUsers(userIds: string[]): Promise<void> {
  for (let index = 0; index < userIds.length; index += RECOMPUTE_CONCURRENCY) {
    const batch = userIds.slice(index, index + RECOMPUTE_CONCURRENCY);
    await Promise.all(
      batch.map((userId) =>
        recomputeUserScore(userId, { stampPredictions: false }),
      ),
    );
  }
}
