import Link from "next/link";
import {
  ArrowRight,
  Atom,
  Bitcoin,
  Calendar,
  Check,
  Lock,
  Sparkles,
  Trophy,
  Tv,
  Vote,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/aceternity/animated-number";
import {
  BentoGrid,
  BentoGridItem,
} from "@/components/aceternity/bento-grid";
import { SpotlightNew } from "@/components/aceternity/spotlight-new";

export default function LandingPage() {
  return (
    <div className="w-full overflow-x-hidden">
      <Hero />
      <ScoreExplainer />
      <NotBetting />
      <ReceiptShowcase />
      <HowItWorks />
      <Categories />
      <Leaderboard />
      <FAQ />
      <FinalCTA />
    </div>
  );
}

/* ==============================================================
   Container helper
============================================================== */
function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-overline text-muted-foreground mb-5">{children}</p>
  );
}

/* ==============================================================
   1. Hero
============================================================== */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <SpotlightNew />
      <Container className="relative z-10 pt-12 sm:pt-20 lg:pt-28 pb-24 sm:pb-32 lg:pb-40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 xl:gap-x-16 gap-y-16 lg:gap-y-0 items-start">
        <div className="lg:col-span-7 flex flex-col">
          <h1 className="font-display font-extrabold text-foreground text-[52px] sm:text-[80px] lg:text-[96px] xl:text-[112px] leading-[0.94] tracking-[-0.045em]">
            Be right.
            <br />
            <span className="text-muted-foreground">Get famous.</span>
          </h1>

          <p className="font-stylized italic text-[28px] sm:text-[34px] lg:text-[36px] leading-[1.18] text-muted-foreground max-w-2xl mt-7 sm:mt-9">
            No wagering. No real money. Just reputation.{" "}
            <span className="text-foreground not-italic font-medium font-sans">
              Ethical by design.
            </span>
          </p>

          <p className="mt-7 text-body-lg text-muted-foreground max-w-md">
            Call probabilities on anything. Your accuracy compounds into a
            permanent, public{" "}
            <span className="text-foreground font-medium">Forecast Score</span>.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
            <p className="text-body-sm text-muted-foreground sm:pl-3">
              Free. No card. No spam.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5">
          <FannedCardStack />
        </div>
      </div>
      </Container>
    </section>
  );
}

