import { and, desc, eq, isNull, or, gt } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, LockKeyhole, Users } from "lucide-react";

import { CreateInviteButton } from "@/components/invites/create-invite-button";
import { db } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import {
  invite_codes,
  markets,
  predictions,
  users,
} from "@/lib/db/schema";

export const metadata = { title: "Your invitations" };

export default async function InvitesPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/sign-in");

  const [invites, recentCalls] = await Promise.all([
    db
      .select({
        code: invite_codes.code,
        createdAt: invite_codes.created_at,
        expiresAt: invite_codes.expires_at,
        usedAt: invite_codes.used_at,
        usedBy: users.username,
        marketTitle: markets.title,
        marketSlug: markets.slug,
      })
      .from(invite_codes)
      .leftJoin(users, eq(invite_codes.used_by, users.id))
      .leftJoin(predictions, eq(invite_codes.source_prediction_id, predictions.id))
      .leftJoin(markets, eq(predictions.market_id, markets.id))
      .where(eq(invite_codes.created_by, me.id))
      .orderBy(desc(invite_codes.created_at))
      .limit(25),
    db
      .select({
        id: predictions.id,
        probability: predictions.probability,
        title: markets.title,
        slug: markets.slug,
      })
      .from(predictions)
      .innerJoin(markets, eq(predictions.market_id, markets.id))
      .where(
        and(
          eq(predictions.user_id, me.id),
          or(isNull(markets.resolved_at), gt(markets.resolved_at, predictions.created_at)),
        ),
      )
      .orderBy(desc(predictions.created_at))
      .limit(5),
  ]);

  return (
    <div className="mx-auto w-full max-w-[900px] py-8 sm:py-12">
      <header className="max-w-[680px]">
        <p className="text-overline text-muted-foreground">founding forecasters</p>
        <h1 className="mt-4 font-display text-display-sm text-foreground">
          Bring someone sharp.
        </h1>
        <p className="mt-4 text-body-lg text-muted-foreground">
          Your first call on a new market unlocks one invitation, up to five.
          Use an invite by itself or attach it to a forecast challenge.
        </p>
      </header>

      <section className="mt-9 grid gap-6 border-y border-border py-7 sm:grid-cols-[220px_1fr]">
        <div>
          <p className="text-overline text-muted-foreground">available now</p>
          <p className="mt-2 font-display text-display-md tabular-nums text-foreground">
            {me.invite_credits}<span className="text-muted-foreground">/5</span>
          </p>
        </div>
        <div className="self-center">
          <CreateInviteButton disabled={me.invite_credits === 0} />
          {me.invite_credits === 0 ? (
            <p className="mt-2 text-caption text-muted-foreground">
              Make a call on a new market to unlock your next invitation.
            </p>
          ) : null}
        </div>
      </section>

      {recentCalls.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-headline text-foreground">Challenge a friend</h2>
            <span className="text-overline text-muted-foreground">your latest calls</span>
          </div>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {recentCalls.map((call) => (
              <li key={call.id} className="grid gap-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <Link href={`/markets/${call.slug}`} className="font-display font-semibold text-foreground hover:underline">
                    {call.title}
                  </Link>
                  <p className="mt-1 font-mono text-caption text-muted-foreground">
                    your call · {Math.round(call.probability * 100)}%
                  </p>
                </div>
                <CreateInviteButton
                  predictionId={call.id}
                  label="Challenge"
                  disabled={me.invite_credits === 0}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-headline text-foreground">Invitation history</h2>
        {invites.length === 0 ? (
          <div className="mt-4 border-y border-border py-8">
            <Users className="size-5 text-muted-foreground" />
            <p className="mt-3 font-display font-semibold text-foreground">No invitations used yet.</p>
            <p className="mt-1 text-body-sm text-muted-foreground">Your sent and joined invitations will appear here.</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {invites.map((invite) => (
              <li key={invite.code} className="grid gap-2 py-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <Link href={`/i/${invite.code}`} className="font-mono text-body-sm text-foreground hover:underline">
                  {invite.code}
                </Link>
                <div className="min-w-0">
                  <p className="truncate text-body-sm text-foreground">
                    {invite.marketTitle ?? "Open invitation"}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {formatDate(invite.createdAt)}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 text-caption font-mono ${invite.usedAt ? "text-signal-positive" : "text-muted-foreground"}`}>
                  {invite.usedAt ? <Check className="size-3.5" /> : <LockKeyhole className="size-3.5" />}
                  {invite.usedBy ? `@${invite.usedBy}` : "ready"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
