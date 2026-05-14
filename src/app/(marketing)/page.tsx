import Link from "next/link";
import { ArrowRight, Lock, ScrollText, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
      {/* ============================================================
          Hero — 2-col on lg+: headline + sub-heading + body left,
          ScoreBlock right. Stacks on mobile.
      ============================================================ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 xl:gap-x-16 gap-y-14 lg:gap-y-0 items-start pt-16 sm:pt-24 lg:pt-32 pb-24 sm:pb-32 lg:pb-40">
        <div className="lg:col-span-7 flex flex-col">
          <h1 className="font-display font-extrabold text-foreground text-[52px] sm:text-[80px] lg:text-[96px] xl:text-[112px] leading-[0.94] tracking-[-0.045em]">
            Be right.
            <br />
            <span className="text-muted-foreground">Get famous.</span>
          </h1>

          {/* Sub-heading — Fraunces, right under the head. Roman only. */}
          <p className="font-stylized text-[22px] sm:text-[28px] lg:text-[30px] leading-[1.32] tracking-[-0.01em] text-muted-foreground max-w-2xl mt-7 sm:mt-9">
            No wagering. No real money. Just reputation.{" "}
            <span className="text-foreground font-medium">
              Ethical by design.
            </span>
          </p>

          <p className="mt-6 sm:mt-8 text-body-lg sm:text-[18px] sm:leading-[1.6] text-muted-foreground max-w-xl">
            The track-record social network. Predict anything — tech, sports,
            crypto, pop culture — as a probability. Your accuracy compounds
            into a permanent, public{" "}
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
        </div>

        <div className="lg:col-span-5 lg:pt-4">
          <ScoreBlock />
        </div>
      </section>

      {/* ============================================================
          Three moments — feature cards, generous spacing
      ============================================================ */}
      <section className="pb-32 sm:pb-40">
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
    </div>
  );
}

/* ==============================================================
   Sub-components — local to the landing
============================================================== */

function ScoreBlock() {
  return (
    <div className="border-t border-border pt-8">
      <p className="text-overline text-muted-foreground mb-5">sample profile</p>

      <p className="text-overline text-muted-foreground mb-3">
        forecast score · @itoldyouso
      </p>
      <p className="font-display font-extrabold text-foreground text-[80px] sm:text-[112px] lg:text-[88px] xl:text-[112px] leading-none tabular-nums tracking-[-0.04em]">
        2,471
      </p>
      <p className="mt-5 text-body-sm text-muted-foreground">
        <span className="text-foreground font-medium">Top 0.2%</span>
        <span className="mx-2 text-border-strong">·</span>
        <span className="text-signal-positive font-medium">47-day streak</span>
      </p>

      <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6">
        <Stat label="Tech & AI" value="2,610" />
        <Stat label="Crypto" value="2,380" />
        <Stat label="Sports" value="1,920" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-overline text-muted-foreground">{label}</span>
      <span className="font-mono text-body-sm text-foreground tabular-nums font-medium">
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
