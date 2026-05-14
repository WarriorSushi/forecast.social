"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

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

  const parsed = credsSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", email };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: humaniseAuthError(error.message),
      email: parsed.data.email,
    };
  }

  // The handle_new_auth_user trigger has already inserted the public.users
  // row with a placeholder username. Send the user to onboarding to pick a
  // real one before they reach the feed.
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
