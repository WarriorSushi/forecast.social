import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

export type MarketCardData = {
  slug: string;
  title: string;
  category_slug: string;
  closes_at: Date;
  resolved_at: Date | null;
  outcome: "yes" | "no" | "invalid" | null;
  prediction_count: number;
  consensus_probability: number | null;
};

/**
 * Prediction card surface per DESIGN.md §6. Category overline, headline
 * in Geist 700, consensus + calls slots.
 *
 * The sparkline that used to render here was a flat placeholder line at
 * 50% on every card because per-market history data isn't piped into
 * the list query yet. Identical-card-grid violation per the impeccable
 * brand register — and actively misleading (read as "every market is
 * exactly at consensus 50% forever"). Sparkline now lives only on the
 * detail page where it has real series data; list cards lean on the
 * consensus number itself.
 */
export function MarketCard({ market }: { market: MarketCardData }) {
  const consensusPct =
    market.consensus_probability != null
      ? Math.round(market.consensus_probability * 100)
      : null;
  const status = derivedStatus(market);
  const isPredicted = market.prediction_count > 0;

  return (
    <Link href={`/markets/${market.slug}`} className="block group h-full">
      <Card className="bg-surface border-border group-hover:border-border-strong transition-colors gap-0 py-0 rounded-2xl h-full">
        <CardContent className="px-6 py-6 flex flex-col gap-5 h-full">
          <div className="flex items-center justify-between text-muted-foreground min-h-[24px]">
            <span className="text-overline">{categoryLabel(market.category_slug)}</span>
            <StatusBadge status={status} />
          </div>

          <h3 className="font-display text-title text-foreground -tracking-[0.015em] leading-[1.2]">
            {market.title}
          </h3>

          {isPredicted ? (
            <div className="mt-auto grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-overline text-muted-foreground">consensus</p>
                <p className="mt-1 font-display text-headline tabular-nums text-foreground">
                  {consensusPct != null ? `${consensusPct}%` : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-overline text-muted-foreground">calls</p>
                <p className="mt-1 font-mono text-headline tabular-nums text-foreground">
                  {market.prediction_count.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-auto pt-4 border-t border-border flex items-baseline justify-between">
              <p className="text-body-sm text-muted-foreground">No calls yet.</p>
              <p className="text-body-sm text-foreground font-medium">
                Be the first →
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function derivedStatus(market: MarketCardData):
  | "open"
  | "closing-soon"
  | "closed"
  | "resolved-yes"
  | "resolved-no"
  | "invalid" {
  if (market.resolved_at && market.outcome === "yes") return "resolved-yes";
  if (market.resolved_at && market.outcome === "no") return "resolved-no";
  if (market.resolved_at && market.outcome === "invalid") return "invalid";
  const now = Date.now();
  const closes = new Date(market.closes_at).getTime();
  if (closes < now) return "closed";
  const ms = closes - now;
  if (ms < 72 * 3600 * 1000) return "closing-soon";
  return "open";
}

function StatusBadge({
  status,
}: {
  status:
    | "open"
    | "closing-soon"
    | "closed"
    | "resolved-yes"
    | "resolved-no"
    | "invalid";
}) {
  // "open" is the default state for every active market — rendering a
  // pill on every card put indigo accent everywhere and overran the
  // ≤3-per-screen budget. The pill is reserved for states that change
  // user behavior: closing-soon (urgent), closed (no longer actionable),
  // resolved-* (outcome visible).
  if (status === "open") return null;

  const map = {
    "closing-soon": {
      label: "closing soon",
      className: "bg-accent/12 text-accent",
    },
    closed: {
      label: "closed",
      className: "bg-muted text-muted-foreground",
    },
    "resolved-yes": {
      label: "yes",
      className: "bg-signal-positive-soft text-signal-positive",
    },
    "resolved-no": {
      label: "no",
      className: "bg-signal-negative-soft text-signal-negative",
    },
    invalid: {
      label: "invalid",
      className: "bg-muted text-muted-foreground",
    },
  } as const;
  const { label, className } = map[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-mono ${className}`}
    >
      {label}
    </span>
  );
}

function categoryLabel(slug: string) {
  const map: Record<string, string> = {
    "tech-ai": "Tech & AI",
    crypto: "Crypto",
    sports: "Sports",
    "pop-culture": "Pop culture",
    science: "Science",
    business: "Business",
    climate: "Climate",
    gaming: "Gaming",
    entertainment: "Entertainment",
    music: "Music",
  };
  return map[slug] ?? slug;
}
