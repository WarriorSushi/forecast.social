import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";

import { db } from "@/lib/db";
import { markets, predictions, users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const W = 1080;
const H = 1080;

/**
 * The receipt card. Per DESIGN.md §6: the user's call, the consensus
 * at the time, the resolved outcome, score delta. Used as the
 * downloadable PNG for a resolved correct prediction.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [row] = await db
    .select({
      probability: predictions.probability,
      consensus_at_time: predictions.consensus_at_time,
      brier: predictions.brier,
      was_correct: predictions.was_correct,
      created_at: predictions.created_at,
      market_title: markets.title,
      market_outcome: markets.outcome,
      market_resolved_at: markets.resolved_at,
      user_username: users.username,
      user_display_name: users.display_name,
    })
    .from(predictions)
    .innerJoin(markets, eq(predictions.market_id, markets.id))
    .innerJoin(users, eq(predictions.user_id, users.id))
    .where(eq(predictions.id, id))
    .limit(1);

  if (!row) return new Response("Prediction not found", { status: 404 });
  // Share cards are receipts. Only serve them for resolved predictions
  // — anything else leaks individual user calls via UUID enumeration.
  if (!row.market_resolved_at || !row.market_outcome || row.market_outcome === "invalid") {
    return new Response("Market not resolved yet", { status: 404 });
  }

  const callPct = Math.round(row.probability * 100);
  const consensusPct =
    row.consensus_at_time != null
      ? Math.round(row.consensus_at_time * 100)
      : null;
  const ts = new Date(row.created_at);
  const tsLabel = `${ts.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })} · ${ts
    .toISOString()
    .slice(11, 16)} utc`;

  const outcomeColor =
    row.market_outcome === "yes"
      ? "#3fc97a"
      : row.market_outcome === "no"
        ? "#e85a5a"
        : "#a3aab8";

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0f1115",
          color: "#fafbff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 24,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#a3aab8",
              }}
            >
              forecast.social · the call
            </span>
            <span
              style={{
                fontSize: 22,
                color: "#a3aab8",
                fontFamily: "Menlo, monospace",
              }}
            >
              {tsLabel}
            </span>
          </div>
          <span
            style={{
              fontSize: 28,
              letterSpacing: "-0.01em",
              fontStyle: "italic",
              color: "#fafbff",
            }}
          >
            forecast<span style={{ color: "#7c8cff" }}>.</span>social
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span
            style={{
              fontSize: 22,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#a3aab8",
            }}
          >
            the call
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              color: "#fafbff",
            }}
          >
            {row.market_title}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #2a2f3a",
            paddingTop: 36,
          }}
        >
          <Stat label="your call" value={`${callPct}%`} color="#fafbff" />
          <Stat
            label="consensus"
            value={consensusPct != null ? `${consensusPct}%` : "—"}
            color="#a3aab8"
          />
          <Stat
            label="outcome"
            value={row.market_outcome ? row.market_outcome : "pending"}
            color={outcomeColor}
            uppercase
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 22,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#a3aab8",
              }}
            >
              forecaster
            </span>
            <span style={{ fontSize: 36, color: "#fafbff" }}>
              @{row.user_username}
            </span>
          </div>
          {row.was_correct != null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 22,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#a3aab8",
                  textAlign: "right",
                }}
              >
                result
              </span>
              <span
                style={{
                  fontSize: 36,
                  color: row.was_correct ? "#3fc97a" : "#e85a5a",
                  fontFamily: "Menlo, monospace",
                  fontWeight: 700,
                }}
              >
                {row.was_correct ? "correct" : "missed"}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}

function Stat({
  label,
  value,
  color,
  uppercase = false,
}: {
  label: string;
  value: string;
  color: string;
  uppercase?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span
        style={{
          fontSize: 22,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#a3aab8",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 112,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.045em",
          color,
          textTransform: uppercase ? "uppercase" : "none",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
