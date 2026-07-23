"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  early_access_applications,
  growth_events,
  invite_codes,
} from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export type EarlyAccessState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  handle: z.string().trim().max(80).optional(),
  interests: z.array(z.string().trim().min(1)).min(1).max(4),
  prediction: z.string().trim().max(280).optional(),
  source: z.string().trim().max(80).optional(),
});

export async function applyForEarlyAccess(
  _previous: EarlyAccessState,
  formData: FormData,
): Promise<EarlyAccessState> {
  const requestHeaders = await headers();
  const actor =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
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

  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? ""),
    handle: String(formData.get("handle") ?? ""),
    interests: formData.getAll("interests").map(String),
    prediction: String(formData.get("prediction") ?? ""),
    source: String(formData.get("source") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your application.",
    };
  }

  try {
    const [existing] = await db
      .select({ id: early_access_applications.id })
      .from(early_access_applications)
      .where(sql`lower(${early_access_applications.email}) = ${parsed.data.email}`)
      .limit(1);

    await db.transaction(async (tx) => {
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
    });
  } catch (error) {
    console.error("[early-access] application failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "error",
      message: "We could not save your request. Please try again in a moment.",
    };
  }

  return { status: "success" };
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
