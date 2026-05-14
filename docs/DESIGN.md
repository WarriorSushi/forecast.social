# DESIGN.md — Design system

The product looks like nothing else in its category. That is the brief.

## 1. Philosophy

**Bold premium. Restrained, modern, confident.**

Think: Stripe's marketing pages, Linear's product UI, Cash App's typographic confidence, Apple's negative space. Big sans display, oversized numbers, generous whitespace, surfaces distinguished by spacing more than chrome. No editorial flourishes — no italics-as-mood, no kicker overlines that feel like newspaper kickers, no cream paper.

Three design failures to avoid:

1. **AI-default sterility.** Indigo gradients on slate-900, Inter everywhere, glassmorphism nothing. Not us.
2. **Crypto-bro maximalism.** Glow effects, neon-on-black, "futuristic" fonts, animated everything. Not us.
3. **Editorial / newspaper.** Cream paper, italic display serif **everywhere**, narrow column rules, "kicker" copy patterns. We tried that and the user rejected it. Italic Instrument Serif has been re-introduced in exactly two surgical placements (wordmark + hero sub-heading) on top of a Bold premium sans system; that single moment of beauty is the brand voice. Italic serif as a layout-wide treatment is what we left behind. The design pivot is recorded in `phase-1.5/design-pivot`.

We are cool, decisive, sans-only in product UI; lifted-neutral dark and near-white light. Same product, two moods, both unmistakably modern.

## 2. Typography

Three product faces. Geist is the workhorse; Bricolage Grotesque carries brand voice in two reserved moments.

| Role               | Family                          | Weights              | When                                                                                  |
|--------------------|---------------------------------|----------------------|---------------------------------------------------------------------------------------|
| **Display**        | **Geist** (700 / 800)           | 700 / 800            | Every hero headline, every section title, every oversized number.                     |
| **Body**           | **Geist** (400 / 500 / 600)     | 400 / 500 / 600      | All body copy, buttons, labels.                                                       |
| **Numeric / Mono** | **Geist Mono**                  | 500 / 600            | Probabilities, scores, timestamps, tickers, code, percentages.                        |
| **Stylized**       | **Instrument Serif** (italic)   | 400 italic           | Two places only: (1) the `forecast.social` wordmark; (2) the hero sub-heading. Plus the category-example italic snippet, used at body-sm.  |

Loaded via the `geist` package + `next/font/google` for Instrument Serif. Italic is the chosen style — that's what gives the brand a single elegant moment inside an otherwise sans-only system. The Phase 1 rejection was about Instrument Serif used **everywhere** in italic with cream paper backdrops (newspaper feel); used in two surgical placements over a Bold premium sans system, it reads as personality, not as editorial.

**Stylized's job** is to be the brand's punctuation of beauty. Two appearances per screen, max. Anywhere else and we drift back into editorial. Share cards (Phase 6) also use Geist (800 at display sizes for the headline, Geist Mono for the number) plus a single italic Instrument Serif wordmark; the rest of the card is sans.

### Type scale (tailwind tokens)

```
text-display-xl  → 112px / 0.92 / -0.045em / Geist 800
text-display-lg  → 80px  / 0.94 / -0.035em / Geist 800
text-display-md  → 56px  / 0.96 / -0.03em  / Geist 700
text-display-sm  → 40px  / 1.0  / -0.025em / Geist 700
text-headline    → 28px  / 1.1  / -0.02em  / Geist 700
text-title       → 20px  / 1.2  / -0.015em / Geist 600
text-body-lg     → 18px  / 1.55 / -0.005em / Geist 400
text-body        → 16px  / 1.6  / -0.003em / Geist 400
text-body-sm     → 14px  / 1.55 / 0        / Geist 400
text-caption     → 13px  / 1.45 / 0        / Geist 500
text-overline    → 11px  / 1.2  / 0.08em uppercase / Geist 600
```

Monospace inherits the same scale but in **Geist Mono** (500 weight for stat displays, 400 for inline ticker text). Used for any digit-forward UI: scores, probabilities, deltas, timestamps.

### Rules

- **Sans display at every size.** Geist 700/800 carries headlines. No italic, no serif.
- **No font-smoothing tricks.** Default rendering.
- **Tabular numerics on:** `font-variant-numeric: tabular-nums` everywhere a digit appears. Critical for tickers and scores.
- **Letter-spacing scales with size.** Bigger display = tighter tracking. Overlines get +0.08em positive tracking; nothing else needs positive tracking.
- **Display weight peaks at 800.** Don't go heavier (Geist Black would feel heavy / display-typeface adjacent). 800 keeps the Stripe/Linear feel.

## 3. Color

OKLCH throughout. Two themes. Cool neutral palette — no warm cream, no warm ink. Light defaults so first impressions feel airy; dark is genuinely lifted, not pure ink.

### Tokens (paste into `globals.css`)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  /* Light — cool neutral */
  --background:           oklch(98.5% 0.003 250);  /* near-white, faintest cool tint */
  --foreground:           oklch(14% 0.012 260);    /* near-black, neutral cool */
  --surface:              oklch(100% 0 0);         /* pure white card */
  --surface-elevated:     oklch(100% 0 0);
  --border:               oklch(92% 0.004 250);    /* hairline cool */
  --border-strong:        oklch(85% 0.005 250);
  --muted:                oklch(95.5% 0.004 250);
  --muted-foreground:     oklch(48% 0.012 260);

  --primary:              oklch(18% 0.015 260);    /* near-black */
  --primary-foreground:   oklch(99% 0.002 250);

  --accent:               oklch(58% 0.22 258);     /* vivid indigo-blue — used SPARINGLY */
  --accent-foreground:    oklch(99% 0.005 258);

  --signal-positive:      oklch(60% 0.18 150);     /* called it */
  --signal-positive-soft: oklch(94% 0.04 150);
  --signal-negative:      oklch(58% 0.21 25);      /* missed */
  --signal-negative-soft: oklch(95% 0.04 25);
  --signal-neutral:       oklch(60% 0.04 250);

  --ring:                 oklch(18% 0.015 260);
  --radius:               0.75rem;                  /* slightly rounder than before */
}

