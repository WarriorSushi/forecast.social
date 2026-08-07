import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { notifications, type NotificationKind } from "@/lib/db/schema";

/**
 * Per-kind payload shapes. Stored verbatim in notifications.payload
 * (jsonb) so the bell + notifications page can render rich items
 * without re-joining a dozen tables on every read.
 */
export type NotificationPayload =
  | {
      kind: "follow";
      actor_username: string;
      actor_display_name: string;
    }
  | {
      kind: "market_resolved";
      market_slug: string;
      market_title: string;
      outcome: "yes" | "no" | "invalid";
      user_call: number; // 0..1, the user's latest pre-close call
      was_correct: boolean | null;
    }
  | {
      kind: "reply";
      actor_username: string;
      actor_display_name: string;
      market_slug: string;
      market_title: string;
      excerpt: string;
    }
  | {
      kind: "score_milestone";
      score: number;
      threshold: 1500 | 2000 | 2500;
    }
  | {
      kind: "bold_call";
      actor_username: string;
      actor_display_name: string;
      market_slug: string;
      market_title: string;
      probability: number;
    }
  | {
      kind: "proposal_resolved";
      proposal_id: string;
      title: string;
      status: "approved" | "rejected" | "needs_revision";
      rejection_reason: string | null;
      market_slug: string | null;
    };

export async function createNotification(
  userId: string,
  payload: NotificationPayload,
  dedupeKey?: string,
): Promise<void> {
  await createNotifications([{ userId, payload, dedupeKey }]);
}

export async function createNotifications(
  entries: {
    userId: string;
    payload: NotificationPayload;
    dedupeKey?: string;
  }[],
): Promise<void> {
  if (entries.length === 0) return;

  await db
    .insert(notifications)
    .values(
      entries.map(({ userId, payload, dedupeKey }) => ({
        user_id: userId,
        kind: payload.kind as NotificationKind,
        payload,
        dedupe_key: dedupeKey ?? null,
      })),
    )
    .onConflictDoNothing({ target: notifications.dedupe_key });
}

/**
 * Marks all unread notifications read for a user. Returns the count
 * affected — used by the bell to clear the badge optimistically.
 */
export async function markAllReadFor(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read_at: new Date() })
    .where(eq(notifications.user_id, userId));
}
