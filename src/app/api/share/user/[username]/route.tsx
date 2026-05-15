import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";

import { db } from "@/lib/db";
import { user_category_scores, users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1080;
const H = 1080;

/**
 * Profile share card. 1080×1080 with the user's Forecast Score + top
 * three category scores. Used as og:image on /u/[username] and as a
 * downloadable PNG.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      forecast_score: users.forecast_score,
      current_streak: users.current_streak,
      total_predictions: users.total_predictions,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const cats = await db
    .select({
      slug: user_category_scores.category_slug,
      score: user_category_scores.score,
    })
    .from(user_category_scores)
    .where(eq(user_category_scores.user_id, user.id))
    .orderBy(user_category_scores.score);

  const topCats = cats.sort((a, b) => b.score - a.score).slice(0, 3);
  const isRanked = user.forecast_score > 0;

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
                fontSize: 24,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#a3aab8",
              }}
            >
              forecaster
            </span>
            <span
              style={{
                fontSize: 64,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.025em",
                color: "#fafbff",
              }}
            >
              {user.display_name}
            </span>
            <span
              style={{
                fontSize: 28,
                color: "#a3aab8",
                fontFamily: "Menlo, monospace",
              }}
            >
              @{user.username}
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontSize: 24,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#a3aab8",
            }}
          >
            forecast score
          </span>
          <div
            style={{ display: "flex", alignItems: "baseline", gap: 18 }}
          >
            <span
              style={{
                fontSize: 240,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.05em",
                color: "#fafbff",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {isRanked
                ? user.forecast_score.toLocaleString()
                : "Unranked"}
            </span>
            {isRanked ? (
              <span
                style={{
                  fontSize: 36,
                  color: "#a3aab8",
                  fontFamily: "Menlo, monospace",
                }}
              >
                / 3,000
              </span>
            ) : null}
          </div>
          {user.current_streak > 0 ? (
            <span
              style={{
                fontSize: 28,
                color: "#3fc97a",
              }}
            >
              {user.current_streak}-call streak ·{" "}
              {user.total_predictions.toLocaleString()} calls
            </span>
          ) : (
            <span style={{ fontSize: 28, color: "#a3aab8" }}>
              {user.total_predictions.toLocaleString()} calls
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderTop: "1px solid #2a2f3a",
            paddingTop: 28,
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
            categories
          </span>
          {topCats.length === 0 ? (
            <span style={{ fontSize: 28, color: "#a3aab8" }}>
              No resolved calls yet.
            </span>
          ) : (
            topCats.map((c) => (
              <div
                key={c.slug}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 36,
                }}
              >
                <span
                  style={{
                    color: "#fafbff",
                    textTransform: "capitalize",
                    letterSpacing: "0.04em",
                  }}
                >
                  {c.slug.replace(/-/g, " ")}
                </span>
                <span
                  style={{
                    color: "#fafbff",
                    fontFamily: "Menlo, monospace",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 700,
                  }}
                >
                  {c.score.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
