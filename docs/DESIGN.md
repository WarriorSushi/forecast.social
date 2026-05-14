# DESIGN.md — Design system

The product looks like nothing else in its category. That is the brief.

## 1. Philosophy

**Editorial confidence meets data terminal.**

Think: The Athletic's typography married to Bloomberg's information density, photographed by Pentagram, paced by Linear, animated like Cron. Cream paper, ink, phosphor accents. Numbers treated like headlines. Whitespace earned through restraint, not avoided through fear.

Two design failures to avoid:

1. **AI-default sterility.** Indigo gradients, Inter everywhere, slate-900 backgrounds, glassmorphism nothing. We are explicitly *not* doing this.
2. **Crypto-bro maximalism.** Glow effects, neon-on-black, "futuristic" fonts, animated everything. Also not us.

We are warm, considered, slightly editorial in light mode; deep, premium, slightly clandestine in dark mode. Same product, two moods.

## 2. Typography

Three faces, each with a clear job. Loaded via `next/font/google`.

| Role            | Family               | Weights         | When                                                               |
|-----------------|----------------------|-----------------|--------------------------------------------------------------------|
| **Display**     | **Instrument Serif** | 400 + 400 italic | Hero numbers, page headlines, market titles, oversized scores.    |
| **Body**        | **Geist**            | 400 / 500 / 600 / 700 | All UI text, buttons, labels, body copy.                    |
| **Numeric / Mono** | **Geist Mono**    | 400 / 500 / 600 | Probabilities, scores, timestamps, tickers, code, percentages.    |

### Type scale (tailwind tokens)

```
text-display-xl  → 96px / 0.95 / -0.04em / Instrument Serif
text-display-lg  → 72px / 0.95 / -0.03em / Instrument Serif
text-display-md  → 56px / 0.98 / -0.025em / Instrument Serif
text-display-sm  → 40px / 1.0  / -0.02em / Instrument Serif
text-headline    → 32px / 1.05 / -0.015em / Instrument Serif
text-title       → 24px / 1.15 / -0.01em / Geist 600
text-body-lg     → 18px / 1.5 / 0 / Geist 400
text-body        → 16px / 1.55 / 0 / Geist 400
text-body-sm     → 14px / 1.5 / 0 / Geist 400
text-caption     → 13px / 1.4 / 0.01em / Geist 500
text-overline    → 11px / 1.2 / 0.12em uppercase / Geist 600
```

Monospace inherits the same scale but in **Geist Mono**, used for any digit-forward UI: scores, probabilities, deltas, timestamps.

### Rules

- **Display serif only at 24px and up.** It looks silly small.
- **Italic Instrument Serif is allowed for one or two-word flourishes** (a category label, a "Right!" stamp on a winning card). Use sparingly.
- **No font-smoothing tricks.** Default rendering.
- **Tabular numerics on:** `font-variant-numeric: tabular-nums` everywhere a digit appears. Critical for tickers.
- **Optical letter-spacing:** display sizes get tighter tracking (negative), small caps and overlines get wider tracking (positive).

## 3. Color

OKLCH throughout. Two themes. Light is the default — flip the contract: many products default to dark and force light. We do the opposite to feel newspaper-warm out of the box.

### Tokens (paste into `globals.css`)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  /* Light — "Newsroom" */
  --background:           oklch(97.5% 0.012 85);   /* warm cream paper */
  --foreground:           oklch(15% 0.015 60);     /* deep ink */
  --surface:              oklch(99% 0.008 85);     /* slightly brighter card */
  --surface-elevated:     oklch(100% 0 0);         /* pure white for floating */
  --border:               oklch(88% 0.012 75);     /* soft warm rule */
  --border-strong:        oklch(78% 0.015 70);
  --muted:                oklch(93% 0.012 80);
  --muted-foreground:     oklch(45% 0.015 60);

  --primary:              oklch(20% 0.02 60);      /* ink — primary is text-tier */
  --primary-foreground:   oklch(97% 0.012 85);

  --accent:               oklch(64% 0.18 55);      /* solar — warm orange-gold accent */
  --accent-foreground:    oklch(15% 0.015 60);

  --signal-positive:      oklch(58% 0.18 145);     /* phosphor green — "called it" */
  --signal-positive-soft: oklch(92% 0.06 145);
  --signal-negative:      oklch(55% 0.20 25);      /* clay red — "missed" */
  --signal-negative-soft: oklch(93% 0.06 25);
  --signal-neutral:       oklch(60% 0.04 250);

  --ring:                 oklch(20% 0.02 60);
  --radius:               0.625rem;
}

