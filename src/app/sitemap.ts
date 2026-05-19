import type { MetadataRoute } from "next";
import { desc, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { markets, users } from "@/lib/db/schema";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");

  const recentMarkets = await db
    .select({ slug: markets.slug, updated_at: markets.updated_at })
    .from(markets)
    .orderBy(desc(markets.updated_at))
    .limit(500);

  const rankedUsers = await db
    .select({ username: users.username, updated_at: users.updated_at })
    .from(users)
    .where(gt(users.forecast_score, 0))
    .orderBy(desc(users.forecast_score))
    .limit(500);

  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/markets`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    ...recentMarkets.map((m) => ({
      url: `${base}/markets/${m.slug}`,
      lastModified: m.updated_at ?? now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...rankedUsers.map((u) => ({
      url: `${base}/u/${u.username}`,
      lastModified: u.updated_at ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
