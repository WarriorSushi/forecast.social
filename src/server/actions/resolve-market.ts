"use server";

import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { finalizeMarketResolution } from "@/lib/resolution/finalize";

const schema = z.object({
  marketId: z.string().uuid("Invalid market reference."),
  outcome: z.enum(["yes", "no", "invalid"]),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  correction: z.boolean(),
});

type ResolveResult =
  | {
      status: "ok";
      affectedUsers: number;
      outcome: "yes" | "no" | "invalid";
      effectsPending: boolean;
    }
  | { status: "error"; message: string };

export async function resolveMarket(formData: FormData): Promise<ResolveResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Sign in required." };
  if (!profile.is_admin) return { status: "error", message: "Admin only." };

  const parsed = schema.safeParse({
    marketId: formData.get("marketId")?.toString() ?? "",
    outcome: formData.get("outcome")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
    correction: formData.get("correction") === "true",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const result = await finalizeMarketResolution({
      marketId: parsed.data.marketId,
      outcome: parsed.data.outcome,
      resolvedBy: profile.id,
      resolver: "admin",
      notes: parsed.data.notes,
      allowCorrection: parsed.data.correction,
    });
    return {
      status: "ok",
      affectedUsers: result.affectedUsers,
      outcome: parsed.data.outcome,
      effectsPending: result.effectsPending,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not resolve this market.",
    };
  }
}
