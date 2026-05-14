import Link from "next/link";
import { ArrowRight, Lock, ScrollText, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-8">
      {/* ============================================================
          Hero — Geist 800, oversized. No serif, no italic, no kicker.
      ============================================================ */}
      <section className="pt-20 sm:pt-32 pb-24 sm:pb-40">
        <h1 className="font-display text-display-lg sm:text-display-xl text-foreground max-w-4xl">
          Be right.{" "}
          <span className="text-muted-foreground">Get famous.</span>
        </h1>

        <p className="mt-8 sm:mt-10 text-body-lg sm:text-[20px] sm:leading-[1.5] text-muted-foreground max-w-xl">
          The track-record social network. Predict anything — tech, sports,
          crypto, pop culture — as a probability. Your accuracy compounds into
          a permanent, public{" "}
          <span className="text-foreground font-medium">Forecast Score</span>.
        </p>

        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-14 px-7 text-base rounded-full"
          >
            <Link href="/sign-up" className="group">
              Get early access
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-14 px-5 text-base rounded-full"
          >
            <Link href="/manifesto">Read the manifesto</Link>
          </Button>
        </div>

        {/* Sample score block — the brand asset, oversized. */}
        <ScoreBlock />
      </section>

      {/* ============================================================
          Three moments — feature cards, generous spacing
      ============================================================ */}
      <section className="pb-24 sm:pb-40">
        <h2 className="font-display text-display-md sm:text-display-lg text-foreground max-w-3xl">
          Three moments.{" "}
          <span className="text-muted-foreground">One scoreboard.</span>
        </h2>

        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <FeatureCard
            number="01"
            icon={<Lock className="size-5" strokeWidth={1.5} />}
            title="Predict"
            body="Drag a slider from 0% to 100%. Submit, and the call is locked forever. No edits. No takebacks."
          />
          <FeatureCard
            number="02"
            icon={<Trophy className="size-5" strokeWidth={1.5} />}
            title="Score"
            body="Brier-scored, shrinkage-corrected, streak-multiplied. Your Forecast Score sits between 0 and 3,000."
          />
          <FeatureCard
            number="03"
            icon={<ScrollText className="size-5" strokeWidth={1.5} />}
            title="Share"
            body="Every correct call generates a shareable card with the timeline, the consensus, and your number."
          />
        </div>
      </section>

      {/* ============================================================
          Halal-by-design / legal everywhere
      ============================================================ */}
      <section className="pb-32 sm:pb-40">
        <h2 className="font-display text-display-md sm:text-display-lg text-foreground max-w-3xl">
          No wagering.{" "}
          <span className="text-muted-foreground">
            No real money. Just reputation.
          </span>
        </h2>
        <p className="mt-6 text-body-lg text-muted-foreground max-w-xl">
          Halal by design. Legal everywhere. Accessible to anyone with an
          opinion.
        </p>
      </section>
    </div>
  );
}

/* ==============================================================
   Sub-components — local to the landing
============================================================== */

function ScoreBlock() {
  return (
    <div className="mt-20 sm:mt-28 max-w-2xl">
      <p className="text-overline text-muted-foreground mb-5">
        sample profile
      </p>
      <div className="flex items-end justify-between gap-6 sm:gap-10 border-t border-border pt-8">
        <div className="flex-1 min-w-0">
          <p className="text-overline text-muted-foreground mb-3">
            forecast score · @itoldyouso
          </p>
          <p className="font-display text-display-lg sm:text-display-xl text-foreground leading-none tabular-nums">
            2,471
          </p>
          <p className="mt-4 text-body-sm text-muted-foreground">
            <span className="text-foreground font-medium">Top 0.2%</span>
            <span className="mx-2 text-border-strong">·</span>
            <span className="text-signal-positive font-medium">
              47-day streak
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2.5 text-right shrink-0">
          <Stat label="Tech & AI" value="2,610" />
          <Stat label="Crypto" value="2,380" />
          <Stat label="Sports" value="1,920" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <span className="text-overline text-muted-foreground">{label}</span>
      <span className="font-mono text-body-sm text-foreground tabular-nums w-12 text-right font-medium">
        {value}
      </span>
    </div>
  );
}

function FeatureCard({
  number,
  icon,
  title,
  body,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="bg-surface border-border hover:border-border-strong transition-colors gap-0 py-0">
      <CardContent className="px-6 sm:px-7 py-7 sm:py-8 flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-overline">{number}</span>
          <span aria-hidden>{icon}</span>
        </div>
        <h3 className="font-display text-headline text-foreground -tracking-[0.02em]">
          {title}
        </h3>
        <p className="text-body-sm text-muted-foreground leading-[1.6]">
          {body}
        </p>
      </CardContent>
    </Card>
  );
}
