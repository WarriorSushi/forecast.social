import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Design debug" };

/* ============================================================
   Token inventories
============================================================ */
const SURFACE_TOKENS = [
  { name: "background", className: "bg-background", border: false },
  { name: "foreground", className: "bg-foreground", border: false },
  { name: "surface", className: "bg-surface", border: true },
  { name: "surface-elevated", className: "bg-surface-elevated", border: true },
  { name: "muted", className: "bg-muted", border: true },
  { name: "border", className: "bg-border", border: false },
  { name: "border-strong", className: "bg-border-strong", border: false },
] as const;

const BRAND_TOKENS = [
  { name: "primary", className: "bg-primary", border: false },
  { name: "primary-foreground", className: "bg-primary-foreground", border: true },
  { name: "accent", className: "bg-accent", border: false },
  { name: "accent-foreground", className: "bg-accent-foreground", border: true },
] as const;

const SIGNAL_TOKENS = [
  { name: "signal-positive", className: "bg-signal-positive", border: false },
  { name: "signal-positive-soft", className: "bg-signal-positive-soft", border: true },
  { name: "signal-negative", className: "bg-signal-negative", border: false },
  { name: "signal-negative-soft", className: "bg-signal-negative-soft", border: true },
  { name: "signal-neutral", className: "bg-signal-neutral", border: false },
] as const;

const TYPE_SCALE = [
  { name: "display-xl",  className: "text-display-xl font-display",  sample: "2,471" },
  { name: "display-lg",  className: "text-display-lg font-display",  sample: "Be right." },
  { name: "display-md",  className: "text-display-md font-display",  sample: "Get famous." },
  { name: "display-sm",  className: "text-display-sm font-display",  sample: "Receipts for everything." },
  { name: "headline",    className: "text-headline font-display",    sample: "Will GPT-5 launch by July?" },
  { name: "title",       className: "text-title font-sans",          sample: "Tech & AI" },
  { name: "body-lg",     className: "text-body-lg font-sans",        sample: "The track-record social network." },
  { name: "body",        className: "text-body font-sans",           sample: "Predict anything." },
  { name: "body-sm",     className: "text-body-sm font-sans",        sample: "Locked in at 73%." },
  { name: "caption",     className: "text-caption font-sans",        sample: "3 days left to resolve." },
  { name: "overline",    className: "text-overline font-sans",       sample: "top 0.2% · tech & ai" },
] as const;

/* ============================================================
   Page
============================================================ */
export default function DesignDebugPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur-[10px] bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-[1120px] flex items-center justify-between px-5 sm:px-8 h-14">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-stylized text-title font-semibold leading-none tracking-tight hover:opacity-90 transition-opacity"
            >
              forecast<span className="text-accent">.</span>social
            </Link>
            <span className="text-overline text-muted-foreground">/ debug / design</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-5 sm:px-8 py-16 space-y-24">
        <Intro />
        <ColorsSection />
        <TypographySection />
        <ButtonsSection />
        <CardsSection />
        <FormSection />
        <BadgesSection />
        <AvatarsSection />
        <SkeletonSection />
      </div>
    </div>
  );
}

/* ============================================================
   Sections
============================================================ */
function Intro() {
  return (
    <section className="max-w-2xl">
      <p className="text-overline text-muted-foreground mb-6">design debug · v0</p>
      <h1 className="font-display text-display-md text-foreground">
        Every token. Every primitive. One page.
      </h1>
      <p className="mt-6 text-body-lg text-muted-foreground">
        The visual contract for the rest of the build. Toggle the theme in the
        top right — both modes must be beautiful.
      </p>
    </section>
  );
}

function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8 border-b border-border pb-4">
      <h2 className="font-display text-headline text-foreground">{title}</h2>
      <span className="font-mono text-overline text-muted-foreground">{index}</span>
    </div>
  );
}

function ColorsSection() {
  return (
    <section>
      <SectionHeading index="01" title="Colors" />
      <div className="space-y-10">
        <SwatchGroup label="Surfaces & borders" tokens={SURFACE_TOKENS} />
        <SwatchGroup label="Brand" tokens={BRAND_TOKENS} />
        <SwatchGroup label="Signals" tokens={SIGNAL_TOKENS} />
      </div>
    </section>
  );
}

