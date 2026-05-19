import Link from "next/link";
import { and, asc, desc, gt, isNull } from "drizzle-orm";
import {
  ArrowRight,
  Atom,
  Bitcoin,
  Check,
  Trophy,
  Tv,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/aceternity/animated-number";
import {
  BentoGrid,
  BentoGridItem,
} from "@/components/aceternity/bento-grid";
import { SpotlightNew } from "@/components/aceternity/spotlight-new";
import { db } from "@/lib/db";
import { markets, users } from "@/lib/db/schema";

export const revalidate = 300; // 5-min ISR; landing isn't tied to a session

type CategorySlug = "tech-ai" | "crypto" | "sports" | "pop-culture";

type CategoryHighlight = {
  slug: CategorySlug;
  title: string;
  prediction_count: number;
  /** Up to three more open markets in the same category, for the featured cell. */
  others: string[];
};

type LeaderRow = {
  username: string;
  forecast_score: number;
  current_streak: number;
};

export default async function LandingPage() {
  const [categoryHighlights, topLeaders] = await Promise.all([
    fetchCategoryHighlights(),
    fetchTopLeaders(),
  ]);

  return (
    <div className="w-full overflow-x-hidden">
      <Hero />
      <ScoreExplainer />
      <NotBetting />
      <ProofShowcase />
      <HowItWorks />
      <Categories highlights={categoryHighlights} />
      <Leaderboard leaders={topLeaders} />
      <FAQ />
      <FinalCTA />
    </div>
  );
}

async function fetchCategoryHighlights(): Promise<
  Record<CategorySlug, CategoryHighlight | null>
> {
  const initial: Record<CategorySlug, CategoryHighlight | null> = {
    "tech-ai": null,
    crypto: null,
    sports: null,
    "pop-culture": null,
  };

  const rows = await db
    .select({
      slug: markets.category_slug,
      title: markets.title,
      prediction_count: markets.prediction_count,
      closes_at: markets.closes_at,
    })
    .from(markets)
    .where(and(isNull(markets.resolved_at), gt(markets.closes_at, new Date())))
    .orderBy(desc(markets.prediction_count), asc(markets.closes_at))
    .limit(160);

  const buckets: Record<CategorySlug, typeof rows> = {
    "tech-ai": [],
    crypto: [],
    sports: [],
    "pop-culture": [],
  };
  for (const r of rows) {
    const key = r.slug as CategorySlug;
    if (key in buckets && buckets[key].length < 4) buckets[key].push(r);
  }

  for (const key of Object.keys(buckets) as CategorySlug[]) {
    const items = buckets[key];
    if (items.length === 0) continue;
    initial[key] = {
      slug: key,
      title: items[0].title,
      prediction_count: items[0].prediction_count,
      others: items.slice(1, 4).map((r) => r.title),
    };
  }
  return initial;
}

async function fetchTopLeaders(): Promise<LeaderRow[]> {
  return db
    .select({
      username: users.username,
      forecast_score: users.forecast_score,
      current_streak: users.current_streak,
    })
    .from(users)
    .where(gt(users.forecast_score, 0))
    .orderBy(desc(users.forecast_score))
    .limit(5);
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
          <h1 className="font-display font-extrabold text-foreground text-[40px] sm:text-[56px] lg:text-[72px] xl:text-[80px] leading-[0.98] tracking-[-0.04em]">
            Bet your reputation.
            <br />
            <span className="text-muted-foreground">Not your money.</span>
          </h1>

          <p className="font-stylized italic text-[22px] sm:text-[24px] lg:text-[26px] leading-[1.18] text-muted-foreground max-w-2xl mt-5 sm:mt-6">
            Be early. Be right.{" "}
            <span className="text-foreground not-italic font-medium font-sans">
              Be famous for it.
            </span>
          </p>

          <p className="mt-7 text-body-lg text-muted-foreground max-w-md">
            Call a probability on anything. Your accuracy compounds into a
            permanent, public{" "}
            <span className="text-foreground font-medium">Forecast Score</span>{" "}
            nobody can fake.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-14 px-7 text-base rounded-full"
            >
              <Link href="/sign-up" className="group">
                Start a record
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <p className="text-body-sm text-muted-foreground sm:pl-3">
              Free. No card. Loud opinions welcome.
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
        <CallCard
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
        <CallCard
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
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-foreground/8 text-foreground text-caption font-semibold tracking-tight">
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

function CallCard({
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
            <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
              How scoring{" "}
              <span className="text-muted-foreground">actually works.</span>
            </h2>
            <p className="mt-7 text-body-lg text-muted-foreground max-w-lg">
              Your{" "}
              <span className="text-foreground font-medium">Forecast Score</span>{" "}
              is the only currency on this network. Brier-scored, shrinkage-
              corrected, streak-multiplied. No vibes.
            </p>

            <ul className="mt-9 flex flex-col gap-5">
              <ExplainerItem
                title="Confidence is priced in"
                body="Calling 80% on a Yes beats calling 51%. Calling 80% on a No costs you more than calling 51% would have. Proper scoring rule, no fudging."
              />
              <ExplainerItem
                title="Three lucky calls don't make you elite"
                body="The first few predictions are pulled toward an average baseline. Real rank arrives after a real sample."
              />
              <ExplainerItem
                title="Streaks compound, idle decays"
                body="Up to +20% bonus for consecutive correct calls. Stop predicting for two months and your score quietly trims."
              />
            </ul>
          </div>

          <div className="lg:col-span-6">
            <ScoreShowcaseCard />
          </div>
        </div>

        {/* Worked example — the call → resolve → score chain made concrete. */}
        <WorkedExample />
      </Container>
    </section>
  );
}

function WorkedExample() {
  return (
    <div className="mt-24 sm:mt-28">
      <div className="flex items-baseline justify-between mb-7 border-b border-border pb-4">
        <p className="text-overline text-muted-foreground">worked example</p>
        <p className="font-mono text-caption text-muted-foreground tabular-nums">
          one call, three steps
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
        <WorkedStep
          step="01"
          label="you called"
          headline="72%"
          tag="Yes · Fed pauses May FOMC"
          tone="foreground"
          context="Consensus at the time of your call: 51%."
        />
        <WorkedStep
          step="02"
          label="market resolved"
          headline="Yes"
          tag="May 1, 2026 · 18:00 UTC"
          tone="positive"
          context="Source: federalreserve.gov press release."
        />
        <WorkedStep
          step="03"
          label="score moved"
          headline="+18"
          tag="2,453 → 2,471"
          tone="positive"
          context={
            <>
              Brier 0.08 · skill 0.85 · ×1.05 streak.{" "}
              <span className="text-foreground">Out of 3,000.</span>
            </>
          }
        />
      </div>

      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        <LeverCard
          label="Calibration"
          value="Brier 0–1"
          body="Your probability vs. the outcome, squared. Lower is sharper."
        />
        <LeverCard
          label="Volume"
          value="8-call prior"
          body="Eight average calls of baseline weight before you're judged elite."
        />
        <LeverCard
          label="Streak"
          value="+1% / call"
          body="Per consecutive correct call. Caps at +20%."
        />
        <LeverCard
          label="Decay"
          value="14 / 30 / 60d"
          body="Stop calling and the score slowly shrinks. Comes back the moment you do."
        />
      </div>
    </div>
  );
}

function WorkedStep({
  step,
  label,
  headline,
  tag,
  tone,
  context,
}: {
  step: string;
  label: string;
  headline: string;
  tag: string;
  tone: "foreground" | "positive";
  context: React.ReactNode;
}) {
  const headlineClass =
    tone === "positive" ? "text-signal-positive" : "text-foreground";
  return (
    <div className="bg-surface-elevated px-6 sm:px-8 py-7 sm:py-9 flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-overline text-muted-foreground tabular-nums">
          {step}
        </span>
        <span className="text-overline text-muted-foreground">{label}</span>
      </div>
      <p
        className={`font-display font-extrabold tabular-nums text-[64px] sm:text-[80px] leading-[0.92] tracking-[-0.04em] ${headlineClass}`}
      >
        {headline}
      </p>
      <p className="font-mono text-caption text-muted-foreground">{tag}</p>
      <p className="text-body-sm text-muted-foreground leading-[1.55]">
        {context}
      </p>
    </div>
  );
}

function LeverCard({
  label,
  value,
  body,
}: {
  label: string;
  value: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-overline text-muted-foreground">{label}</p>
      <p className="font-mono text-body text-foreground tabular-nums font-medium">
        {value}
      </p>
      <p className="text-body-sm text-muted-foreground leading-[1.55]">
        {body}
      </p>
    </div>
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
  // 90-day trajectory the journey to 2,471 vs a flat baseline. This
  // section pivoted from "restate the hero number" to "show the climb"
  // per the overhaul plan T2.5 — three sections shouldn't share the
  // same 2,471 example.
  return (
    <Card className="bg-surface-elevated border border-border rounded-2xl gap-0 py-0">
      <CardContent className="px-7 py-8 sm:px-9 sm:py-10 flex flex-col gap-7">
        <div className="flex items-baseline justify-between">
          <p className="text-overline text-muted-foreground">
            @itoldyouso · 90-day climb
          </p>
          <p className="font-mono text-caption text-muted-foreground tabular-nums">
            1,850 → 2,471
          </p>
        </div>

        <ScoreJourneyChart />

        <div className="grid grid-cols-3 gap-3 border-t border-border pt-6">
          <PillarStat label="started" value="1,850" tone="neutral" />
          <PillarStat label="peak" value="2,503" tone="positive" />
          <PillarStat label="today" value="2,471" tone="positive" />
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreJourneyChart() {
  // 90-day score history, percentage of 3,000 scale. Hand-shaped to
  // tell a "calibrated rise with one bad week" story. Markers on key
  // moments (resolutions, milestones) give the line narrative.
  const pts: Array<[number, number]> = [
    [0, 62],
    [6, 60],
    [13, 58],
    [20, 55],
    [27, 52],
    [33, 48],
    [40, 44],
    [47, 41],
    [55, 38],
    [60, 34],
    [66, 36], // small dip — a missed call
    [72, 32],
    [78, 27],
    [85, 24],
    [92, 22],
    [100, 22],
  ];
  const lineD = "M " + pts.map(([x, y]) => `${x} ${y}`).join(" L ");
  const fillD = `${lineD} L 100 100 L 0 100 Z`;

  // Notable milestone markers
  const markers: Array<{ x: number; y: number; label: string }> = [
    { x: 6, y: 60, label: "start" },
    { x: 66, y: 36, label: "missed" },
    { x: 100, y: 22, label: "today" },
  ];

  return (
    <div className="relative w-full">
      <div className="flex items-baseline justify-between text-caption text-muted-foreground font-mono tabular-nums mb-2">
        <span>3,000</span>
        <span>·</span>
        <span>0</span>
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-[200px] sm:h-[240px] w-full text-signal-positive"
        aria-label="90-day forecast score history"
      >
        {/* Subtle baseline grid */}
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="0.4"
          strokeDasharray="1 2"
          vectorEffect="non-scaling-stroke"
        />
        {/* Fill */}
        <path d={fillD} fill="currentColor" opacity={0.1} />
        {/* Line */}
        <path
          d={lineD}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Markers */}
        {markers.map((m) => (
          <circle
            key={m.label}
            cx={m.x}
            cy={m.y}
            r="0.9"
            fill="currentColor"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-2 flex items-baseline justify-between text-caption text-muted-foreground font-mono tabular-nums">
        <span>90d ago</span>
        <span>now</span>
      </div>
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
   3. The artifact — the share card
============================================================== */
function ProofShowcase() {
  return (
    <section className="border-t border-border/60 bg-muted/40">
      <Container className="py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-y-0 lg:gap-x-16 items-center">
          <div className="lg:col-span-5 lg:order-1">
            <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
              Every call{" "}
              <span className="text-muted-foreground">leaves a mark.</span>
            </h2>
            <p className="mt-7 text-body-lg text-muted-foreground max-w-md">
              Every correct call generates a shareable card. Crypto-clean
              numbers, the timestamp it was locked, the consensus at the time,
              the resolved outcome. Permanent. Public. Unfakeable.
            </p>
            <ul className="mt-7 flex flex-col gap-3 text-body-sm">
              <ProofPoint label="Locked at submission, never edited." />
              <ProofPoint label="Hashed and timestamped." />
              <ProofPoint label="One PNG. Goes anywhere." />
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

function ProofPoint({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3">
      <Check className="size-4 text-foreground shrink-0" strokeWidth={2.5} />
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
                forecast.social · the call
              </p>
              <p className="mt-2 font-mono text-caption text-muted-foreground">
                march 14, 2026 · 09:42 utc
              </p>
            </div>
            <span className="font-stylized text-title text-foreground tracking-tight">
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
            <CallStat
              label="your call"
              value="78%"
              tone="foreground"
            />
            <CallStat
              label="consensus"
              value="51%"
              tone="muted"
            />
            <CallStat
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

function CallStat({
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
  const moments = [
    {
      number: "01",
      verb: "Predict.",
      body: "Drag a slider from 0 to 100%. Submit, and the call is locked forever. No edits. No takebacks.",
    },
    {
      number: "02",
      verb: "Score.",
      body: "Brier-scored, shrinkage-corrected, streak-multiplied. Your Forecast Score sits between 0 and 3,000.",
    },
    {
      number: "03",
      verb: "Share.",
      body: "Every correct call generates a shareable card with the timeline, the consensus, and your number.",
    },
  ] as const;

  return (
    <section id="how-it-works" className="border-t border-border/60">
      <Container className="py-24 sm:py-32">
        <div className="flex flex-col items-start max-w-3xl mb-14 sm:mb-20">
          <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
            Three moments.
          </h2>
          <p className="mt-5 text-body-lg text-muted-foreground max-w-xl">
            One scoreboard. Every call you lock in moves it.
          </p>
        </div>

        <div className="flex flex-col">
          {moments.map((m, i) => (
            <div
              key={m.number}
              className={`grid grid-cols-[1fr] sm:grid-cols-[140px_1fr] lg:grid-cols-[200px_1fr] gap-x-8 lg:gap-x-14 gap-y-2 sm:gap-y-0 items-baseline py-10 sm:py-14 ${
                i === 0 ? "" : "border-t border-border"
              }`}
            >
              <p className="font-display font-extrabold tabular-nums text-muted-foreground text-[64px] sm:text-[88px] lg:text-[120px] leading-[0.9] -tracking-[0.045em]">
                {m.number}
              </p>
              <div className="flex flex-col gap-4 sm:gap-5">
                <p className="font-display font-extrabold text-foreground text-[40px] sm:text-[48px] lg:text-[64px] leading-[0.98] -tracking-[0.035em]">
                  {m.verb}
                </p>
                <p className="text-body-lg text-muted-foreground max-w-xl leading-[1.55]">
                  {m.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ==============================================================
   5. Categories
============================================================== */
const CATEGORY_FALLBACKS: Record<CategorySlug, string> = {
  "tech-ai": "Will Anthropic release Claude 5 before October 1, 2026?",
  crypto: "Will Bitcoin set a new all-time high before January 1, 2027?",
  sports: "Will Argentina win the 2026 FIFA World Cup?",
  "pop-culture":
    "Will Avengers: Doomsday gross $1B+ worldwide before EOY 2026?",
};

const TECH_AI_OTHERS_FALLBACK = [
  "Will OpenAI ship GPT-6 before January 1, 2027?",
  "Will Apple ship the foldable iPhone before EOY 2026?",
  "Will the EU issue its first AI Act GPAI fine by Feb 1, 2027?",
];

function categoryLine(
  slug: CategorySlug,
  live: CategoryHighlight | null,
): string {
  return live?.title ?? CATEGORY_FALLBACKS[slug];
}

function Categories({
  highlights,
}: {
  highlights: Record<CategorySlug, CategoryHighlight | null>;
}) {
  const techAi = highlights["tech-ai"];
  const techAiOthers =
    techAi && techAi.others.length > 0 ? techAi.others : TECH_AI_OTHERS_FALLBACK;
  return (
    <section className="border-t border-border/60 bg-muted/40">
      <Container className="py-24 sm:py-32">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
              Markets for{" "}
              <span className="text-muted-foreground">everything you read.</span>
            </h2>
          </div>
          <p className="text-body-lg text-muted-foreground max-w-sm">
            Dozens of resolvable questions live right now. Your category score
            updates with each call.
          </p>
        </div>

        <BentoGrid>
          <BentoGridItem
            className="md:col-span-2 md:row-span-3 bg-surface"
            icon={<Atom className="size-6" strokeWidth={1.5} />}
            title="Tech & AI"
            header={
              <div className="flex flex-col gap-4">
                <p className="text-overline text-muted-foreground">
                  also live
                </p>
                <ul className="flex flex-col">
                  {techAiOthers.map((title, i) => (
                    <li
                      key={`${i}-${title}`}
                      className="flex items-baseline gap-3 py-2.5 border-b border-border last:border-b-0"
                    >
                      <span className="font-mono text-caption text-muted-foreground tabular-nums shrink-0">
                        {String(i + 2).padStart(2, "0")}
                      </span>
                      <span className="text-body-sm text-foreground leading-[1.5] line-clamp-2">
                        {title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            }
            description={
              <span className="text-body text-muted-foreground">
                <span className="font-mono text-caption text-foreground tabular-nums mr-2">
                  01
                </span>
                {categoryLine("tech-ai", techAi)}
              </span>
            }
            footer={<CategoryFooter slug="tech-ai" live={techAi} />}
          />
          <BentoGridItem
            icon={<Bitcoin className="size-5" strokeWidth={1.5} />}
            title="Crypto"
            description={
              <span className="text-muted-foreground">
                {categoryLine("crypto", highlights.crypto)}
              </span>
            }
            footer={<CategoryFooter slug="crypto" live={highlights.crypto} />}
          />
          <BentoGridItem
            icon={<Trophy className="size-5" strokeWidth={1.5} />}
            title="Sports"
            description={
              <span className="text-muted-foreground">
                {categoryLine("sports", highlights.sports)}
              </span>
            }
            footer={<CategoryFooter slug="sports" live={highlights.sports} />}
          />
          <BentoGridItem
            icon={<Tv className="size-5" strokeWidth={1.5} />}
            title="Pop culture"
            description={
              <span className="text-muted-foreground">
                {categoryLine("pop-culture", highlights["pop-culture"])}
              </span>
            }
            footer={
              <CategoryFooter
                slug="pop-culture"
                live={highlights["pop-culture"]}
              />
            }
          />
        </BentoGrid>

        {/* Meta strip — what to do beyond browsing the four categories.
            Was previously two bento cells competing for space with the
            category cells; pulled out as a thin text-only band so the
            Bento can stay focused on the four real categories. */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border pt-6">
          <p className="font-mono text-caption text-muted-foreground">
            {`${(highlights["tech-ai"]?.prediction_count ?? 0) +
              (highlights.crypto?.prediction_count ?? 0) +
              (highlights.sports?.prediction_count ?? 0) +
              (highlights["pop-culture"]?.prediction_count ?? 0)} live calls across 4 categories`}
          </p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm">
            <Link
              href="/markets?sort=most-predicted"
              className="text-foreground font-medium hover:underline underline-offset-4"
            >
              See what's hot →
            </Link>
            <Link
              href="/markets/propose"
              className="text-foreground font-medium hover:underline underline-offset-4"
            >
              Propose a market →
            </Link>
            <Link
              href="/markets"
              className="text-foreground font-medium hover:underline underline-offset-4"
            >
              Browse all →
            </Link>
          </nav>
        </div>
      </Container>
    </section>
  );
}

function CategoryFooter({
  slug,
  live,
}: {
  slug: CategoryHighlight["slug"];
  live: CategoryHighlight | null;
}) {
  const count = live?.prediction_count ?? 0;
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
      <span className="font-mono text-caption text-muted-foreground">
        {count > 0 ? `${count} call${count === 1 ? "" : "s"}` : "open"}
      </span>
      <Link
        href={`/markets?category=${slug}`}
        className="font-mono text-caption text-foreground hover:underline underline-offset-4"
      >
        browse →
      </Link>
    </div>
  );
}

/* ==============================================================
   6. Leaderboard preview
============================================================== */
const LEADERBOARD_FALLBACK: LeaderRow[] = [
  { username: "itoldyouso", forecast_score: 2471, current_streak: 47 },
  { username: "quanttrader", forecast_score: 2402, current_streak: 22 },
  { username: "oddsbot", forecast_score: 2358, current_streak: 5 },
  { username: "bayesfan", forecast_score: 2294, current_streak: 14 },
  { username: "basecase", forecast_score: 2240, current_streak: 9 },
];

function Leaderboard({ leaders }: { leaders: LeaderRow[] }) {
  const isLive = leaders.length > 0;
  const rows = isLive ? leaders : LEADERBOARD_FALLBACK;

  return (
    <section className="border-t border-border/60">
      <Container className="py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 lg:gap-x-16 items-start">
          <div className="lg:col-span-5">
            <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
              The proven.{" "}
              <span className="text-muted-foreground">Updated nightly.</span>
            </h2>
            <p className="mt-7 text-body-lg text-muted-foreground max-w-md">
              Rank lifts the highest-accuracy forecasters into the spotlight.
              You can climb. You can also fall.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-1.5 text-body-sm text-foreground font-medium hover:underline underline-offset-4"
              >
                See the full leaderboard
                <ArrowRight className="size-3.5" />
              </Link>
              <span className="font-mono text-caption text-muted-foreground">
                {isLive ? "live top 5" : "preview · seed data"}
              </span>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border bg-surface overflow-hidden">
              {rows.map((u, i) => (
                <LeaderboardRow
                  key={u.username}
                  rank={i + 1}
                  handle={u.username}
                  score={u.forecast_score}
                  streak={u.current_streak}
                  highlight={i === 0}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function LeaderboardRow({
  rank,
  handle,
  score,
  streak,
  highlight = false,
}: {
  rank: number;
  handle: string;
  score: number;
  streak: number;
  highlight?: boolean;
}) {
  const streakTone =
    streak >= 5 ? "text-signal-positive" : "text-muted-foreground";
  return (
    <div
      className={`grid grid-cols-[40px_1fr_auto] sm:grid-cols-[48px_1fr_72px_80px] items-center gap-3 sm:gap-5 px-5 py-4 border-b border-border last:border-b-0 ${
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
      <span
        className={`hidden sm:inline font-mono text-body-sm tabular-nums font-medium ${streakTone}`}
      >
        {streak > 0 ? `${streak}d streak` : "—"}
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
          <h2 className="font-display text-display-md sm:text-display-lg text-foreground leading-[0.98] tracking-[-0.035em]">
            Not betting.{" "}
            <span className="text-muted-foreground">By design.</span>
          </h2>
          <p className="mt-5 text-body-lg text-muted-foreground max-w-xl">
            No deposits. No opposing house. No money flowing between users.
          </p>
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
  const isNegative = tone === "negative";
  const Icon = isNegative ? X : Check;
  const iconColor = isNegative ? "text-muted-foreground" : "text-signal-positive";
  // Asymmetric treatment makes the polarity visible at-a-glance: the
  // "betting" panel dims to muted+dashed, forecast.social sits clean
  // on the surface token. Communicates "this is what we left behind"
  // faster than two equal Card chrome with X/Check icons.
  return (
    <Card
      className={
        isNegative
          ? "bg-muted/40 border-dashed border-border rounded-2xl gap-0 py-0 opacity-80"
          : "bg-surface border-border rounded-2xl gap-0 py-0"
      }
    >
      <CardContent className="px-7 py-8 flex flex-col gap-5">
        <p
          className={
            isNegative
              ? "font-display text-title text-muted-foreground -tracking-[0.015em]"
              : "font-display text-title text-foreground -tracking-[0.015em]"
          }
        >
          {label}
        </p>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Icon
                className={`size-4 mt-1 shrink-0 ${iconColor}`}
                strokeWidth={2.5}
              />
              <span
                className={
                  isNegative
                    ? "text-body text-muted-foreground line-through decoration-muted-foreground/40"
                    : "text-body text-foreground"
                }
              >
                {item}
              </span>
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
            a="No. Predictions lock at submission and stay public forever. That's the entire point. The locked-in call is what makes the score real."
          />
          <FaqItem
            q="Who can see my predictions?"
            a="Everyone. Calls and resolution outcomes are public by default. You can't have a track record that nobody else can audit."
          />
          <FaqItem
            q="Is it free?"
            a="Yes. Free to predict, free to follow other forecasters, free to share your wins. No card on file."
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
          <h2 className="font-display font-extrabold text-foreground text-[44px] sm:text-[64px] lg:text-[80px] leading-[0.98] tracking-[-0.04em]">
            The internet,
            <br />
            <span className="text-muted-foreground">
              finally keeping score.
            </span>
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
