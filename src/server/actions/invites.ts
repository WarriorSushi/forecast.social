"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  growth_events,
  invite_codes,
  markets,
  predictions,
  users,
} from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { env } from "@/lib/env";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // omit I, L, O, 0, 1
const CODE_LEN = 8;

function makeCode(): string {
  const bytes = randomBytes(CODE_LEN);
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

const generateSchema = z.object({
  count: z.coerce.number().int().min(1).max(200),
  note: z.string().trim().max(140).optional().or(z.literal("")),
});

export async function generateInviteCodes(formData: FormData): Promise<
  | { status: "ok"; created: number }
  | { status: "error"; message: string }
> {
  const me = await getCurrentProfile();
  if (!me) return { status: "error", message: "Sign in required." };
  if (!me.is_admin) return { status: "error", message: "Admin only." };

  const parsed = generateSchema.safeParse({
    count: formData.get("count")?.toString() ?? "10",
    note: formData.get("note")?.toString() ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Pick a count from 1 to 200." };
  }

  const rows = Array.from({ length: parsed.data.count }, () => ({
    code: makeCode(),
    created_by: me.id,
    note: parsed.data.note || null,
  }));

  // Insert with onConflictDoNothing in case randomBytes happens to
  // collide with an existing code (vanishingly unlikely with 8 chars
  // from a 31-symbol alphabet, but cheap insurance).
  await db.insert(invite_codes).values(rows).onConflictDoNothing();

  revalidatePath("/admin/invites");
  return { status: "ok", created: rows.length };
}

const memberInviteSchema = z.object({
  predictionId: z.string().uuid().optional().or(z.literal("")),
});

export async function createMemberInvite(formData: FormData): Promise<
  | { status: "ok"; code: string; url: string }
  | { status: "error"; message: string }
> {
  const me = await getCurrentProfile();
  if (!me) return { status: "error", message: "Sign in required." };

  const parsed = memberInviteSchema.safeParse({
    predictionId: String(formData.get("predictionId") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", message: "That forecast could not be found." };
  }

  let sourcePredictionId: string | null = null;
  if (parsed.data.predictionId) {
    const [source] = await db
      .select({ id: predictions.id })
      .from(predictions)
      .innerJoin(markets, eq(predictions.market_id, markets.id))
      .where(
        and(
          eq(predictions.id, parsed.data.predictionId),
          eq(predictions.user_id, me.id),
        ),
      )
      .limit(1);
    if (!source) {
      return {
        status: "error",
        message: "You can only challenge from your own forecast.",
      };
    }
    sourcePredictionId = source.id;
  }

  const code = makeCode();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const claimed = await db.transaction(async (tx) => {
    const [wallet] = await tx
      .update(users)
      .set({ invite_credits: sql`${users.invite_credits} - 1` })
      .where(and(eq(users.id, me.id), gt(users.invite_credits, 0)))
      .returning({ credits: users.invite_credits });
    if (!wallet) return null;

    await tx.insert(invite_codes).values({
      code,
      created_by: me.id,
      source_prediction_id: sourcePredictionId,
      expires_at: expiresAt,
      note: sourcePredictionId ? "forecast challenge" : "member invite",
    });
    await tx.insert(growth_events).values({
      event: sourcePredictionId ? "challenge_invite_created" : "invite_created",
      user_id: me.id,
      invite_code: code,
      metadata: { sourcePredictionId, creditsRemaining: wallet.credits },
    });
    return wallet;
  });

  if (!claimed) {
    return {
      status: "error",
      message: "Make a call on a new market to unlock another invite.",
    };
  }

  revalidatePath("/invites");
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  return { status: "ok", code, url: `${base}/i/${code}` };
}