/* ==============================================================
   Fanned card stack — the hero visual.
   Front: profile card with score + categories.
   Behind, fanned out: two receipt cards.
============================================================== */
function FannedCardStack() {
  // One-sided fan: the focal profile card sits straight up, two receipt
  // cards spread to the right at progressively steeper angles, each one
  // further behind the last. Reads like a hand of cards revealed to one
  // side.
  return (
    <div className="relative w-full mx-auto pt-12 pb-20 lg:pt-4">
      {/* Far-right receipt — most splayed, furthest back */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-10 sm:top-8 z-10 mx-auto w-[78%] max-w-[330px] origin-bottom-left rotate-[18deg] translate-x-[36%] sm:translate-x-[40%]"
      >
        <ReceiptCard
          handle="@oddsbot"
          marketTitle="GPT-5 launches before July 2026"
          predictedPct={64}
          actualOutcome="Resolving · 41 days left"
          outcomeKind="pending"
          delta="···"
          subtle
        />
      </div>

      {/* Mid-right receipt — gentler angle, layered between */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-6 sm:top-5 z-20 mx-auto w-[78%] max-w-[330px] origin-bottom-left rotate-[9deg] translate-x-[18%] sm:translate-x-[22%]"
      >
        <ReceiptCard
          handle="@quanttrader"
          marketTitle="Fed pauses rates · May 2026 FOMC"
          predictedPct={78}
          actualOutcome="Resolved · Yes"
          outcomeKind="correct"
          delta="+18"
          subtle
        />
      </div>

      {/* Front profile card — focal, straight up */}
      <div className="relative z-30 w-full max-w-[400px] mx-auto">
        <ProfileCard />
      </div>
    </div>
  );
}

function ProfileCard() {
  return (
    <Card className="bg-surface-elevated border border-border shadow-[0_18px_42px_-18px_oklch(0%_0_0_/_0.18)] dark:shadow-[0_24px_48px_-12px_oklch(0%_0_0_/_0.5)] gap-0 py-0 rounded-2xl">
      <CardContent className="px-6 py-6 flex flex-col gap-5">
        {/* Identity row */}
        <div className="flex items-center gap-3.5">
          <AvatarSlot initial="I" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-title text-foreground leading-tight">
              itoldyouso
            </p>
            <p className="text-caption text-muted-foreground leading-tight">
              @itoldyouso · joined Mar 2026
            </p>
          </div>
        </div>

        {/* Score block — the hero number */}
        <div className="flex flex-col gap-2">
          <p className="text-overline text-muted-foreground">forecast score</p>
          <div className="flex items-baseline gap-2">
            <AnimatedNumber
              to={2471}
              className="font-display font-extrabold text-foreground text-[64px] sm:text-[72px] leading-none tabular-nums tracking-[-0.035em]"
            />
            <span className="font-mono text-caption text-muted-foreground tabular-nums">
              / 3,000
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-accent/12 text-accent text-caption font-semibold tracking-tight">
              Top 0.2%
            </span>
            <span className="text-body-sm text-signal-positive font-medium">
              47-day streak
            </span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="flex flex-col gap-2.5 border-t border-border pt-4">
          <CategoryRow label="Tech & AI" value={2610} max={3000} />
          <CategoryRow label="Crypto" value={2380} max={3000} />
          <CategoryRow label="Sports" value={1920} max={3000} />
        </div>
      </CardContent>
    </Card>
  );
}

function AvatarSlot({ initial }: { initial: string }) {
  return (
    <div
      aria-label="Profile picture placeholder"
      className="shrink-0 size-12 rounded-md bg-muted border border-border-strong flex items-center justify-center font-mono text-body-sm text-muted-foreground tabular-nums"
    >
      {initial}
    </div>
  );
}

function CategoryRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-overline text-muted-foreground w-20 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-foreground rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-caption text-foreground tabular-nums font-medium w-12 text-right">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function ReceiptCard({
  handle,
  marketTitle,
  predictedPct,
  actualOutcome,
  outcomeKind,
  delta,
  subtle = false,
}: {
  handle: string;
  marketTitle: string;
  predictedPct: number;
  actualOutcome: string;
  outcomeKind: "correct" | "missed" | "pending";
  delta: string;
  subtle?: boolean;
}) {
  const accentClass =
    outcomeKind === "correct"
      ? "text-signal-positive"
      : outcomeKind === "missed"
        ? "text-signal-negative"
        : "text-muted-foreground";

  return (
    <Card
      className={`bg-surface border border-border gap-0 py-0 rounded-2xl ${
        subtle ? "shadow-[0_12px_32px_-18px_oklch(0%_0_0_/_0.25)]" : ""
      }`}
    >
      <CardContent className="px-5 py-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-caption text-muted-foreground">
            {handle}
          </span>
          <span className={`text-overline ${accentClass}`}>
            {outcomeKind === "correct"
              ? "correct"
              : outcomeKind === "missed"
                ? "missed"
                : "pending"}
          </span>
        </div>
        <p className="font-display text-body-sm text-foreground -tracking-[0.01em] line-clamp-2">
          {marketTitle}
        </p>
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <div>
            <p className="text-overline text-muted-foreground">your call</p>
            <p className="font-display text-title font-bold text-foreground tabular-nums">
              {predictedPct}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-overline text-muted-foreground">score</p>
            <p
              className={`font-mono text-body-sm font-medium tabular-nums ${accentClass}`}
            >
              {delta}
            </p>
          </div>
        </div>
        <p className="text-caption text-muted-foreground">{actualOutcome}</p>
      </CardContent>
    </Card>
  );
}

