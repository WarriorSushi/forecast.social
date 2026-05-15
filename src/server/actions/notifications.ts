"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";

export async function markAllNotificationsRead(): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  const me = await getCurrentProfile();
  if (!me) return { status: "error", message: "Sign in required." };

  await db
    .update(notifications)
    .set({ read_at: new Date() })
    .where(and(eq(notifications.user_id, me.id), isNull(notifications.read_at)));

  revalidatePath("/notifications");
  revalidatePath("/feed");
  return { status: "ok" };
}
