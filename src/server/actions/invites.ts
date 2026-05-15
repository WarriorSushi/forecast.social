"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import { db } from "@/lib/db";
import { invite_codes } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";

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
