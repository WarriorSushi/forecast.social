"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { market_proposals, markets, users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import type { ProposeMarketState } from "./proposals.types";

const ALLOWED_CATEGORIES = [
  "tech-ai",
  "crypto",
  "sports",
  "pop-culture",
] as const;

const proposeSchema = z
  .object({
    title: z.string().trim().min(12, "Pick a clear, specific title.").max(140),
    description: z
      .string()
      .trim()
      .min(40, "Spell out what resolves Yes vs No.")
      .max(2000),
    category_slug: z.enum(ALLOWED_CATEGORIES),
    resolution_source: z
      .string()
      .trim()
      .url("Pick a public URL the admin can use to resolve.")
      .max(500),
    closes_at: z.string().min(1, "Pick a close date"),
    resolves_at: z.string().min(1, "Pick a resolve date"),
    rationale: z
      .string()
      .trim()
      .min(20, "Help the reviewer understand why this question matters.")
      .max(1000),
  })
  .refine(
    (val) => {
      const closes = new Date(val.closes_at);
      const resolves = new Date(val.resolves_at);
      return (
        !Number.isNaN(closes.getTime()) &&
        !Number.isNaN(resolves.getTime()) &&
        closes <= resolves &&
        closes > new Date(Date.now() + 60 * 60 * 1000) // at least 1h in the future
      );
    },
    {
      message:
        "Close date must be in the future and on or before resolve date.",
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

export async function proposeMarket(
  _prev: ProposeMarketState,
  formData: FormData,
): Promise<ProposeMarketState> {
  const me = await getCurrentProfile();
  if (!me) {
    return { status: "error", message: "Sign in to propose a market." };
  }

  // Friction is the point: one proposal per 6 hours per user.
  const limit = rateLimit({
    actor: me.id,
    action: "proposeMarket",
    max: 1,
    windowMs: 6 * 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return {
      status: "error",
      message:
        "You can propose one market every 6 hours. Try again later.",
    };
  }

  const raw = {
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    category_slug: formData.get("category_slug")?.toString() ?? "",
    resolution_source: formData.get("resolution_source")?.toString() ?? "",
    closes_at: formData.get("closes_at")?.toString() ?? "",
    resolves_at: formData.get("resolves_at")?.toString() ?? "",
    rationale: formData.get("rationale")?.toString() ?? "",
  };

  const parsed = proposeSchema.safeParse(raw);
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

  const [inserted] = await db
    .insert(market_proposals)
    .values({
      slug: baseSlug,
      title: parsed.data.title,
      description: parsed.data.description,
      category_slug: parsed.data.category_slug,
      proposed_by: me.id,
      resolution_source: parsed.data.resolution_source,
      closes_at: new Date(parsed.data.closes_at),
      resolves_at: new Date(parsed.data.resolves_at),
      rationale: parsed.data.rationale,
    })
    .returning({ id: market_proposals.id });

  revalidatePath("/markets/propose");
  revalidatePath(`/u/${me.username}`);
  revalidatePath("/admin/proposals");

  return { status: "success", proposalId: inserted.id };
}

const reviewSchema = z.object({
  proposal_id: z.string().uuid(),
  action: z.enum(["approve", "reject", "needs_revision"]),
  rejection_reason: z.string().trim().max(500).optional().or(z.literal("")),
});

type ReviewResult =
  | { status: "ok"; action: "approve" | "reject" | "needs_revision" }
  | { status: "error"; message: string };

export async function reviewProposal(formData: FormData): Promise<ReviewResult> {
  const me = await getCurrentProfile();
  if (!me) return { status: "error", message: "Sign in required." };
  if (!me.is_admin) return { status: "error", message: "Admin only." };

  const parsed = reviewSchema.safeParse({
    proposal_id: formData.get("proposal_id")?.toString(),
    action: formData.get("action")?.toString(),
    rejection_reason: formData.get("rejection_reason")?.toString() ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Invalid request." };
  }

  const newStatus =
    parsed.data.action === "approve"
      ? "approved"
      : parsed.data.action === "reject"
        ? "rejected"
        : "needs_revision";

  // Pull the proposal so we can notify the proposer with context.
  const [proposal] = await db
    .select({
      id: market_proposals.id,
      proposed_by: market_proposals.proposed_by,
      title: market_proposals.title,
      status_before: market_proposals.status,
    })
    .from(market_proposals)
    .where(eq(market_proposals.id, parsed.data.proposal_id))
    .limit(1);
  if (!proposal) return { status: "error", message: "Proposal not found." };
  if (proposal.status_before === newStatus) {
    return { status: "error", message: "Already in that state." };
  }

  const now = new Date();
  await db
    .update(market_proposals)
    .set({
      status: newStatus,
      reviewed_by: me.id,
      reviewed_at: now,
      rejection_reason:
        newStatus === "rejected" || newStatus === "needs_revision"
          ? parsed.data.rejection_reason || null
          : null,
      updated_at: now,
    })
    .where(eq(market_proposals.id, parsed.data.proposal_id));

  // If approved, the BEFORE-UPDATE trigger has copied the proposal into
  // markets and set approved_market_id. Read it back so the
  // notification can deep-link to the new market page.
  let newMarketSlug: string | null = null;
  if (newStatus === "approved") {
    const [updated] = await db
      .select({
        approved_market_id: market_proposals.approved_market_id,
      })
      .from(market_proposals)
      .where(eq(market_proposals.id, parsed.data.proposal_id))
      .limit(1);
    if (updated?.approved_market_id) {
      const [m] = await db
        .select({ slug: markets.slug })
        .from(markets)
        .where(eq(markets.id, updated.approved_market_id))
        .limit(1);
      newMarketSlug = m?.slug ?? null;
    }
  }

  await createNotification(proposal.proposed_by, {
    kind: "proposal_resolved",
    proposal_id: proposal.id,
    title: proposal.title,
    status: newStatus,
    rejection_reason:
      newStatus === "rejected" || newStatus === "needs_revision"
        ? parsed.data.rejection_reason || null
        : null,
    market_slug: newMarketSlug,
  });

  revalidatePath("/admin/proposals");
  revalidatePath("/markets");
  if (newMarketSlug) {
    revalidatePath(`/markets/${newMarketSlug}`);
  }

  void users;
  return { status: "ok", action: parsed.data.action };
}
