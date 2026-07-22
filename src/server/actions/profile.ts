"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  categories,
  growth_events,
  user_interests,
  users,
} from "@/lib/db/schema";
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
  interests: z
    .array(z.string().min(1))
    .min(2, "Choose at least two topics.")
    .max(4, "Choose up to four topics."),
});

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const username = String(formData.get("username") ?? "").toLowerCase().trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const interests = formData
    .getAll("interests")
    .map((value) => String(value));

  const parsed = onboardingSchema.safeParse({
    username,
    displayName,
    interests,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      username,
      displayName,
    };
  }

  const validCategories = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(inArray(categories.slug, parsed.data.interests));
  if (validCategories.length !== parsed.data.interests.length) {
    return {
      error: "One of those topics is no longer available.",
      username: parsed.data.username,
      displayName: parsed.data.displayName,
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

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        username: parsed.data.username,
        display_name: parsed.data.displayName,
        onboarding_step: "forecast",
      })
      .where(eq(users.id, user.id));

    await tx.delete(user_interests).where(eq(user_interests.user_id, user.id));
    await tx.insert(user_interests).values(
      parsed.data.interests.map((categorySlug) => ({
        user_id: user.id,
        category_slug: categorySlug,
      })),
    );
    await tx.insert(growth_events).values({
      event: "onboarding_profile_completed",
      user_id: user.id,
      metadata: { interests: parsed.data.interests },
    });
  });

  revalidatePath("/", "layout");
  redirect("/onboarding");
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
