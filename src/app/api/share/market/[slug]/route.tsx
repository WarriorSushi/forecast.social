import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";

import { db } from "@/lib/db";
import { categories, markets, users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1080;
const H = 1080;

/**
 * Dynamic share card for a market. 1080×1080 PNG generated on demand
 * by next/og. Used as og:image for /markets/[slug] and as a directly-
 * shareable PNG. Sans-only per DESIGN.md §6 share card spec.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [row] = await db
    .select({
      title: markets.title,
      outcome: markets.outcome,
      resolved_at: markets.resolved_at,
      consensus_probability: markets.consensus_probability,
      prediction_count: markets.prediction_count,
      closes_at: markets.closes_at,
      category_name: categories.name,
      category_slug: markets.category_slug,
    })
    .from(markets)
    .leftJoin(categories, eq(markets.category_slug, categories.slug))
    .where(eq(markets.slug, slug))
    .limit(1);

  if (!row) {
    return new Response("Market not found", { status: 404 });
  }

  const consensusPct =
    row.consensus_probability != null
      ? Math.round(row.consensus_probability * 100)
      : null;

  void users; // reserved for "top forecasters" addition later
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 22,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#a3aab8",
              }}
            >
              {row.category_name ?? row.category_slug}
            </span>
            <span style={{ fontSize: 24, color: "#a3aab8" }}>
              {row.resolved_at && row.outcome
                ? `Resolved · ${row.outcome}`
                : new Date(row.closes_at).getTime() < Date.now()
                  ? "Closed"
                  : "Open"}
            </span>
          </div>
          <span
            style={{
              fontSize: 28,
              letterSpacing: "-0.01em",
              color: "#fafbff",
              fontStyle: "italic",
            }}
          >
            forecast<span style={{ color: "#7c8cff" }}>.</span>social
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <span
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: "-0.04em",
              color: "#fafbff",
            }}
          >
            {row.title}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid #2a2f3a",
            paddingTop: 36,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 22,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#a3aab8",
              }}
            >
              consensus
            </span>
            <span
              style={{
                fontSize: 168,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.05em",
                color: "#fafbff",
              }}
            >
              {consensusPct != null ? `${consensusPct}%` : "—"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 22,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#a3aab8",
              }}
            >
              calls
            </span>
            <span
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: "#fafbff",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.prediction_count.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
