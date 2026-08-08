"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  early_access_applications,
  growth_events,
  invite_codes,
  registration_intents,
  referrals,
  users,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  let validCodeRow: {
    code: string;
    createdBy: string;
    sourcePredictionId: string | null;
  } | null = null;
  if (env.INVITE_CODES_REQUIRED || parsed.data.invite_code) {
    if (!parsed.data.invite_code) {
      return {
        error: "An invite code is required to sign up.",
        email: parsed.data.email,
      };
    }
    const [row] = await db
      .select({
        code: invite_codes.code,
        createdBy: invite_codes.created_by,
        sourcePredictionId: invite_codes.source_prediction_id,
      })
      .from(invite_codes)
      .where(
        and(
          eq(invite_codes.code, parsed.data.invite_code),
          isNull(invite_codes.used_by),
          or(
            isNull(invite_codes.expires_at),
            gt(invite_codes.expires_at, new Date()),
          ),
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

  // Supabase's public Auth endpoint cannot be the admission boundary. Mint a
  // short-lived, email-bound ticket that the auth.users BEFORE INSERT trigger
  // must atomically consume. Direct calls to /auth/v1/signup do not have one.
  const registrationToken = randomUUID();
  await db
    .delete(registration_intents)
    .where(lt(registration_intents.expires_at, new Date()));
  await db.insert(registration_intents).values({
    token: registrationToken,
    email: parsed.data.email.trim().toLowerCase(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000),
  });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await (async () => {
    try {
      return await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}/auth/callback`,
          data: { registration_intent: registrationToken },
        },
      });
    } finally {
      // The database trigger consumes valid tickets inside the signup
      // transaction. Always remove leftovers from rejected or interrupted
      // attempts so bearer tickets cannot outlive the request that minted them.
      await db
        .delete(registration_intents)
        .where(eq(registration_intents.token, registrationToken));
    }
  })();

  if (error) {
    return {
      error: humaniseAuthError(error.message),
      email: parsed.data.email,
    };
  }

  // Supabase deliberately returns an obfuscated user for an existing email
  // when confirmation is enabled. Surface a useful response and, critically,
  // do not consume an invite for that case.
  if (data.user?.identities?.length === 0) {
    return {
      error: "An account already exists for that email. Try signing in.",
      email: parsed.data.email,
    };
  }

  if (validCodeRow && data.user) {
    const newUserId = data.user.id;
    // The claim, referral, and event commit together. The earlier lookup is
    // only for a friendly response; this conditional update is the race gate.
    const claimed = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(invite_codes)
        .set({ used_by: newUserId, used_at: new Date() })
        .where(
          and(
            eq(invite_codes.code, validCodeRow.code),
            isNull(invite_codes.used_by),
          ),
        )
        .returning({ code: invite_codes.code });
      if (!row) return false;

      await tx.insert(referrals).values({
        invite_code: validCodeRow.code,
        inviter_id: validCodeRow.createdBy,
        invitee_id: newUserId,
        source_prediction_id: validCodeRow.sourcePredictionId,
      });
      await tx.insert(growth_events).values({
        event: "invite_claimed",
        user_id: newUserId,
        invite_code: validCodeRow.code,
        metadata: {
          inviterId: validCodeRow.createdBy,
          sourcePredictionId: validCodeRow.sourcePredictionId,
        },
      });
      await tx
        .update(early_access_applications)
        .set({ status: "joined", updated_at: new Date() })
        .where(
          and(
            eq(early_access_applications.invite_code, validCodeRow.code),
            eq(
              early_access_applications.email,
              parsed.data.email.trim().toLowerCase(),
            ),
          ),
        );
      return true;
    });

    if (!claimed) {
      // Another signup won the race. Remove the just-created account so the
      // person can retry with a different invite instead of getting stranded.
      await db.delete(users).where(eq(users.id, newUserId));
      const admin = createSupabaseAdminClient();
      await admin.auth.admin.deleteUser(newUserId);
      return {
        error: "That invite code has already been used.",
        email: parsed.data.email,
      };
    }

  }

  // With "Confirm email" ON, signUp returns no session — the user has
  // to click the link in their inbox. Park them on a screen that tells
  // them so. If confirmation is OFF (dev), the session already exists
  // and the (app) layout will route through /onboarding from /feed.
  if (data.session) {
    redirect("/onboarding");
  }
  redirect(`/sign-up/check-email?email=${encodeURIComponent(parsed.data.email)}`);
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
   resendConfirmation — useActionState-compatible
===================================================================== */
export async function resendConfirmation(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const emailCheck = z.string().email().safeParse(email);
  if (!emailCheck.success) {
    return { error: "That email looks invalid.", email };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}/auth/callback`,
    },
  });

  if (error) {
    return { error: humaniseAuthError(error.message), email };
  }

  return { error: null, email, message: "Sent again — check your inbox." };
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
