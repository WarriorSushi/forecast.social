"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";

const setSchema = z.object({
  url: z.string().url(),
});

type Result =
  | { status: "ok"; url: string }
  | { status: "error"; message: string };

/**
 * Called by the AvatarUpload client after a successful Supabase Storage
 * upload. Validates the URL is inside our bucket, then writes it to
 * users.avatar_url and revalidates the profile + settings caches.
 */
export async function setAvatarUrl(formData: FormData): Promise<Result> {
  const me = await getCurrentProfile();
  if (!me) return { status: "error", message: "Sign in required." };

  const parsed = setSchema.safeParse({
    url: formData.get("url")?.toString() ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Invalid avatar URL." };
  }

  // Guard against arbitrary URLs: the avatar must be hosted in our
  // Supabase storage bucket. Cheap string check.
  if (!parsed.data.url.includes("/storage/v1/object/public/avatars/")) {
    return { status: "error", message: "Avatar must be hosted in storage." };
  }

  await db
    .update(users)
    .set({ avatar_url: parsed.data.url, updated_at: new Date() })
    .where(eq(users.id, me.id));

  revalidatePath("/settings");
  revalidatePath(`/u/${me.username}`);
  revalidatePath("/feed");
  revalidatePath("/leaderboard");

  return { status: "ok", url: parsed.data.url };
}

export async function clearAvatar(): Promise<Result> {
  const me = await getCurrentProfile();
  if (!me) return { status: "error", message: "Sign in required." };

  await db
    .update(users)
    .set({ avatar_url: null, updated_at: new Date() })
    .where(eq(users.id, me.id));

  revalidatePath("/settings");
  revalidatePath(`/u/${me.username}`);
  revalidatePath("/feed");

  return { status: "ok", url: "" };
}
