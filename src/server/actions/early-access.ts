"use server";

import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { early_access_applications, growth_events } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";

export type EarlyAccessState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export const INITIAL_EARLY_ACCESS_STATE: EarlyAccessState = { status: "idle" };

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

  return { status: "success" };
}
