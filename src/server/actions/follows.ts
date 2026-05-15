"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { follows, users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  target_user_id: z.string().uuid(),
  action: z.enum(["follow", "unfollow"]),
});

type Result =
  | { status: "ok"; action: "follow" | "unfollow" }
  | { status: "error"; message: string };

/**
 * Toggle follow / unfollow. Server-authoritative. Notifies the
 * followee on a new follow.
 */
export async function toggleFollow(formData: FormData): Promise<Result> {
  const me = await getCurrentProfile();
  if (!me) return { status: "error", message: "Sign in required." };

  const parsed = schema.safeParse({
    target_user_id: formData.get("target_user_id")?.toString(),
    action: formData.get("action")?.toString(),
  });
  if (!parsed.success) {
    return { status: "error", message: "Invalid request." };
  }
  if (parsed.data.target_user_id === me.id) {
    return { status: "error", message: "You can't follow yourself." };
  }

  // Verify the target exists; we need their handle for the cache bust.
  const [target] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.id, parsed.data.target_user_id))
    .limit(1);
  if (!target) {
    return { status: "error", message: "User not found." };
  }

  if (parsed.data.action === "follow") {
    try {
      await db
        .insert(follows)
        .values({ follower_id: me.id, followee_id: target.id })
        .onConflictDoNothing();
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Could not follow.",
      };
    }
    await createNotification(target.id, {
      kind: "follow",
      actor_username: me.username,
      actor_display_name: me.display_name,
    });
  } else {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.follower_id, me.id),
          eq(follows.followee_id, target.id),
        ),
      );
  }

  revalidatePath(`/u/${target.username}`);
  revalidatePath(`/u/${me.username}`);
  revalidatePath("/feed");

  return { status: "ok", action: parsed.data.action };
}
