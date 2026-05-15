"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { comment_upvotes, comments, markets, users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import type { PostCommentState } from "./comments.types";

const postSchema = z.object({
  market_id: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
  parent_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export async function postComment(
  _prev: PostCommentState,
  formData: FormData,
): Promise<PostCommentState> {
  const me = await getCurrentProfile();
  if (!me) return { status: "error", message: "Sign in to comment." };

  const limit = rateLimit({
    actor: me.id,
    action: "postComment",
    max: 12,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return {
      status: "error",
      message: "Too many comments. Take a breath.",
    };
  }

  const parsed = postSchema.safeParse({
    market_id: formData.get("market_id")?.toString(),
    body: formData.get("body")?.toString() ?? "",
    parent_id: formData.get("parent_id")?.toString() ?? "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid comment.",
    };
  }

  // Validate market exists + grab slug for revalidation.
  const [market] = await db
    .select({ id: markets.id, slug: markets.slug, title: markets.title })
    .from(markets)
    .where(eq(markets.id, parsed.data.market_id))
    .limit(1);
  if (!market) return { status: "error", message: "Market not found." };

  let parentRecord: { id: string; user_id: string } | null = null;
  if (parsed.data.parent_id) {
    const [parent] = await db
      .select({ id: comments.id, user_id: comments.user_id, market_id: comments.market_id })
      .from(comments)
      .where(eq(comments.id, parsed.data.parent_id))
      .limit(1);
    if (!parent || parent.market_id !== market.id) {
      return { status: "error", message: "Parent comment not found." };
    }
    parentRecord = { id: parent.id, user_id: parent.user_id };
  }

  const [inserted] = await db
    .insert(comments)
    .values({
      market_id: market.id,
      user_id: me.id,
      parent_id: parentRecord?.id ?? null,
      body: parsed.data.body,
    })
    .returning({ id: comments.id });

  // Notify the parent author on replies (skip self-replies).
  if (parentRecord && parentRecord.user_id !== me.id) {
    await createNotification(parentRecord.user_id, {
      kind: "reply",
      actor_username: me.username,
      actor_display_name: me.display_name,
      market_slug: market.slug,
      market_title: market.title,
      excerpt: parsed.data.body.slice(0, 140),
    });
  }

  revalidatePath(`/markets/${market.slug}`);

  return { status: "success", commentId: inserted.id };
}

const upvoteSchema = z.object({
  comment_id: z.string().uuid(),
});

export async function toggleUpvote(
  formData: FormData,
): Promise<{ status: "ok"; upvoted: boolean } | { status: "error"; message: string }> {
  const me = await getCurrentProfile();
  if (!me) return { status: "error", message: "Sign in to upvote." };

  const parsed = upvoteSchema.safeParse({
    comment_id: formData.get("comment_id")?.toString(),
  });
  if (!parsed.success) {
    return { status: "error", message: "Invalid request." };
  }

  // Need the market slug for revalidation.
  const [link] = await db
    .select({
      market_slug: markets.slug,
    })
    .from(comments)
    .innerJoin(markets, eq(comments.market_id, markets.id))
    .where(eq(comments.id, parsed.data.comment_id))
    .limit(1);
  if (!link) return { status: "error", message: "Comment not found." };

  // Toggle: try to insert, on conflict delete instead.
  const [existing] = await db
    .select({ comment_id: comment_upvotes.comment_id })
    .from(comment_upvotes)
    .where(
      and(
        eq(comment_upvotes.comment_id, parsed.data.comment_id),
        eq(comment_upvotes.user_id, me.id),
      ),
    )
    .limit(1);

  let upvoted: boolean;
  if (existing) {
    await db
      .delete(comment_upvotes)
      .where(
        and(
          eq(comment_upvotes.comment_id, parsed.data.comment_id),
          eq(comment_upvotes.user_id, me.id),
        ),
      );
    upvoted = false;
  } else {
    await db
      .insert(comment_upvotes)
      .values({ comment_id: parsed.data.comment_id, user_id: me.id });
    upvoted = true;
  }

  revalidatePath(`/markets/${link.market_slug}`);

  void users; // silence unused import
  return { status: "ok", upvoted };
}