/* ==============================================================
   2. Score explainer
============================================================== */
function ScoreExplainer() {
  return (
    <section className="border-t border-border/60 bg-muted/40">
      <Container className="py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-y-0 lg:gap-x-16 items-center">
          <div className="lg:col-span-6">
            <SectionEyebrow>The asset</SectionEyebrow>
            <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
              One number.{" "}
              <span className="text-muted-foreground">Earned, not bought.</span>
            </h2>
            <p className="mt-7 text-body-lg text-muted-foreground max-w-lg">
              Your{" "}
              <span className="text-foreground font-medium">Forecast Score</span>{" "}
              is the only currency on this network. It moves with every call
              you lock in.
            </p>

            <ul className="mt-9 flex flex-col gap-5">
              <ExplainerItem
                title="Brier-scored"
                body="Confident and correct beats hedged and correct. Confident and wrong gets punished more than hedging."
              />
              <ExplainerItem
                title="Shrinkage-corrected"
                body="New accounts start grounded. You can't fake a track record with three lucky calls."
              />
              <ExplainerItem
                title="Streak-multiplied"
                body="A long run of accurate calls compounds. Cold streaks bring you back down."
              />
            </ul>
          </div>

          <div className="lg:col-span-6">
            <ScoreShowcaseCard />
          </div>
        </div>
      </Container>
    </section>
  );
}