function SwatchGroup({
  label,
  tokens,
}: {
  label: string;
  tokens: ReadonlyArray<{ name: string; className: string; border: boolean }>;
}) {
  return (
    <div>
      <p className="text-overline text-muted-foreground mb-4">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tokens.map(({ name, className, border }) => (
          <div key={name} className="flex flex-col gap-2">
            <div
              className={`h-16 rounded-md ${className} ${border ? "border border-border" : ""}`}
            />
            <p className="font-mono text-caption text-foreground">{name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypographySection() {
  return (
    <section>
      <SectionHeading index="02" title="Typography" />
      <div className="space-y-8">
        {TYPE_SCALE.map(({ name, className, sample }) => (
          <div key={name} className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 md:gap-6 items-baseline">
            <p className="font-mono text-caption text-muted-foreground pt-1">{name}</p>
            <p className={className}>{sample}</p>
          </div>
        ))}
        <Separator />
        <div className="flex flex-col gap-3">
          <p className="text-overline text-muted-foreground">
            tabular numerics · Geist Mono
          </p>
          <p className="font-mono text-display-sm tabular-nums text-foreground font-medium tracking-tight">
            2,471 · 73% · 47-day streak
          </p>
          <p className="text-caption text-muted-foreground">
            Product UI is sans-only. Share cards (Phase 6) use Geist 800 at
            display sizes + Geist Mono for the score number.
          </p>
        </div>
      </div>
    </section>
  );
}

function ButtonsSection() {
  return (
    <section>
      <SectionHeading index="03" title="Buttons" />
      <div className="space-y-10">
        <Row label="Variants">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </Row>
        <Row label="Sizes">
          <Button size="xs">XS</Button>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
        </Row>
        <Row label="States">
          <Button>Idle</Button>
          <Button disabled>Disabled</Button>
          <Button className="pointer-events-none ring-2 ring-ring ring-offset-2 ring-offset-background">
            Focus ring
          </Button>
        </Row>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3 md:gap-6 items-start">
      <p className="font-mono text-caption text-muted-foreground pt-2">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function CardsSection() {
  return (
    <section>
      <SectionHeading index="04" title="Cards" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card className="bg-surface">
          <CardHeader>
            <p className="text-overline text-muted-foreground">card · default</p>
            <CardTitle>Will GPT-5 launch before July?</CardTitle>
            <CardDescription>Tech & AI · 17 days left</CardDescription>
          </CardHeader>
          <CardContent className="font-mono text-body-sm text-muted-foreground tabular-nums">
            consensus 62% · 412 calls
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">Predict</Button>
          </CardFooter>
        </Card>

        <Card className="bg-surface">
          <CardHeader>
            <p className="text-overline text-signal-positive">card · won</p>
            <CardTitle>Bitcoin above $120K by EOY 2025</CardTitle>
            <CardDescription>Crypto · resolved Dec 31</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-display-sm tabular-nums text-foreground">
              78%
            </p>
            <p className="text-overline text-muted-foreground">your call</p>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent hover:underline underline-offset-4">
              Share receipt →
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-surface">
          <CardHeader>
            <p className="text-overline text-signal-negative">card · missed</p>
            <CardTitle>Lakers win NBA Finals 2026</CardTitle>
            <CardDescription>Sports · resolved Jun 22</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-display-sm tabular-nums text-foreground">
              31%
            </p>
            <p className="text-overline text-muted-foreground">your call</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function FormSection() {
  return (
    <section>
      <SectionHeading index="05" title="Inputs" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
        <div className="flex flex-col gap-2">
          <Label htmlFor="d-username">Username</Label>
          <Input id="d-username" placeholder="warriorsushi" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="d-email">Email</Label>
          <Input id="d-email" type="email" placeholder="you@forecast.social" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="d-disabled">Disabled</Label>
          <Input id="d-disabled" disabled placeholder="Not editable" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="d-invalid">With error</Label>
          <Input id="d-invalid" aria-invalid placeholder="Already taken" defaultValue="@admin" />
        </div>
      </div>
    </section>
  );
}

function BadgesSection() {
  return (
    <section>
      <SectionHeading index="06" title="Badges & pills" />
      <div className="flex flex-wrap items-center gap-3">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-caption font-mono bg-signal-positive-soft text-signal-positive">
          correct
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-caption font-mono bg-signal-negative-soft text-signal-negative">
          missed
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-caption font-mono bg-muted text-muted-foreground">
          pending
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-overline bg-muted text-foreground">
          TECH & AI
        </span>
      </div>
    </section>
  );
}

function AvatarsSection() {
  return (
    <section>
      <SectionHeading index="07" title="Avatars" />
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex flex-col items-center gap-2">
          <Avatar className="rounded-md size-12 border border-border-strong">
            <AvatarFallback className="rounded-md bg-muted text-foreground font-mono text-body-sm">
              IT
            </AvatarFallback>
          </Avatar>
          <span className="font-mono text-caption text-muted-foreground">48px</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Avatar className="rounded-md size-10 border border-border-strong">
            <AvatarFallback className="rounded-md bg-muted text-foreground font-mono text-caption">
              IT
            </AvatarFallback>
          </Avatar>
          <span className="font-mono text-caption text-muted-foreground">40px</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Avatar className="rounded-md size-8 border border-border-strong">
            <AvatarFallback className="rounded-md bg-muted text-foreground font-mono text-[10px]">
              IT
            </AvatarFallback>
          </Avatar>
          <span className="font-mono text-caption text-muted-foreground">32px</span>
        </div>
      </div>
    </section>
  );
}

function SkeletonSection() {
  return (
    <section>
      <SectionHeading index="08" title="Loading skeletons" />
      <Card className="bg-surface max-w-xl">
        <CardHeader>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-3/4" />
        </CardContent>
      </Card>
    </section>
  );
}
