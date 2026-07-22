import "server-only";

import { cache } from "react";
import { and, eq, isNull, lt, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { markets, predictions, users } from "@/lib/db/schema";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getPredictionReceipt = cache(async (id: string) => {
  if (!UUID_PATTERN.test(id)) return null;

  const [row] = await db
    .select({
      id: predictions.id,
      probability: predictions.probability,
      consensus_at_time: predictions.consensus_at_time,
      brier: predictions.brier,
      was_correct: predictions.was_correct,
      created_at: predictions.created_at,
      market_slug: markets.slug,
      market_title: markets.title,
      market_outcome: markets.outcome,
      market_resolved_at: markets.resolved_at,
      market_closes_at: markets.closes_at,
      market_resolves_at: markets.resolves_at,
      resolution_source: markets.resolution_source,
      user_username: users.username,
      user_id: users.id,
      user_display_name: users.display_name,
      user_avatar_url: users.avatar_url,
    })
    .from(predictions)
    .innerJoin(markets, eq(predictions.market_id, markets.id))
    .innerJoin(users, eq(predictions.user_id, users.id))
    .where(
      and(
        eq(predictions.id, id),
        lt(predictions.created_at, markets.closes_at),
        or(
          isNull(markets.resolved_at),
          lt(predictions.created_at, markets.resolved_at),
        ),
      ),
    )
    .limit(1);

  return row ?? null;
});