function ExplainerItem({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden
        className="mt-1.5 size-1.5 rounded-full bg-accent shrink-0"
      />
      <div>
        <p className="font-display text-title text-foreground">{title}</p>
        <p className="mt-1 text-body text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

function ScoreShowcaseCard() {
  return (
    <Card className="bg-surface-elevated border border-border rounded-2xl gap-0 py-0">
      <CardContent className="px-7 py-8 sm:px-9 sm:py-10 flex flex-col gap-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-overline text-muted-foreground mb-3">
              forecast score · @itoldyouso
            </p>
            <div className="flex items-baseline gap-3">
              <AnimatedNumber
                to={2471}
                duration={1.4}
                className="font-display font-extrabold text-foreground text-[88px] sm:text-[112px] leading-none tabular-nums tracking-[-0.04em]"
              />
              <span className="font-mono text-body-sm text-muted-foreground tabular-nums">
                / 3,000
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-accent/12 text-accent text-body-sm font-semibold tracking-tight">
            Top 0.2%
          </span>
          <span className="text-body-sm text-signal-positive font-medium">
            47-day streak
          </span>
          <span className="text-body-sm text-muted-foreground">
            412 resolved calls
          </span>
        </div>

        <Sparkline />

        <div className="grid grid-cols-3 gap-3 border-t border-border pt-6">
          <PillarStat label="Tech & AI" value="2,610" tone="positive" />
          <PillarStat label="Crypto" value="2,380" tone="neutral" />
          <PillarStat label="Sports" value="1,920" tone="neutral" />
        </div>
      </CardContent>
    </Card>
  );
}

function Sparkline() {
  // Hand-tuned points for a "rising-then-volatile" look. Pure SVG, no deps.
  const pts = [
    [0, 60],
    [10, 56],
    [20, 52],
    [30, 48],
    [40, 50],
    [50, 42],
    [60, 38],
    [70, 32],
    [80, 35],
    [90, 28],
    [100, 22],
  ];
  const d =
    "M " +
    pts.map(([x, y]) => `${x} ${y}`).join(" L ") +
    " L 100 64 L 0 64 Z";
  const line = "M " + pts.map(([x, y]) => `${x} ${y}`).join(" L ");
  return (
    <div className="flex items-center gap-4">
      <p className="text-overline text-muted-foreground shrink-0">90d</p>
      <svg
        viewBox="0 0 100 64"
        preserveAspectRatio="none"
        className="h-12 w-full text-signal-positive"
        aria-hidden
      >
        <path d={d} fill="currentColor" opacity={0.12} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function PillarStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "neutral";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-overline text-muted-foreground">{label}</span>
      <span
        className={`font-display text-headline tabular-nums ${
          tone === "positive" ? "text-foreground" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ==============================================================
   3. Receipt showcase
============================================================== */
function ReceiptShowcase() {
  return (
    <section className="border-t border-border/60 bg-muted/40">
      <Container className="py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-y-0 lg:gap-x-16 items-center">
          <div className="lg:col-span-5 lg:order-1">
            <SectionEyebrow>The artifact</SectionEyebrow>
            <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
              The receipt{" "}
              <span className="text-muted-foreground">is the product.</span>
            </h2>
            <p className="mt-7 text-body-lg text-muted-foreground max-w-md">
              Every correct call generates a shareable card. Crypto-clean
              numbers, the timestamp it was locked, the consensus at the time,
              the resolved outcome. Permanent. Public. Unfakeable.
            </p>
            <ul className="mt-7 flex flex-col gap-3 text-body-sm">
              <ReceiptFact label="Locked at submission, never edited." />
              <ReceiptFact label="Hashed and timestamped." />
              <ReceiptFact label="One PNG. Goes anywhere." />
            </ul>
          </div>

          <div className="lg:col-span-7 lg:order-2">
            <ShareCardMock />
          </div>
        </div>
      </Container>
    </section>
  );
}

function ReceiptFact({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3">
      <Check className="size-4 text-accent shrink-0" strokeWidth={2.5} />
      <span className="text-foreground">{label}</span>
    </li>
  );
}

function ShareCardMock() {
  return (
    <div className="relative">
      {/* Outer frame styled like a polaroid / poster */}
      <div className="aspect-[16/13] sm:aspect-[1/1] max-w-[560px] mx-auto rounded-3xl border border-border bg-surface-elevated shadow-[0_30px_60px_-20px_oklch(0%_0_0_/_0.25)] dark:shadow-[0_40px_80px_-20px_oklch(0%_0_0_/_0.6)] overflow-hidden">
        <div className="h-full w-full p-7 sm:p-10 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-overline text-muted-foreground">
                forecast.social · receipt
              </p>
              <p className="mt-2 font-mono text-caption text-muted-foreground">
                march 14, 2026 · 09:42 utc
              </p>
            </div>
            <span className="font-stylized italic text-title text-foreground tracking-tight">
              forecast<span className="text-accent">.</span>social
            </span>
          </div>

          <div>
            <p className="text-overline text-muted-foreground mb-2">
              the call
            </p>
            <h3 className="font-display text-headline sm:text-display-sm text-foreground leading-[1.05] -tracking-[0.03em]">
              Fed pauses rates in the May 2026 FOMC meeting.
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-6 border-t border-border pt-5 sm:pt-7">
            <ReceiptStat
              label="your call"
              value="78%"
              tone="foreground"
            />
            <ReceiptStat
              label="consensus"
              value="51%"
              tone="muted"
            />
            <ReceiptStat
              label="outcome"
              value="Yes"
              tone="positive"
            />
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-overline text-muted-foreground">forecaster</p>
              <p className="font-display text-title text-foreground mt-1">
                @itoldyouso
              </p>
            </div>
            <div className="text-right">
              <p className="text-overline text-muted-foreground">score</p>
              <p className="font-mono text-title text-signal-positive tabular-nums mt-1 font-semibold">
                +18
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "foreground" | "muted" | "positive";
}) {
  const valueClass =
    tone === "positive"
      ? "text-signal-positive"
      : tone === "muted"
        ? "text-muted-foreground"
        : "text-foreground";
  return (
    <div>
      <p className="text-overline text-muted-foreground">{label}</p>
      <p
        className={`mt-2 font-display text-headline sm:text-display-sm tabular-nums font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

/* ==============================================================
   4. How it works (3 moments)
============================================================== */
function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border/60">
      <Container className="py-24 sm:py-32">
        <div className="flex flex-col items-start max-w-3xl">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
            Three moments.{" "}
            <span className="text-muted-foreground">One scoreboard.</span>
          </h2>
        </div>

        <div className="mt-14 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <FeatureCard
            number="01"
            icon={<Lock className="size-5" strokeWidth={1.5} />}
            title="Predict"
            body="Drag a slider from 0 to 100%. Submit, and the call is locked forever. No edits. No takebacks."
          />
          <FeatureCard
            number="02"
            icon={<Trophy className="size-5" strokeWidth={1.5} />}
            title="Score"
            body="Brier-scored, shrinkage-corrected, streak-multiplied. Your Forecast Score sits between 0 and 3,000."
          />
          <FeatureCard
            number="03"
            icon={<Sparkles className="size-5" strokeWidth={1.5} />}
            title="Share"
            body="Every correct call generates a shareable card with the timeline, the consensus, and your number."
          />
        </div>
      </Container>
    </section>
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
    <Card className="bg-surface border-border hover:border-border-strong transition-colors gap-0 py-0 rounded-2xl">
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

/* ==============================================================
   5. Categories
============================================================== */
function Categories() {
  return (
    <section className="border-t border-border/60 bg-muted/40">
      <Container className="py-24 sm:py-32">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <SectionEyebrow>What you can call</SectionEyebrow>
            <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
              Markets for{" "}
              <span className="text-muted-foreground">everything you read.</span>
            </h2>
          </div>
          <p className="text-body-lg text-muted-foreground max-w-sm">
            Hundreds of resolvable questions every month. Your category-level
            score updates with each call.
          </p>
        </div>

        {/* Bento grid: Tech & AI is the featured cell (2 cols × 2 rows),
            other categories radiate around it. */}
        <BentoGrid>
          <BentoGridItem
            className="md:col-span-2 md:row-span-2 bg-surface"
            icon={<Atom className="size-6" strokeWidth={1.5} />}
            title="Tech & AI"
            description={
              <span className="font-stylized italic text-body text-muted-foreground">
                Will GPT-5 launch before July 2026?
              </span>
            }
            footer={
              <CategoryFooter
                volume="48"
                trend="+12 this week"
              />
            }
          />
          <BentoGridItem
            icon={<Bitcoin className="size-5" strokeWidth={1.5} />}
            title="Crypto"
            description={
              <span className="font-stylized italic">
                BTC above $120K by EOY 2026?
              </span>
            }
            footer={<CategoryFooter volume="36" />}
          />
          <BentoGridItem
            icon={<Trophy className="size-5" strokeWidth={1.5} />}
            title="Sports"
            description={
              <span className="font-stylized italic">
                Lakers win the 2026 NBA Finals?
              </span>
            }
            footer={<CategoryFooter volume="62" />}
          />
          <BentoGridItem
            icon={<Tv className="size-5" strokeWidth={1.5} />}
            title="Pop culture"
            description={
              <span className="font-stylized italic">
                Dune Part 3 hits $700M box office?
              </span>
            }
            footer={<CategoryFooter volume="22" />}
          />
          <BentoGridItem
            icon={<Vote className="size-5" strokeWidth={1.5} />}
            title="Politics"
            description={
              <span className="font-stylized italic">
                UK general election by Q4 2026?
              </span>
            }
            footer={<CategoryFooter volume="14" />}
          />
          <BentoGridItem
            className="md:col-span-2"
            icon={<Zap className="size-5" strokeWidth={1.5} />}
            title="Markets"
            description={
              <span className="font-stylized italic text-body text-muted-foreground">
                Fed pauses rates in the May FOMC meeting?
              </span>
            }
            footer={<CategoryFooter volume="29" trend="resolves in 17 days" />}
          />
        </BentoGrid>
      </Container>
    </section>
  );
}

function CategoryFooter({
  volume,
  trend,
}: {
  volume: string;
  trend?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
      <span className="font-mono text-caption text-muted-foreground">
        {volume} open
      </span>
      {trend ? (
        <span className="font-mono text-caption text-signal-positive">
          {trend}
        </span>
      ) : null}
    </div>
  );
}

/* ==============================================================
   6. Leaderboard preview
============================================================== */
function Leaderboard() {
  return (
    <section className="border-t border-border/60">
      <Container className="py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 lg:gap-x-16 items-start">
          <div className="lg:col-span-5">
            <SectionEyebrow>Leaderboard</SectionEyebrow>
            <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
              The proven.{" "}
              <span className="text-muted-foreground">Updated nightly.</span>
            </h2>
            <p className="mt-7 text-body-lg text-muted-foreground max-w-md">
              Rank lifts the highest-accuracy forecasters into the spotlight.
              You can climb. You can also fall.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <FilterPill active>All</FilterPill>
              <FilterPill>Tech & AI</FilterPill>
              <FilterPill>Crypto</FilterPill>
              <FilterPill>Sports</FilterPill>
              <FilterPill>Markets</FilterPill>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              <LeaderboardRow
                rank={1}
                handle="itoldyouso"
                score={2471}
                delta="+34"
                streak={47}
                highlight
              />
              <LeaderboardRow
                rank={2}
                handle="quanttrader"
                score={2402}
                delta="+12"
                streak={22}
              />
              <LeaderboardRow
                rank={3}
                handle="oddsbot"
                score={2358}
                delta="-8"
                streak={5}
              />
              <LeaderboardRow
                rank={4}
                handle="bayesfan"
                score={2294}
                delta="+19"
                streak={14}
              />
              <LeaderboardRow
                rank={5}
                handle="basecase"
                score={2240}
                delta="+4"
                streak={9}
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function FilterPill({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center px-3 h-8 rounded-full text-body-sm font-medium ${
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function LeaderboardRow({
  rank,
  handle,
  score,
  delta,
  streak,
  highlight = false,
}: {
  rank: number;
  handle: string;
  score: number;
  delta: string;
  streak: number;
  highlight?: boolean;
}) {
  const deltaTone = delta.startsWith("+")
    ? "text-signal-positive"
    : delta.startsWith("-")
      ? "text-signal-negative"
      : "text-muted-foreground";
  return (
    <div
      className={`grid grid-cols-[40px_1fr_auto] sm:grid-cols-[48px_1fr_72px_64px_80px] items-center gap-3 sm:gap-5 px-5 py-4 border-b border-border last:border-b-0 ${
        highlight ? "bg-accent/[0.04]" : ""
      }`}
    >
      <span className="font-mono text-body-sm text-muted-foreground tabular-nums">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="flex items-center gap-3 min-w-0">
        <AvatarSlot initial={handle.charAt(0).toUpperCase()} />
        <span className="font-display text-body text-foreground truncate">
          @{handle}
        </span>
      </div>
      <span className="hidden sm:inline font-mono text-body-sm text-muted-foreground tabular-nums">
        {streak}d
      </span>
      <span
        className={`hidden sm:inline font-mono text-body-sm tabular-nums font-medium ${deltaTone}`}
      >
        {delta}
      </span>
      <span className="font-display font-bold text-foreground text-body tabular-nums text-right">
        {score.toLocaleString()}
      </span>
    </div>
  );
}

/* ==============================================================
   7. Not betting
============================================================== */
function NotBetting() {
  return (
    <section className="border-t border-border/60">
      <Container className="py-24 sm:py-32">
        <div className="max-w-3xl">
          <SectionEyebrow>What this isn't</SectionEyebrow>
          <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
            No wagering.{" "}
            <span className="text-muted-foreground">
              No house. No money flowing between users.
            </span>
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <ComparePanel
            tone="negative"
            label="Betting sites"
            items={[
              "You deposit cash.",
              "Odds tilted toward the house.",
              "Wins get withdrawn. Losses get chased.",
              "Banned in most jurisdictions.",
            ]}
          />
          <ComparePanel
            tone="positive"
            label="forecast.social"
            items={[
              "You enter a probability.",
              "Score is math, not a market.",
              "Reputation compounds. Mistakes stay public.",
              "Legal everywhere. Ethical by design.",
            ]}
          />
        </div>
      </Container>
    </section>
  );
}

function ComparePanel({
  tone,
  label,
  items,
}: {
  tone: "negative" | "positive";
  label: string;
  items: string[];
}) {
  const Icon = tone === "negative" ? X : Check;
  const iconColor =
    tone === "negative" ? "text-signal-negative" : "text-signal-positive";
  return (
    <Card className="bg-surface border-border rounded-2xl gap-0 py-0">
      <CardContent className="px-7 py-8 flex flex-col gap-5">
        <p className="font-display text-title text-foreground -tracking-[0.015em]">
          {label}
        </p>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Icon
                className={`size-4 mt-1 shrink-0 ${iconColor}`}
                strokeWidth={2.5}
              />
              <span className="text-body text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ==============================================================
   8. FAQ
============================================================== */
function FAQ() {
  return (
    <section id="faq" className="border-t border-border/60 bg-muted/40">
      <Container className="py-24 sm:py-32">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <SectionEyebrow>FAQ</SectionEyebrow>
          <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
            Honest answers.{" "}
            <span className="text-muted-foreground">No fine print.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          <FaqItem
            q="Is this gambling?"
            a="No. You don't deposit money. You don't withdraw winnings. There is no opposing party. You enter a probability, the market resolves, and your score moves. The only thing changing hands is reputation."
          />
          <FaqItem
            q="How is my score calculated?"
            a="A Brier-based proper scoring rule, shrinkage-corrected so new accounts can't fake a record, and streak-multiplied so consistency compounds. Range is 0 to 3,000."
          />
          <FaqItem
            q="Can I edit a bad call?"
            a="No. Predictions lock at submission and stay public forever. That's the entire point. The locked-in receipt is what makes the score real."
          />
          <FaqItem
            q="Who can see my predictions?"
            a="Everyone. Calls and resolution outcomes are public by default. You can't have a track record that nobody else can audit."
          />
          <FaqItem
            q="Is it free?"
            a="Yes. Free to predict, free to follow other forecasters, free to share receipts. No card on file."
          />
          <FaqItem
            q="What if I'm wrong a lot?"
            a="Your score drops, and the missed calls stay public alongside the correct ones. That's the trade for the upside. Confidence has a price."
          />
        </div>
      </Container>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-title text-foreground -tracking-[0.015em]">
        {q}
      </h3>
      <p className="text-body text-muted-foreground leading-[1.6]">{a}</p>
    </div>
  );
}

/* ==============================================================
   9. Final CTA
============================================================== */
function FinalCTA() {
  return (
    <section className="border-t border-border/60">
      <Container className="py-28 sm:py-40">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <Calendar
            className="size-6 text-muted-foreground mb-7"
            strokeWidth={1.5}
            aria-hidden
          />
          <h2 className="font-display font-extrabold text-foreground text-[48px] sm:text-[80px] lg:text-[96px] leading-[0.96] tracking-[-0.045em]">
            Pick a probability.
            <br />
            <span className="text-muted-foreground">Earn the receipt.</span>
          </h2>
          <p className="mt-7 text-body-lg text-muted-foreground max-w-lg">
            Early access is open. Bring an opinion.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-14 px-8 text-base rounded-full"
            >
              <Link href="/sign-up" className="group">
                Get early access
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <p className="text-body-sm text-muted-foreground sm:pl-3">
              Takes 60 seconds. Pick a username, pick a category, pick a number.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
