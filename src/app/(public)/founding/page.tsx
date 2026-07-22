import { asc, isNotNull } from "drizzle-orm";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const metadata = {
  title: "Founding Forecasters",
  description: "The first 250 people building a public forecasting record on forecast.social.",
};

export default async function FoundingForecastersPage() {
  const founders = await db
    .select({
      number: users.founding_member_number,
      username: users.username,
      displayName: users.display_name,
      avatarUrl: users.avatar_url,
      score: users.forecast_score,
      predictions: users.total_predictions,
    })
    .from(users)
    .where(isNotNull(users.founding_member_number))
    .orderBy(asc(users.founding_member_number))
    .limit(250);

  return (
    <div className="mx-auto w-full max-w-[960px] py-12 sm:py-20">
      <header className="max-w-[720px]">
        <p className="text-overline text-muted-foreground">the first 250</p>
        <h1 className="mt-5 font-display text-display-md text-foreground">Founding Forecasters.</h1>
        <p className="mt-5 text-body-lg text-muted-foreground">
          Three permanent calls earn a permanent founding number. These are the people who arrived before the scoreboard mattered.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/early-access">Request early access</Link>
        </Button>
      </header>

      <section className="mt-12 border-t border-border">
        {founders.length === 0 ? (
          <div className="py-12">
            <p className="font-display text-headline text-foreground">The first place is still open.</p>
            <p className="mt-2 text-body text-muted-foreground">Make three calls to become Founding Forecaster #1.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {founders.map((founder) => (
              <li key={founder.username} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 py-4">
                <span className="font-mono text-body text-muted-foreground tabular-nums">#{founder.number}</span>
                <Link href={`/u/${founder.username}`} className="flex min-w-0 items-center gap-3 group">
                  <Avatar className="size-9 rounded-md border border-border">
                    {founder.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={founder.avatarUrl} alt="" className="size-full rounded-md object-cover" />
                    ) : (
                      <AvatarFallback className="rounded-md bg-muted text-caption">
                        {founder.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate font-display font-semibold text-foreground group-hover:underline">{founder.displayName}</span>
                    <span className="block truncate font-mono text-caption text-muted-foreground">@{founder.username}</span>
                  </span>
                </Link>
                <span className="font-mono text-caption text-muted-foreground tabular-nums">
                  {founder.score > 0 ? founder.score.toLocaleString() : `${founder.predictions} calls`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
