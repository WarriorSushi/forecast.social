"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Drop-in replacement for a single market's consensus stat. SSR hands
 * us the initial values; this client component subscribes to
 * postgres_changes on the row and re-renders when the trigger writes
 * new consensus_probability / prediction_count.
 *
 * V2.2: the "the number moves while you watch" moment. No animation
 * on swap yet; just a clean state update.
 */
export function LiveConsensus({
  marketId,
  initialConsensus,
  initialPredictionCount,
  renderMode,
}: {
  marketId: string;
  initialConsensus: number | null;
  initialPredictionCount: number;
  /** Which value to render. The same hook drives both spots on a market page. */
  renderMode: "consensus" | "count";
}) {
  const [consensus, setConsensus] = useState(initialConsensus);
  const [count, setCount] = useState(initialPredictionCount);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`market:${marketId}:consensus`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "markets",
          filter: `id=eq.${marketId}`,
        },
        (payload) => {
          const row = payload.new as {
            consensus_probability: number | null;
            prediction_count: number;
          };
          setConsensus(row.consensus_probability ?? null);
          setCount(row.prediction_count ?? 0);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [marketId]);

  if (renderMode === "consensus") {
    const pct = consensus != null ? Math.round(consensus * 100) : null;
    return <>{pct != null ? `${pct}%` : "—"}</>;
  }
  return <>{count.toLocaleString()}</>;
}