.dark {
  /* Dark — "Late Edition" */
  --background:           oklch(13% 0.012 60);     /* deep ink, warmth retained */
  --foreground:           oklch(94% 0.012 85);     /* warm off-white */
  --surface:              oklch(16% 0.012 60);     /* card */
  --surface-elevated:     oklch(19% 0.012 60);
  --border:               oklch(24% 0.012 60);
  --border-strong:        oklch(32% 0.012 60);
  --muted:                oklch(20% 0.012 60);
  --muted-foreground:     oklch(65% 0.012 60);

  --primary:              oklch(94% 0.012 85);
  --primary-foreground:   oklch(13% 0.012 60);

  --accent:               oklch(74% 0.16 70);      /* warmer in dark */
  --accent-foreground:    oklch(13% 0.012 60);

  --signal-positive:      oklch(72% 0.20 145);     /* brighter phosphor on dark */
  --signal-positive-soft: oklch(28% 0.10 145);
  --signal-negative:      oklch(68% 0.22 25);
  --signal-negative-soft: oklch(28% 0.10 25);
  --signal-neutral:       oklch(70% 0.04 250);

  --ring:                 oklch(94% 0.012 85);
  --radius:               0.625rem;
}

@theme inline {
  --color-background:           var(--background);
  --color-foreground:           var(--foreground);
  --color-surface:              var(--surface);
  --color-surface-elevated:     var(--surface-elevated);
  --color-border:               var(--border);
  --color-border-strong:        var(--border-strong);
  --color-muted:                var(--muted);
  --color-muted-foreground:     var(--muted-foreground);
  --color-primary:              var(--primary);
  --color-primary-foreground:   var(--primary-foreground);
  --color-accent:               var(--accent);
  --color-accent-foreground:    var(--accent-foreground);
  --color-signal-positive:      var(--signal-positive);
  --color-signal-positive-soft: var(--signal-positive-soft);
  --color-signal-negative:      var(--signal-negative);
  --color-signal-negative-soft: var(--signal-negative-soft);
  --color-signal-neutral:       var(--signal-neutral);
  --color-ring:                 var(--ring);

  --font-display: "Instrument Serif", ui-serif, Georgia, serif;
  --font-sans:    "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
}
```

### Color usage rules

- **`background` and `foreground` carry 90% of the UI.** Don't reach for accents.
- **`accent` (solar) is for moments of warmth and brand.** The dot on the `i` in the logo, the highlighted overline on the active nav item, the streak flame badge. Not for primary buttons.
- **Signal colors (positive/negative) are for outcomes only.** Never use them for "info" or "warning" or random UI states. A green pill means a right call. A red pill means a wrong call. Nothing else.
- **No semantic gray ramp beyond `muted` / `muted-foreground` / `border` / `border-strong`.** If you find yourself needing a sixth gray, you are over-designing.

## 4. Surface hierarchy

Three levels, distinguished by background + border, never by drop shadow alone:

1. **`background`** — the page itself.
2. **`surface`** — cards, panels, list rows. Always with `border` (1px).
3. **`surface-elevated`** — floating menus, dialogs, command palettes. Soft shadow allowed here.

Shadows in light mode are warm grays at very low opacity (`0 1px 2px oklch(15% 0 0 / 0.04)`), never the default Tailwind cool blues. Shadows in dark mode are pure black at higher opacity to read.

## 5. Spacing & layout

- **Grid:** 8px base. Tailwind defaults are fine. Inside dense UI (a prediction card), step down to 4px.
- **Mobile width:** designs target 390px. Internal padding 16px, sometimes 20px.
- **Desktop:** content max-width `1120px`. Three-column app shell on `lg:` and up — left nav (240px), main feed (640px), right rail (240px). Below `lg:`, single column with bottom tab bar.
- **Whitespace:** generous around display type. Tight around dense data.

## 6. Component direction

The product is shadcn primitives, restyled to our identity. Below are component-level deviations from defaults.

### Buttons

- **Primary** — `bg-primary text-primary-foreground`. No shadow. Subtle scale-on-press (98%) instead.
- **Secondary** — `bg-surface text-foreground border border-border`. Hover: `border-border-strong`.
- **Ghost** — text only, with `hover:bg-muted`.
- **Destructive** — uses `signal-negative`. Reserved for delete operations.
- Border radius: `--radius` (0.625rem). One radius scale across the product.
- Height tokens: `sm: 32px`, `md: 40px`, `lg: 48px`. Comfortable taps on mobile.

### Cards

- 1px border, no inner shadow.
- 20px internal padding on mobile, 24px on desktop.
- Subtle hover lift on interactive cards: `border-border-strong` + 1px vertical translate. Don't bump the shadow.

### Prediction card (the most-seen surface)

```
┌────────────────────────────────────────────────┐
│  CATEGORY • OVERLINE                  3d left  │
│                                                │
│  Will GPT-5 launch before          Display 24  │
│  July 1, 2026?                                 │
│                                                │
│  ▁▂▃▅▆▇▇▆ consensus over 14 days   sparkline   │
│                                                │
│  ─────────────────────────────────             │
│  CURRENT CONSENSUS              YOU             │
│  62%                            ── %            │
│  Geist Mono 32                  predict slider  │
└────────────────────────────────────────────────┘
```

- Category overline in `text-overline`, accent color.
- Title in Instrument Serif at 24–28px.
- Sparkline as inline SVG, signal-positive when trending up, signal-negative trending down.
- Predict CTA is a slider revealed inline, not a modal.

### Forecast Score (the brand asset)

On a profile, the score takes a full screen-width display moment. Render at `text-display-xl` (96px) in **Instrument Serif italic** if the user is in the top 10%, regular otherwise. Below the number: a single line of `text-overline` reading the rank ("TOP 1% • TECH & AI"). To the right: a 6-point category radar in 64px.

### Share card (the receipt)

A 1080×1080 PNG generated server-side via `@vercel/og` or `satori`. Includes:

- The user's handle + Forecast Score badge.
- The market title.
- Their prediction probability + the consensus at the time + the actual outcome.
- A sparkline of the market's resolution path.
- A small `forecast.social` wordmark, bottom-right.
- Background: cream paper texture (light) or carbon black (dark) — user picks at share time.

Treat the share card as a poster, not a screenshot. It is the marketing.

### Inputs & sliders

- 1px border, focus ring uses `ring` color at 2px offset.
- Prediction slider: continuous 0–100, snapping to 1% increments. Visible value bubble on drag. Color shifts from `signal-neutral` toward `signal-positive` as the value crosses 50.

### Pills / badges

- Outcome pills: pill = `bg-signal-positive-soft text-signal-positive` for correct, mirror for incorrect, `bg-muted text-muted-foreground` for pending.
- Category pills: `bg-muted text-foreground`, `text-overline`.

### Navigation

- Mobile: bottom tab bar with 4 icons (Feed, Markets, Predict, Profile). Active state is a 2px underline in `accent`, not a filled background.
- Desktop: persistent left rail. Same items, vertical, with the active item also marked by an accent vertical bar on the left edge.

### Tables / leaderboard

- Rule-driven, not card-driven. Newspaper rows separated by `border` 1px.
- Rank column in `Geist Mono`, the leader's rank in display serif at the top of the list.

## 7. Motion

Restrained. Motion should clarify, not decorate.

- **Number count-up** on Forecast Score on first load: 800ms ease-out, monospace tabular nums so digits don't shift.
- **Prediction submission**: the slider value flies up into a pill that lands in the prediction-list. Use Motion library + spring physics.
- **Page transitions on a market page**: use React 19.2 View Transitions where supported (price chart morphs in).
- **Reveal stagger** on page load: section by section, 60ms apart, ease-out. Only on first paint.
- **Hover lift on cards**: 120ms.
- **No autoplay**, no parallax, no scroll-triggered scaling, no "look at me" animations.
- **Respect `prefers-reduced-motion`.** Cut everything except essential feedback (e.g., button press).

## 8. Theme switching

- `next-themes` with `attribute="class"`, `defaultTheme="system"`.
- No flash of unstyled content: render the theme provider client-side after the script tag, as `next-themes` documents.
- Toggle in the user dropdown menu, with three options: System / Light / Dark. Each option previewed with a tiny swatch.

## 9. Iconography

- **Lucide React** only.
- 16px in inline UI, 20px in tab bars and primary actions, 24px+ in feature areas.
- Stroke width 1.5 by default; 1.75 for tab bar icons (more legible at small size).
- Never mix in emoji as icons inside the product UI (emoji are fine in user-generated content, like comments).

## 10. Imagery & illustration

- **No stock photography.** No "happy diverse team" hero images. No AI-generated illustrations of crystal balls.
- **Permitted imagery:** generated chart screenshots (for og:image of a resolved market), user avatars, and the share card itself.
- Avatars: 1:1 with a 1px border in `border-strong`. Slightly rounded (`rounded-md`), not full circle. Editorial feel.

## 11. Empty states & loading

Empty states are an opportunity. Each empty state has:

- A short Instrument Serif line ("Nothing to call yet.")
- One body line of context ("Predictions you make will appear here.")
- One CTA, ghost button.

Loading: skeleton bars in `muted`, not spinners. Never a full-page spinner.

## 12. The "premium" checklist

Before shipping any screen, verify:

- [ ] Typography is mixed (serif display + sans body + mono numbers).
- [ ] No purple gradients, no glassmorphism, no neon glow.
- [ ] Numbers are in Geist Mono with tabular-nums.
- [ ] Light mode is genuinely beautiful, not just "white background."
- [ ] Dark mode is warm-deep, not flat slate.
- [ ] Borders are visible but soft.
- [ ] One accent color appears, used sparingly.
- [ ] Hover and focus states are designed, not default.
- [ ] Spacing is generous around display type.
- [ ] The screen could appear in a Linear/Vercel/Arc Browser case study.

If two or more checkboxes fail, redesign.
