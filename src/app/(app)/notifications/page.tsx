import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/server/actions/notifications";
import type { NotificationPayload } from "@/lib/notifications";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/sign-in?next=/notifications");

  const rows = await db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      payload: notifications.payload,
      read_at: notifications.read_at,
      created_at: notifications.created_at,
    })
    .from(notifications)
    .where(eq(notifications.user_id, me.id))
    .orderBy(desc(notifications.created_at))
    .limit(100);

  const unread = rows.filter((r) => r.read_at == null).length;

  async function clearAll() {
    "use server";
    await markAllNotificationsRead();
  }

  return (
    <div className="mx-auto w-full max-w-[720px] py-10 sm:py-14">
      <header className="flex items-end justify-between mb-10 gap-4">
        <div>
          <p className="text-overline text-muted-foreground mb-3">
            notifications
          </p>
          <h1 className="font-display text-display-sm sm:text-display-md text-foreground -tracking-[0.03em]">
            What you missed.
          </h1>
        </div>
        {unread > 0 ? (
          <form action={clearAll}>
            <Button type="submit" variant="ghost" size="sm" className="-mr-2">
              Mark all read
            </Button>
          </form>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 px-6 flex flex-col items-start gap-4 max-w-xl">
          <h3 className="font-display text-display-sm text-foreground">
            You&apos;re caught up.
          </h3>
          <p className="text-body-lg text-muted-foreground">
            New followers, market resolutions, replies, and score
            milestones land here.
          </p>
          <Link
            href="/feed"
            className="text-body-sm text-foreground font-medium hover:underline underline-offset-4"
          >
            Back to the feed →
          </Link>
        </div>
      ) : (
        <ul className="rounded-2xl border border-border bg-surface overflow-hidden">
          {rows.map((row) => {
            const payload = row.payload as NotificationPayload;
            const unread = row.read_at == null;
            return (
              <li
                key={row.id}
                className={
                  "px-5 py-4 border-b border-border last:border-b-0 " +
                  (unread ? "bg-accent/[0.04]" : "")
                }
              >
                <NotificationItem payload={payload} createdAt={row.created_at} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NotificationItem({
  payload,
  createdAt,
}: {
  payload: NotificationPayload;
  createdAt: Date;
}) {
  if (payload.kind === "follow") {
    return (
      <Row
        body={
          <>
            <Link
              href={`/u/${payload.actor_username}`}
              className="font-display text-body text-foreground hover:underline"
            >
              {payload.actor_display_name}
            </Link>{" "}
            <span className="text-muted-foreground">followed you.</span>
          </>
        }
        when={createdAt}
      />
    );
  }
  if (payload.kind === "market_resolved") {
    const correct = payload.was_correct;
    return (
      <Row
        body={
          <>
            <Link
              href={`/markets/${payload.market_slug}`}
              className="font-display text-body text-foreground hover:underline"
            >
              {payload.market_title}
            </Link>{" "}
            <span className="text-muted-foreground">
              resolved {payload.outcome}. Your call:{" "}
            </span>
            <span
              className={
                "font-mono tabular-nums " +
                (correct ? "text-signal-positive" : "text-signal-negative")
              }
            >
              {Math.round(payload.user_call * 100)}%
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {correct ? "correct" : "missed"}.
            </span>
          </>
        }
        when={createdAt}
      />
    );
  }
  if (payload.kind === "reply") {
    return (
      <Row
        body={
          <>
            <Link
              href={`/u/${payload.actor_username}`}
              className="font-display text-body text-foreground hover:underline"
            >
              {payload.actor_display_name}
            </Link>{" "}
            <span className="text-muted-foreground">replied on</span>{" "}
            <Link
              href={`/markets/${payload.market_slug}`}
              className="text-foreground hover:underline"
            >
              {payload.market_title}
            </Link>
            <span className="text-muted-foreground">
              {": "}
              {payload.excerpt.length === 140
                ? `${payload.excerpt}…`
                : payload.excerpt}
            </span>
          </>
        }
        when={createdAt}
      />
    );
  }
  if (payload.kind === "score_milestone") {
    return (
      <Row
        body={
          <>
            <span className="text-muted-foreground">You crossed</span>{" "}
            <span className="font-mono tabular-nums text-accent font-semibold">
              {payload.threshold.toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              . Score:{" "}
              <span className="font-mono text-foreground">
                {payload.score.toLocaleString()}
              </span>
              .
            </span>
          </>
        }
        when={createdAt}
      />
    );
  }
  if (payload.kind === "bold_call") {
    return (
      <Row
        body={
          <>
            <Link
              href={`/u/${payload.actor_username}`}
              className="font-display text-body text-foreground hover:underline"
            >
              {payload.actor_display_name}
            </Link>{" "}
            <span className="text-muted-foreground">made a bold call:</span>{" "}
            <Link
              href={`/markets/${payload.market_slug}`}
              className="text-foreground hover:underline"
            >
              {payload.market_title}
            </Link>{" "}
            <span className="font-mono tabular-nums text-foreground">
              {Math.round(payload.probability * 100)}%
            </span>
          </>
        }
        when={createdAt}
      />
    );
  }
  if (payload.kind === "proposal_resolved") {
    const verb =
      payload.status === "approved"
        ? "is live."
        : payload.status === "rejected"
          ? "was declined."
          : "needs revision.";
    const tone =
      payload.status === "approved"
        ? "text-signal-positive"
        : payload.status === "rejected"
          ? "text-signal-negative"
          : "text-muted-foreground";
    return (
      <Row
        body={
          <>
            <span className="text-muted-foreground">Your proposed market</span>{" "}
            {payload.market_slug && payload.status === "approved" ? (
              <Link
                href={`/markets/${payload.market_slug}`}
                className="font-display text-body text-foreground hover:underline"
              >
                {payload.title}
              </Link>
            ) : (
              <span className="font-display text-body text-foreground">
                {payload.title}
              </span>
            )}{" "}
            <span className={tone}>{verb}</span>
            {payload.rejection_reason ? (
              <span className="block mt-1 text-caption text-muted-foreground italic">
                {payload.rejection_reason}
              </span>
            ) : null}
          </>
        }
        when={createdAt}
      />
    );
  }
  return null;
}

function Row({
  body,
  when,
}: {
  body: React.ReactNode;
  when: Date;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="text-body text-foreground leading-[1.5]">{body}</p>
      <span className="font-mono text-caption text-muted-foreground tabular-nums shrink-0">
        {relativeTime(when)}
      </span>
    </div>
  );
}

function relativeTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  return `${mo}mo ago`;
}
