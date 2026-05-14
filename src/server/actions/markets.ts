"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { markets } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import type { CreateMarketState } from "./markets.types";

const ALLOWED_CATEGORIES = [
  "tech-ai",
  "crypto",
  "sports",
  "pop-culture",
] as const;

const createMarketSchema = z
  .object({
    title: z.string().trim().min(8).max(140),
    description: z.string().trim().min(20).max(1200),
    category_slug: z.enum(ALLOWED_CATEGORIES),
    resolution_source: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    closes_at: z.string().min(1, "Pick a close date"),
    resolves_at: z.string().min(1, "Pick a resolve date"),
  })
  .refine(
    (val) => {
      const closes = new Date(val.closes_at);
      const resolves = new Date(val.resolves_at);
      return (
        !Number.isNaN(closes.getTime()) &&
        !Number.isNaN(resolves.getTime()) &&
        closes <= resolves
      );
    },
    {
      message: "Close date must be on or before resolve date",
      path: ["closes_at"],
    },
  );

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const rows = await db
      .select({ slug: markets.slug })
      .from(markets)
      .where(eq(markets.slug, candidate))
      .limit(1);
    if (rows.length === 0) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function createMarket(
  _prev: CreateMarketState,
  formData: FormData,
): Promise<CreateMarketState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { status: "error", message: "Sign in required." };
  }
  if (!profile.is_admin) {
    return { status: "error", message: "Admin only." };
  }

  const raw = {
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    category_slug: formData.get("category_slug")?.toString() ?? "",
    resolution_source: formData.get("resolution_source")?.toString() ?? "",
    closes_at: formData.get("closes_at")?.toString() ?? "",
    resolves_at: formData.get("resolves_at")?.toString() ?? "",
  };

  const parsed = createMarketSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      message: "Some fields need attention.",
      fieldErrors,
    };
  }

  const baseSlug = slugify(parsed.data.title);
  if (!baseSlug) {
    return {
      status: "error",
      message: "Title must contain at least one letter or number.",
      fieldErrors: { title: "Letters/numbers required." },
    };
  }
  const slug = await uniqueSlug(baseSlug);

  try {
    await db.insert(markets).values({
      slug,
      title: parsed.data.title,
      description: parsed.data.description,
      category_slug: parsed.data.category_slug,
      created_by: profile.id,
      resolution_source: parsed.data.resolution_source,
      closes_at: new Date(parsed.data.closes_at),
      resolves_at: new Date(parsed.data.resolves_at),
    });
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error ? err.message : "Could not create market.",
    };
  }

  revalidatePath("/admin/markets");
  revalidatePath("/markets");

  return { status: "success", slug };
}
