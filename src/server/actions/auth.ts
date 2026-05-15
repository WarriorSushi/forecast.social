"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { invite_codes } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthState } from "@/server/actions/auth.types";

const credsSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("That doesn't look like a valid email."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters."),
  invite_code: z
    .string()
    .trim()
    .max(16)
    .optional()
    .transform((v) => (v ? v.toUpperCase() : "")),
});

/* =====================================================================
   signUp — useActionState-compatible
===================================================================== */
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const inviteCode = String(formData.get("invite_code") ?? "");

  const parsed = credsSchema.safeParse({
    email,
    password,
    invite_code: inviteCode,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", email };
  }

  // Invite-gate (env-controlled). When INVITE_CODES_REQUIRED=true, the
  // code must exist and be unused. We pre-validate here so the user
  // gets a friendly error before we even call Supabase Auth. We DON'T
  // mark the code used until after the auth row is created — see below.
  let validCodeRow: { code: string } | null = null;
  if (env.INVITE_CODES_REQUIRED) {
    if (!parsed.data.invite_code) {
      return {
        error: "An invite code is required to sign up.",
        email: parsed.data.email,
      };
    }
    const [row] = await db
      .select({ code: invite_codes.code })
      .from(invite_codes)
      .where(
        and(
          eq(invite_codes.code, parsed.data.invite_code),
          isNull(invite_codes.used_by),
        ),
      )
      .limit(1);
    if (!row) {
      return {
        error: "That invite code isn't valid or has already been used.",
        email: parsed.data.email,
      };
    }
    validCodeRow = row;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: humaniseAuthError(error.message),
      email: parsed.data.email,
    };
  }

  // Mark the code consumed. The handle_new_auth_user trigger has
  // already inserted the public.users row with the auth user id.
  if (validCodeRow && data.user) {
    await db
      .update(invite_codes)
      .set({ used_by: data.user.id, used_at: new Date() })
      .where(eq(invite_codes.code, validCodeRow.code));
  }

  // Send the user to onboarding to pick a real username before they
  // reach the feed.
  redirect("/onboarding");
}

/* =====================================================================
   signIn — useActionState-compatible
===================================================================== */
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const parsed = credsSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", email };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: humaniseAuthError(error.message),
      email: parsed.data.email,
    };
  }

  // (app) layout will bounce to /onboarding if they haven't picked a
  // username yet, so the landing destination is always /feed here.
  redirect("/feed");
}

/* =====================================================================
   signOut — plain action, no state
===================================================================== */
export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

/* =====================================================================
   Helpers
===================================================================== */

function humaniseAuthError(message: string): string {
  // Supabase auth messages are technical. Trim the rough edges for the UI.
  if (/invalid login credentials/i.test(message)) {
    return "Wrong email or password.";
  }
  if (/user already registered/i.test(message)) {
    return "An account already exists for that email. Try signing in.";
  }
  if (/email rate limit/i.test(message)) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return message;
}
