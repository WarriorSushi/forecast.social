import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * React.cache memoises within the same render — so multiple components in
 * one request share a single auth.getUser() call. Don't reach for it
 * across requests; it's per-render only.
 */

export const getAuthUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type CurrentProfile = User & { email: string | null };

export const getCurrentProfile = cache(
  async (): Promise<CurrentProfile | null> => {
    const user = await getAuthUser();
    if (!user) return null;

    const [profile] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile) return null;
    return { ...profile, email: user.email ?? null };
  },
);
