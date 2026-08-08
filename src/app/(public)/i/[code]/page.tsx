import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { invite_codes, markets, predictions, users } from "@/lib/db/schema";

type Params = { code: string };

export const metadata = { title: "You have been invited" };

export default async function InviteLandingPage({ params }: { params: Promise<Params> }) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase().slice(0, 16);
  const [invite] = await db
    .select({
      code: invite_codes.code,
      usedAt: invite_codes.used_at,
      expiresAt: invite_codes.expires_at,
      inviterUsername: users.username,
      inviterName: users.display_name,
      inviterAvatar: users.avatar_url,
      inviterScore: users.forecast_score,
      predictionId: predictions.id,
      probability: predictions.probability,
      marketTitle: markets.title,
      marketSlug: markets.slug,
    })
    .from(invite_codes)
    .innerJoin(users, eq(invite_codes.created_by, users.id))
    .leftJoin(predictions, eq(invite_codes.source_prediction_id, predictions.id))
    .leftJoin(markets, eq(predictions.market_id, markets.id))
    .where(eq(invite_codes.code, code))
    .limit(1);

  if (!invite) notFound();
  // Server-component expiry checks are evaluated once for this request.
  // eslint-disable-next-line react-hooks/purity -- intentional request-time state
  const now = Date.now();
  const expired = Boolean(
    invite.expiresAt && new Date(invite.expiresAt).getTime() <= now,
  );
  const available = !invite.usedAt && !expired;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[760px] flex-col justify-center py-12 sm:py-20">
      <div className="flex items-center gap-3">
        <Avatar className="size-11 rounded-md border border-border">
          {invite.inviterAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={invite.inviterAvatar} alt="" className="size-full rounded-md object-cover" />
          ) : (
            <AvatarFallback className="rounded-md bg-muted font-display">
              {invite.inviterName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <p className="font-display font-semibold text-foreground">{invite.inviterName}</p>
          <p className="font-mono text-caption text-muted-foreground">
            @{invite.inviterUsername} invited you
            {invite.inviterScore > 0
              ? ` · ${invite.inviterScore.toLocaleString()} score`
              : ""}
          </p>
        </div>
      </div>

      {invite.marketTitle && invite.probability != null ? (
        <div className="mt-9 border-y border-border py-8">
          <p className="text-overline text-muted-foreground">the challenge</p>
          <h1 className="mt-4 font-display text-display-sm text-foreground">{invite.marketTitle}</h1>
          <p className="mt-6 font-display text-display-md tabular-nums text-foreground">
            {Math.round(invite.probability * 100)}%
          </p>
          <p className="mt-1 text-body-sm text-muted-foreground">Their call. What is yours?</p>
        </div>
      ) : (
        <header className="mt-9">
          <p className="text-overline text-muted-foreground">private early access</p>
          <h1 className="mt-4 font-display text-display-md text-foreground">Put your predictions on the record.</h1>
        </header>
      )}

      <p className="mt-7 max-w-[58ch] text-body-lg text-muted-foreground">
        Forecast.social gives every probability a permanent timestamp, then scores it when reality arrives. No betting, no deleting bad calls.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {available ? (
          <Button asChild size="lg">
            <Link href={`/sign-up?code=${invite.code}`}>
              Accept invitation <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href="/early-access">Request an invitation</Link>
          </Button>
        )}
        {invite.marketSlug ? (
          <Button asChild size="lg" variant="outline">
            <Link href={`/markets/${invite.marketSlug}`}>See the market</Link>
          </Button>
        ) : null}
      </div>
      <p className="mt-4 inline-flex items-center gap-2 text-caption text-muted-foreground">
        <LockKeyhole className="size-3.5" />
        {available
          ? "Single-use invitation"
          : expired
            ? "This invitation has expired. Request access and we will review your application."
            : "This invitation has already been claimed"}
      </p>
    </div>
  );
}
