"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  EditProfileState,
  OnboardingState,
} from "@/server/actions/profile.types";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters.")
  .max(20, "Username must be at most 20 characters.")
  .regex(
    /^[a-z0-9_]+$/,
    "Username can only use lowercase letters, numbers, and underscores.",
  );

const onboardingSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .min(1, "Display name is required.")
    .max(40, "Display name must be at most 40 characters."),
});

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const username = String(formData.get("username") ?? "").toLowerCase().trim();
  const displayName = String(formData.get("displayName") ?? "").trim();

  const parsed = onboardingSchema.safeParse({ username, displayName });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      username,
      displayName,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Uniqueness check before the write so the error message is friendly.
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);

  if (existing.length > 0 && existing[0].id !== user.id) {
    return {
      error: `@${parsed.data.username} is already taken.`,
      username: parsed.data.username,
      displayName: parsed.data.displayName,
    };
  }

  await db
    .update(users)
    .set({
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      onboarded_at: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/", "layout");
  redirect("/markets?sort=closing-soon");
}

/* =====================================================================
   Edit profile (settings)
===================================================================== */

const editProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required.")
    .max(40, "Display name must be at most 40 characters."),
  bio: z
    .string()
    .max(280, "Bio must be at most 280 characters.")
    .optional(),
});

export async function updateProfile(
  _prev: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bioRaw = String(formData.get("bio") ?? "").trim();

  const parsed = editProfileSchema.safeParse({
    displayName,
    bio: bioRaw === "" ? undefined : bioRaw,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const [updated] = await db
    .update(users)
    .set({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio ?? null,
    })
    .where(eq(users.id, user.id))
    .returning({ username: users.username });

  revalidatePath("/settings");
  if (updated?.username) {
    // Profile routes are keyed by handle, not by UUID; revalidating the
    // UUID path was a no-op so profile edits never flushed the cache.
    revalidatePath(`/u/${updated.username}`);
  }
  return { ok: true, error: null };
}
