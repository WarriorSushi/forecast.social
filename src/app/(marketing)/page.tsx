import Link from "next/link";
import { ArrowRight, Lock, ScrollText, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-8">
      {/* ============================================================
          Hero
      ============================================================ */}
      <section className="pt-16 sm:pt-28 pb-20 sm:pb-32">
        <p className="text-overline text-muted-foreground mb-8 sm:mb-12">
          the track-record social network
        </p>

        <h1 className="font-display text-display-lg sm:text-display-xl text-foreground max-w-3xl">
          Be right.
          <br />
          <span className="italic text-foreground">Get famous.</span>
        </h1>

        <p className="mt-8 sm:mt-10 text-body-lg text-muted-foreground max-w-xl">
          Predict anything — tech launches, sports, crypto, pop culture — as a
          probability, not a hot take. Your accuracy compounds into a permanent,
          public <span className="text-foreground">Forecast Score</span>.
          Receipts for every right call.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href="/sign-up" className="group">
              Get early access
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-12 px-4 text-base">
            <Link href="/manifesto">Read the manifesto</Link>
          </Button>
        </div>

        {/* Sample score strip — the brand asset previewed inline. */}
        <ScoreStrip />
      </section>

      {/* ============================================================
          The three product moments
      ============================================================ */}
      <section className="pb-24 sm:pb-32">
        <div className="mb-10 sm:mb-14 flex items-end justify-between gap-6">
          <h2 className="font-display text-headline sm:text-display-sm text-foreground max-w-xl">
            Three moments. One scoreboard.
          </h2>
          <p className="text-overline text-muted-foreground hidden sm:block">
            v1 · early access
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <FeatureCard
            number="01"
            icon={<Lock className="size-4" />}
            title="The Predict"
            body="Drag a slider from 0% to 100%. Submit, and the call is locked forever. No edits. No takebacks. The receipt is the product."
          />
          <FeatureCard
            number="02"
            icon={<Trophy className="size-4" />}
            title="The Score"
            body="Brier-scored, shrinkage-corrected, streak-multiplied. Your Forecast Score sits between 0 and 3,000. Per category. For life."
          />
          <FeatureCard
            number="03"
            icon={<ScrollText className="size-4" />}
            title="The Receipt"
            body="Every correct call generates a shareable card with the timeline, the consensus, and your number. Built to screenshot."
          />
        </div>
      </section>

      {/* ============================================================
          Halal-by-design note (subtle, single line per PRD §2)
      ============================================================ */}
      <section className="pb-24 sm:pb-32 border-t border-border/60 pt-16">
        <p className="text-overline text-muted-foreground mb-6">
          legal everywhere · halal by design
        </p>
        <p className="font-display text-headline sm:text-display-sm text-foreground max-w-3xl">
          No wagering. No real money. Just reputation — earned one call at a
          time.
        </p>
      </section>
    </div>
  );
}

/* ==============================================================
   Sub-components — local to the landing
============================================================== */

function ScoreStrip() {
  return (
    <div className="mt-16 sm:mt-20 max-w-2xl border border-border rounded-[var(--radius)] bg-surface">
      <div className="px-5 sm:px-7 py-5 sm:py-6 flex items-center gap-6 sm:gap-10">
        <div className="flex-1 min-w-0">
          <p className="text-overline text-muted-foreground">
            forecast score · @itoldyouso
          </p>
          <p className="font-display text-display-md sm:text-display-lg text-foreground mt-2 leading-none tabular-nums">
            2,471
          </p>
        </div>
        <div className="h-12 w-px bg-border" aria-hidden />
        <div className="flex flex-col gap-1.5 text-right">
          <Stat label="Tech & AI" value="2,610" />
          <Stat label="Crypto" value="2,380" />
          <Stat label="Sports" value="1,920" />
        </div>
      </div>
      <div className="border-t border-border px-5 sm:px-7 py-3 flex items-center justify-between text-overline text-muted-foreground">
        <span>top 0.2%</span>
        <span className="text-signal-positive">47-day streak</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-end gap-3">
      <span className="text-overline text-muted-foreground">{label}</span>
      <span className="font-mono text-body-sm text-foreground tabular-nums w-12 text-right">
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
      <CardContent className="px-5 sm:px-6 py-6 sm:py-7 flex flex-col gap-5 h-full">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-overline">{number}</span>
          <span aria-hidden>{icon}</span>
        </div>
        <h3 className="font-display text-title text-foreground">{title}</h3>
        <p className="text-body-sm text-muted-foreground leading-relaxed">
          {body}
        </p>
      </CardContent>
    </Card>
  );
}
