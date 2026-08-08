"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createHmac, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  early_access_applications,
  growth_events,
  invite_codes,
  rate_limit_buckets,
} from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export type EarlyAccessState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fields?: EarlyAccessFields;
      fieldErrors?: Partial<Record<keyof EarlyAccessFields, string>>;
    };

export type EarlyAccessFields = {
  email: string;
  handle: string;
  interests: string[];
  prediction: string;
  source: string;
};

const schema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email.")
    .max(320, "Enter a valid email."),
  handle: z.string().trim().max(80).optional(),
  interests: z
    .array(z.string().trim().min(1))
    .min(1, "Choose at least one topic.")
    .max(4),
  prediction: z.string().trim().max(280).optional(),
  source: z.string().trim().max(80).optional(),
});

export async function applyForEarlyAccess(
  _previous: EarlyAccessState,
  formData: FormData,
): Promise<EarlyAccessState> {
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "success" };
  }

  const requestHeaders = await headers();
  const actor =
    requestHeaders.get("x-real-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const limit = rateLimit({
    actor,
    action: "earlyAccessApplication",
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return { status: "error", message: "Too many attempts. Try again later." };
  }

  const fields: EarlyAccessFields = {
    email: String(formData.get("email") ?? ""),
    handle: String(formData.get("handle") ?? ""),
    interests: formData.getAll("interests").map(String),
    prediction: String(formData.get("prediction") ?? ""),
    source: String(formData.get("source") ?? ""),
  };
  const parsed = schema.safeParse(fields);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fields,
      fieldErrors: Object.fromEntries(
        Object.entries(flattened).flatMap(([field, messages]) =>
          messages?.[0] ? [[field, messages[0]]] : [],
        ),
      ),
    };
  }

  try {
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;
    const limits = [
      {
        key: makeRateLimitKey("actor-hour", actor),
        max: 8,
        windowMs: HOUR,
      },
      {
        key: makeRateLimitKey("actor-day", actor),
        max: 30,
        windowMs: DAY,
      },
      {
        key: makeRateLimitKey("email-hour", parsed.data.email),
        max: 3,
        windowMs: HOUR,
      },
      {
        key: makeRateLimitKey("email-day", parsed.data.email),
        max: 6,
        windowMs: DAY,
      },
    ].sort((left, right) => left.key.localeCompare(right.key));

    const result = await db.transaction(async (tx) => {
      let blocked = false;
      for (const rule of limits) {
        const expiresAt = new Date(Date.now() + rule.windowMs);
        const [bucket] = await tx
          .insert(rate_limit_buckets)
          .values({
            key: rule.key,
            attempts: 1,
            expires_at: expiresAt,
          })
          .onConflictDoUpdate({
            target: rate_limit_buckets.key,
            set: {
              attempts: sql`case
                when ${rate_limit_buckets.expires_at} <= now() then 1
                else ${rate_limit_buckets.attempts} + 1
              end`,
              window_started_at: sql`case
                when ${rate_limit_buckets.expires_at} <= now() then now()
                else ${rate_limit_buckets.window_started_at}
              end`,
              expires_at: sql`case
                when ${rate_limit_buckets.expires_at} <= now()
                  then now() + ${rule.windowMs} * interval '1 millisecond'
                else ${rate_limit_buckets.expires_at}
              end`,
              updated_at: new Date(),
            },
          })
          .returning({ attempts: rate_limit_buckets.attempts });
        if (!bucket || bucket.attempts > rule.max) blocked = true;
      }

      if (blocked) return { allowed: false } as const;

      const emailLock = makeRateLimitKey("application", parsed.data.email);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${emailLock}))`);
      const [existing] = await tx
        .select({ id: early_access_applications.id })
        .from(early_access_applications)
        .where(sql`lower(${early_access_applications.email}) = ${parsed.data.email}`)
        .limit(1);

      if (existing) {
        await tx
          .update(early_access_applications)
          .set({
            handle: parsed.data.handle || null,
            interests: parsed.data.interests,
            prediction: parsed.data.prediction || null,
            source: parsed.data.source || null,
            updated_at: new Date(),
          })
          .where(eq(early_access_applications.id, existing.id));
      } else {
        await tx.insert(early_access_applications).values({
          email: parsed.data.email,
          handle: parsed.data.handle || null,
          interests: parsed.data.interests,
          prediction: parsed.data.prediction || null,
          source: parsed.data.source || null,
        });
      }
      await tx.insert(growth_events).values({
        event: existing ? "early_access_updated" : "early_access_applied",
        metadata: {
          interests: parsed.data.interests,
          source: parsed.data.source || null,
        },
      });
      return { allowed: true } as const;
    });

    if (!result.allowed) {
      return {
        status: "error",
        message: "Too many requests. Please try again later.",
        fields,
      };
    }
  } catch (error) {
    console.error("[early-access] application failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "error",
      message: "We could not save your request. Please try again in a moment.",
      fields,
    };
  }

  return { status: "success" };
}

function makeRateLimitKey(scope: string, value: string) {
  return createHmac("sha256", env.SUPABASE_SERVICE_ROLE_KEY)
    .update(`${scope}\u0000${value}`)
    .digest("hex");
}

const applicationInviteSchema = z.object({
  applicationId: z.string().uuid(),
});

const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeInviteCode() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join("");
}

export async function inviteEarlyAccessApplicant(formData: FormData): Promise<
  | { status: "ok"; url: string }
  | { status: "error"; message: string }
> {
  const admin = await getCurrentProfile();
  if (!admin?.is_admin) return { status: "error", message: "Admin only." };

  const parsed = applicationInviteSchema.safeParse({
    applicationId: String(formData.get("applicationId") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", message: "Application not found." };
  }

  const code = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${parsed.data.applicationId}))`,
    );
    const [application] = await tx
      .select({
        id: early_access_applications.id,
        email: early_access_applications.email,
        inviteCode: early_access_applications.invite_code,
      })
      .from(early_access_applications)
      .where(eq(early_access_applications.id, parsed.data.applicationId))
      .limit(1);
    if (!application) return null;
    if (application.inviteCode) return application.inviteCode;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const candidate = makeInviteCode();
      const [created] = await tx
        .insert(invite_codes)
        .values({
          code: candidate,
          created_by: admin.id,
          note: "early-access applicant",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing()
        .returning({ code: invite_codes.code });
      if (!created) continue;

      await tx
        .update(early_access_applications)
        .set({
          invite_code: created.code,
          status: "invited",
          updated_at: new Date(),
        })
        .where(eq(early_access_applications.id, application.id));
      await tx.insert(growth_events).values({
        event: "early_access_invited",
        user_id: admin.id,
        invite_code: created.code,
        metadata: { applicationId: application.id },
      });
      return created.code;
    }
    throw new Error("Could not generate a unique invite code.");
  });

  if (!code) return { status: "error", message: "Application not found." };
  revalidatePath("/admin/growth");
  revalidatePath("/admin/access-requests");
  revalidatePath("/admin/invites");
  return {
    status: "ok",
    url: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}/i/${code}`,
  };
}
