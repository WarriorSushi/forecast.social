import { and, asc, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Check, LockKeyhole } from "lucide-react";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { PredictionSlider } from "@/components/markets/prediction-slider";
import { db } from "@/lib/db";
import {
  categories,
  markets,
  predictions,
  user_interests,
  users,
} from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Become a Founding Forecaster" };

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [profile, topicRows] = await Promise.all([
    db
      .select({
        username: users.username,
        display_name: users.display_name,
        onboarded_at: users.onboarded_at,
        onboarding_step: users.onboarding_step,
        invite_credits: users.invite_credits,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.sort_order)),
  ]);

  if (!profile) redirect("/sign-in");
  if (profile.onboarding_step === "complete" || profile.onboarded_at) {
    redirect("/feed");
  }

  if (profile.onboarding_step === "profile") {
    const placeholderUsername = profile.username.startsWith("user_")
      ? ""
      : profile.username;
    const placeholderDisplay =
      profile.display_name === "Forecaster" ? "" : profile.display_name;

    return (
      <div className="flex flex-col gap-9">
        <header className="flex flex-col gap-3">
          <p className="text-overline text-muted-foreground">step 1 of 2</p>
          <h1 className="font-display text-display-sm text-foreground leading-[1.05]">
            Claim your name.
          </h1>
          <p className="max-w-[52ch] text-body text-muted-foreground">
            Choose a handle and a few topics. We will give you three clear,
            everyday questions to start your public record.
          </p>
        </header>
        <OnboardingForm
          defaultUsername={placeholderUsername}
          defaultDisplayName={placeholderDisplay}
          topics={topicRows}
        />
      </div>
    );
  }

  const [interestRows, myCalls] = await Promise.all([
    db
      .select({ slug: user_interests.category_slug })
      .from(user_interests)
      .where(eq(user_interests.user_id, user.id)),
    db
      .selectDistinctOn([predictions.market_id], {
        marketId: predictions.market_id,
        probability: predictions.probability,
      })
      .from(predictions)
      .where(eq(predictions.user_id, user.id))
      .orderBy(predictions.market_id, sql`${predictions.created_at} desc`, sql`${predictions.id} desc`),
  ]);
  const interestSet = new Set(interestRows.map((row) => row.slug));
  const calledSet = new Set(myCalls.map((row) => row.marketId));
  const latestCallByMarket = new Map(
    myCalls.map((row) => [row.marketId, row.probability]),
  );

  const starterRows = await db
    .select({ market: markets, categoryName: categories.name })
    .from(markets)
    .innerJoin(categories, eq(markets.category_slug, categories.slug))
    .where(
      and(
        isNotNull(markets.onboarding_rank),
        ne(markets.discovery_state, "hidden"),
        gt(markets.closes_at, new Date()),
      ),
    )
    .orderBy(asc(markets.onboarding_rank))
    .limit(10);

  const starters = starterRows
    .sort((a, b) => {
      const aCalled = calledSet.has(a.market.id) ? 1 : 0;
      const bCalled = calledSet.has(b.market.id) ? 1 : 0;
      if (aCalled !== bCalled) return aCalled - bCalled;
      const aFit = interestSet.has(a.market.category_slug) ? 0 : 1;
      const bFit = interestSet.has(b.market.category_slug) ? 0 : 1;
      return aFit - bFit;
    })
    .slice(0, 6);
  const progress = Math.min(3, calledSet.size);

  return (
      <div className="flex flex-col gap-9">
      <header className="flex flex-col gap-3">
        <p className="text-overline text-muted-foreground">step 2 of 2</p>
        <h1 className="font-display text-display-sm text-foreground leading-[1.05]">
          Make three calls.
        </h1>
        <p className="max-w-[58ch] text-body text-muted-foreground">
          No obscure policy trivia. Pick questions you understand, move the
          probability, and lock it. Each new market unlocks one invitation.
        </p>
      </header>

      <div className="flex items-center justify-between gap-5 border-y border-border py-4">
        <div>
          <p className="font-display font-semibold text-foreground">
            {progress} of 3 starter calls
          </p>
          <p className="text-caption text-muted-foreground">
            {profile.invite_credits} of 5 invitations unlocked
          </p>
        </div>
        <div className="flex gap-2" aria-label={`${progress} of 3 complete`}>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={`grid size-8 place-items-center rounded-full border font-mono text-caption ${
                index < progress
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground"
              }`}
            >
              {index < progress ? <Check className="size-4" /> : index + 1}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {starters.map(({ market, categoryName }) => {
          const called = calledSet.has(market.id);
          return (
            <article
              key={market.id}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-overline text-muted-foreground">
                  {categoryName}
                </p>
                {called ? (
                  <span className="inline-flex items-center gap-1 font-mono text-caption text-muted-foreground">
                    <LockKeyhole className="size-3" /> locked
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 min-h-[3.5rem] font-display text-title font-bold text-foreground">
                {market.title}
              </h2>
              <div className="mt-6 border-t border-border pt-5">
                {called ? (
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-overline text-muted-foreground">your locked call</p>
                      <p className="mt-2 font-display text-display-sm font-extrabold tabular-nums text-foreground">
                        {Math.round((latestCallByMarket.get(market.id) ?? 0.5) * 100)}%
                      </p>
                    </div>
                    <p className="max-w-[18ch] text-right text-caption text-muted-foreground">
                      Complete. Choose a new market to advance.
                    </p>
                  </div>
                ) : (
                  <PredictionSlider
                    marketId={market.id}
                    initialValue={
                      market.consensus_probability == null
                        ? 50
                        : Math.round(market.consensus_probability * 100)
                    }
                    consensus={market.consensus_probability}
                    hasPrevious={false}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-caption text-muted-foreground">
          Your calls are permanent. You can change your mind later by adding
          a new timestamped call.
        </p>
      </div>
    </div>
  );
}
