"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { markets } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { parseHttpJsonResolutionConfig } from "@/lib/resolution/evaluate";
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

export type ConfigureResolutionResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export async function configureMarketResolution(
  formData: FormData,
): Promise<ConfigureResolutionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) {
    return { status: "error", message: "Admin only." };
  }

  const marketId = formData.get("marketId")?.toString() ?? "";
  const method = formData.get("method")?.toString() ?? "manual";
  if (!z.string().uuid().safeParse(marketId).success) {
    return { status: "error", message: "Invalid market." };
  }
  if (method !== "manual" && method !== "http_json") {
    return { status: "error", message: "Unsupported resolution method." };
  }

  let config: ReturnType<typeof parseHttpJsonResolutionConfig> | null = null;
  if (method === "http_json") {
    const expectedType = formData.get("expectedType")?.toString();
    const expectedRaw = formData.get("expected")?.toString() ?? "";
    let expected: string | number | boolean = expectedRaw;
    if (expectedType === "number") {
      expected = Number(expectedRaw);
      if (!Number.isFinite(expected)) {
        return { status: "error", message: "Expected value must be a number." };
      }
    } else if (expectedType === "boolean") {
      if (expectedRaw !== "true" && expectedRaw !== "false") {
        return { status: "error", message: "Boolean must be true or false." };
      }
      expected = expectedRaw === "true";
    }

    try {
      config = parseHttpJsonResolutionConfig({
        url: formData.get("url")?.toString() ?? "",
        path: formData.get("path")?.toString() ?? "",
        operator: formData.get("operator")?.toString() ?? "eq",
        expected,
        outcomeOnMatch: formData.get("outcomeOnMatch")?.toString() ?? "yes",
        outcomeOnMiss: formData.get("outcomeOnMiss")?.toString() ?? "no",
        resolveEarlyOnMatch: formData.get("resolveEarlyOnMatch") === "on",
        label: formData.get("label")?.toString() || undefined,
      });
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Invalid automation settings.",
      };
    }
  }

  const [updated] = await db
    .update(markets)
    .set({
      resolution_method: method,
      resolution_config: config,
      resolution_status: "pending",
      resolution_evidence: null,
      resolution_checked_at: null,
    })
    .where(eq(markets.id, marketId))
    .returning({ slug: markets.slug });

  if (!updated) return { status: "error", message: "Market not found." };
  revalidatePath("/admin/markets");
  revalidatePath(`/markets/${updated.slug}`);
  return {
    status: "success",
    message:
      method === "http_json"
        ? "Automatic resolution is active. The source will be checked hourly."
        : "This market now uses manual review.",
  };
}