.dark {
  /* Dark — lifted neutral */
  --background:           oklch(18% 0.005 260);    /* lifted base, cool neutral */
  --foreground:           oklch(97% 0.003 250);    /* near-white, slightly cool */
  --surface:              oklch(21% 0.005 260);    /* card sits clearly above base */
  --surface-elevated:     oklch(25% 0.006 260);    /* floating menus */
  --border:               oklch(29% 0.006 260);    /* visible but soft */
  --border-strong:        oklch(38% 0.007 260);
  --muted:                oklch(24% 0.005 260);
  --muted-foreground:     oklch(70% 0.008 260);

  --primary:              oklch(97% 0.003 250);
  --primary-foreground:   oklch(18% 0.005 260);

  --accent:               oklch(70% 0.20 258);     /* lifted indigo-blue for dark */
  --accent-foreground:    oklch(18% 0.005 260);

  --signal-positive:      oklch(72% 0.19 150);
  --signal-positive-soft: oklch(30% 0.08 150);
  --signal-negative:      oklch(70% 0.22 25);
  --signal-negative-soft: oklch(30% 0.08 25);
  --signal-neutral:       oklch(72% 0.04 250);

  --ring:                 oklch(97% 0.003 250);
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

  /* Three faces. font-stylized is Bricolage Grotesque, reserved for
     the wordmark and the hero sub-heading. */
  --font-display:  "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-sans:     "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono:     "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --font-stylized: "Instrument Serif", ui-serif, Georgia, serif;
}
```

### Color usage rules

- **`background` and `foreground` carry 90% of the UI.** Don't reach for accents.
- **`accent` is rare.** The dot on the `i` in the wordmark, the active-tab underline, the streak badge. Not on primary buttons. Use ≤ 3 times per screen.
- **Primary buttons are filled near-black on light / near-white on dark.** No brand-color CTAs in v1.
- **Signal colors (positive/negative) are for outcomes only.** Never for "info" / "warning" / random UI states. Green pill = correct call. Red pill = missed call. Nothing else.
- **No semantic gray ramp beyond `muted` / `muted-foreground` / `border` / `border-strong`.** Six grays = over-designed.

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
│  CATEGORY                            3d left   │
│                                                │
│  Will GPT-5 launch before          Geist 700   │
│  July 1, 2026?                     20-24px     │
│                                                │
│  ▁▂▃▅▆▇▇▆ consensus over 14 days   sparkline   │
│                                                │
│  ─────────────────────────────────             │
│  CURRENT CONSENSUS              YOU             │
│  62%                            ── %            │
│  Geist Mono 32                  predict slider  │
└────────────────────────────────────────────────┘
```

- Category overline in `text-overline` (uppercase, +0.08em tracking), muted-foreground.
- Title in Geist 700 at 20–24px (`text-title`).
- Sparkline as inline SVG, signal-positive when trending up, signal-negative trending down.
- Predict CTA is a slider revealed inline, not a modal.

### Forecast Score (the brand asset)

On a profile, the score takes a full screen-width display moment. Render at `text-display-xl` (112px) in **Geist 800** with tight letter-spacing. Below the number: a single line of `text-overline` reading the rank ("TOP 1% · TECH & AI"). To the right: a 6-point category radar in 64px.

### Share card (the receipt)

A 1080×1080 PNG generated server-side via `@vercel/og` or `satori`. Includes:

- The user's handle + Forecast Score badge in Geist 700.
- The market title in Geist 700 at display-md.
- The score number in **Geist 800 at 240–280px**, tabular nums, dominating the upper third — this is the poster moment.
- Their prediction probability + the consensus at the time + the actual outcome, set in Geist Mono.
- A sparkline of the market's resolution path.
- A small `forecast.social` wordmark, bottom-right.
- Background: same cool neutral palette as the product (`background` token), no paper texture. Two themes match the product themes one-for-one.

Sans-only across the entire card. The poster feeling comes from typographic scale and negative space, not from a special typeface. Treat the share card as a poster, not a screenshot. It is the marketing.

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

- A short Geist 700 line at `text-display-sm` ("Nothing to call yet.")
- One body line of context ("Predictions you make will appear here.")
- One CTA, ghost button.

Loading: skeleton bars in `muted`, not spinners. Never a full-page spinner.

## 12. The "premium" checklist

Before shipping any screen, verify:

- [ ] Display is **Geist 700/800**. No serif anywhere. Italic display is a red flag.
- [ ] No purple gradients, no glassmorphism, no neon glow.
- [ ] No cream / warm-paper backgrounds. Cool neutral palette only.
- [ ] Numbers are in Geist Mono with tabular-nums.
- [ ] Light mode reads airy and near-white, not yellow-tinted.
- [ ] Dark mode reads as a lifted neutral, not pure ink.
- [ ] Borders are visible but soft (no thick rules, no shadow-as-border).
- [ ] Accent appears ≤ 3 times on the screen, never on the primary CTA.
- [ ] Hover and focus states are designed, not default.
- [ ] Spacing is generous around display type — Stripe-density, not magazine-density.
- [ ] The screen could appear in a Stripe / Linear / Vercel / Cash App case study.

If two or more checkboxes fail, redesign.
