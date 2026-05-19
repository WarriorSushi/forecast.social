# UI / UX overhaul plan — synthesized from impeccable audits

Two parallel audits ran on 2026-05-19: a brand-register audit of the landing/marketing surfaces and a product-register audit of the dashboard/app surfaces. Both applied the impeccable absolute bans (cross-register), the register-specific bans, and DESIGN.md.

**Headline verdict.** The bones are right: typography is on-brand, surface hierarchy is consistent, every page has at least one designed empty state, the brand register is intact (no editorial drift, no crypto-glow … almost). But three pattern-level issues drag the whole product toward template-AI:

1. **AI scaffolding** — 7 of 8 landing sections share the same `SectionEyebrow + two-tone H2` chord; 6 places re-declare the same hand-rolled `<textarea>` className; 3 different empty-state shapes coexist when the `<EmptyState>` component already exists.
2. **Identical-card grids** — HowItWorks (3 identical cards), MarketCard list (every card has the same flat-line sparkline), /feed Trending lane (uniform 3×2 brick). Cross-register absolute ban.
3. **Accent budget overrun** — 9 accent uses on the landing's first scroll vs DESIGN.md's ≤3 per viewport. Spotlight is the worst offender: warm lavender in light mode (brand-spec violation).

The plan below clears these in three tiers. Items are tagged with effort (S = <1h, M = 1-3h, L = 3h+) and surface (LND = landing, APP = dashboard, AUTH = auth flow, CROSS = both).

---

## 🔥 TIER 1 — Ship this week (highest ROI, lowest risk)

These remove the strongest "generic LLM produced this" signals from the product. Most are surgical. Most reuse code that already exists.

### T1.1 · Kill the AI scaffolding pass — LND · S
Drop 5 of 7 `SectionEyebrow` usages on the landing. The H2s carry the section already. Keep only the `Worked example` eyebrow (it's a structural marker mid-section) and `FAQ` (semantic). Also drop the floating `Calendar` icon above the FinalCTA — empty space is the ornament. **30 lines of diff. Massive perceived quality lift.**

### T1.2 · Re-tone the Spotlight to cool-neutral — LND · S
`src/components/aceternity/spotlight-new.tsx` emits a warm lavender/purple gradient that violates the cool-neutral palette spec in light mode and triggers the crypto-glow lane in dark mode. Re-tone to `oklch(86% 0.01 250)` in light + `oklch(28% 0.01 260)` in dark with `mix-blend-multiply` / `screen` at <40% opacity. Make it about lifted geometry, not colored glow.

### T1.3 · Demote HowItWorks card grid → typographic row — LND · M
The three identical `01/02/03 + icon + headline + body` cards are the canonical "icon-above-heading" template tell. Convert to a horizontal numbered narrative: `01` Geist 800 at 120px muted-foreground next to the verb in Geist 800 at 64px foreground. Body as a single sentence beneath. Drop the icons (especially the Sparkles one — generic-AI reflex).

### T1.4 · Fix the MarketCard flat-line sparkline — APP · M
Every card in `/markets` currently renders the same flat line at 50% (the `points` prop is never passed). Identical-card-grid violation, AND actively misleading. Two options: (a) compute per-market sparklines server-side in the markets list query and pass to `MarketCard`; (b) remove the sparkline from the list card and reserve it for the detail page. **Option (b) ships faster, looks intentional.**

### T1.5 · Restack /feed and /leaderboard rows for mobile — APP · M
`/feed` Recent calls grid is `grid-cols-[1fr_64px_72px]` with a `hidden sm:inline` middle column — leaves a dead 64px column on mobile. The ResolutionBadge is also `hidden sm:inline-flex`, so mobile users lose the "did this call land?" signal that the feed exists to deliver. Same problem on `/leaderboard`. Fix: stack handle + relative time inline on mobile; replace the full pill with a compact colored dot indicator at <sm.

### T1.6 · AppTabBar full-width on tablets — APP · S
`max-w-[480px]` makes the bar a centered island on 600–1023px widths. Drop the cap. iPad currently reads "broken phone app."

### T1.7 · Mobile path to /notifications — APP · S
Bell is `desktopOnly: true` and there's no Bell in the mobile header either. Mobile users can't reach `/notifications` without typing the URL. Add a Bell icon button to `AppMobileHeader` with the unread badge.

### T1.8 · Trim accent budget — CROSS · S
Currently 9 accent uses on the landing's first scroll vs spec ≤3 per viewport. Cut: the `Top 0.2%` pill (use `bg-foreground/8`), the share-card `<Check>` icons (use foreground), the `/notifications` unread tint (already invisible at 4% — replace with a 2px-wide accent dot at the row's left baseline + bump fill to 8%). Final accent moments per landing viewport: wordmark dot, worked-example positive green, share-card outcome. That's it.

### T1.9 · Hero italic subhead — LND · S
At 26-32px the italic subhead competes with the headline. Drop to 22-24px, tighten leading to 1.15. Currently wraps awkwardly on mobile ("Be famous / for it.").

**Tier 1 total effort: roughly one full coding day. Single commit per item; ship throughout the week.**

---

## 📐 TIER 2 — Ship next week (deeper structural fixes)

### T2.1 · Consolidate empty-state pattern — APP · M
The `<EmptyState>` component at `src/components/app/empty-state.tsx` is barely used. Three competing shapes coexist: dashed rounded-2xl block (`/feed` lanes), inline `<p>` paragraphs (admin pages), and the `<EmptyState>` component itself (markets list, comments). Replace ALL with `<EmptyState>` (designed headline + body + single CTA per DESIGN.md §11). Audit list: `/feed FollowLane`, `/feed Trending`, `/feed BoldCalls`, `/notifications`, `/leaderboard`, `/u/[username]` history, `/admin/markets`, `/admin/proposals`.

### T2.2 · Build `<Textarea>` primitive + replace native `<select>` — APP · M
Six places re-declare the same textarea className soup: `propose-market-form.tsx`, `create-market-form.tsx`, `comment-form.tsx`, `edit-profile-form.tsx`, `resolve-market-panel.tsx`, `review-proposal-panel.tsx`. Build `components/ui/textarea.tsx` once and import everywhere. Same for the two native `<select>`s — replace with shadcn `Select` (which is Radix under the hood) so the dark-mode dropdown panel stops looking like a system menu.

### T2.3 · Prediction slider → Radix primitive — APP · L
The CORE interaction uses native `<input type="range">` with the thumb opacity-hacked to 0. The visible thumb drifts on Firefox. Add value-bubble that floats above the thumb during drag. Replace with `@radix-ui/react-slider` (or shadcn's wrapping of it) + designed thumb with focus ring + larger consensus tick (currently disappears in dark mode). This is the single highest-impact UX fix in the dashboard.

### T2.4 · Re-architect the Categories Bento — LND · M
Pop-culture cell sits alone after the featured Tech-AI 2×2. "Propose one" + "What's hot" are meta cells mixed in with category cells. Re-architect: featured Tech & AI stays 2×2; Crypto / Sports / Pop-culture stack as a single tall right column (newspaper-table style, three horizontal rows); a thin text-only strip below the grid for meta nav: `→ Propose a market · See what's hot · Browse all 47`.

### T2.5 · ScoreShowcase pivot — LND · M
Currently ScoreShowcaseCard (`page.tsx:613`) repeats the EXACT same data the hero ProfileCard already showed (`@itoldyouso`, 2,471, Top 0.2%, 47-day streak). Three sections in a row using the same example feels like seed data. Pivot ScoreShowcase to a **90-day score history line** at 240px tall — narrate the journey to 2,471, don't restate the number.

### T2.6 · Active rail bar 3px → 2px — APP · S
`src/components/app/app-rail.tsx:120` violates the cross-register ban on side-stripe borders >1px. The active item's 3px accent bar should drop to 2px and match the tab-bar's underline treatment. Trivial but a brand-spec compliance fix.

### T2.7 · ProfileCard / ForecastScoreHero token alignment — APP · S
`src/components/profile/forecast-score-hero.tsx:75` uses inline `text-[88px] sm:text-[112px]` arbitrary values instead of the `text-display-lg` / `text-display-xl` tokens. Three pill treatments side-by-side (`bg-accent/12 Top 1%`, plain green streak, plain muted resolved count) look like three different design eras. Unify: pill them all or pill none.

### T2.8 · Anonymous /markets first impression — LND · M
At zero predictions, every market card shows `consensus: —` / `calls: 0` / flat line. Anonymous visitors land here and see "nothing happening." Fix the card empty state: when `prediction_count === 0`, hide the consensus block and show a single-line "Be the first to call →" CTA per card. Also add a stat-strip beneath the H1: `47 OPEN · 4 CATEGORIES · 3 CLOSING TODAY` in Geist Mono.

### T2.9 · Anonymous market detail SignInPrompt — LND · S
The right rail on `/markets/[slug]` for unauthed users shows a meek "Sign in →" link. Replace with a filled `Sign in to call →` button at h-12 with a faint preview of the slider behind it (50% opacity). Show, don't tell.

### T2.10 · Form quality pass — APP · M
Inputs lack the focus ring that adjacent textareas have. Labels use `text-overline` (uppercase tracked = section eyebrow style; wrong for form labels). Mobile inputs are 40px when DESIGN.md prescribes 44-48px for mobile comfort. Sign-out button uses `signal-negative` color (DESIGN.md §3: "Signal colors are for outcomes only" — sign-out isn't destructive). Audit `credentials-form.tsx`, `edit-profile-form.tsx`, `propose-market-form.tsx`, `create-market-form.tsx`, `generate-invites-form.tsx`. Universal fix once we have the `<Textarea>` primitive in place.

### T2.11 · Section-header consistency across dashboard — APP · S
Four header patterns coexist across the 11 dashboard pages. Settle on one: `overline + display-md + optional body-lg subhead`. Apply uniformly.

---

## 🧪 TIER 3 — v2 polish (after launch / when time permits)

### T3.1 · Sign-up + sign-in visual upgrade — AUTH · M
Currently 8 inches of empty space on desktop + a 420px form. Add a silent right-rail "call card" showing `@quanttrader · +18 · Fed pauses rates · May 1, 2026` at 40% opacity. Or rotate three. Auth gets its own visual language.

### T3.2 · Onboarding ends on first prediction — AUTH · L
PRD success metric #2 wants 60% of new users to make a second prediction in 7 days. Today, onboarding lands at `/feed`, which is sparse for a brand-new account. Land them on a hand-picked starter market with the slider primed at 50% instead. Big retention lever.

### T3.3 · NotBetting asymmetry — LND · S
Today both panels (`Betting sites` vs `forecast.social`) use identical Card chrome — reads as "two equal options" when the message is "the other thing is bad, we're the alternative." Tone the left card down: `bg-muted/40 border-dashed border-border opacity-80`. Asymmetry communicates the polarity faster than the X/Check icons do.

### T3.4 · Leaderboard delta column — APP · M
Add weekly score change (`+47` green, `-12` red) so the leaderboard feels alive. Currently it's a static rank list. Requires a small backfill job to snapshot scores nightly, but the visible UX is one column.

### T3.5 · Notifications get actor avatars — APP · S
Follower / reply / bold-call notifications are text-only. Render a 24px avatar before the body text for user-driven notifications. Avatars are everywhere else in the app; absent here.

### T3.6 · Profile + Settings centering — APP · S
Both pages use `max-w-2xl` without `mx-auto`. Hug the left rail on wide screens. Wrap in `mx-auto w-full max-w-[720px]` like notifications.

### T3.7 · Two-tone H2 pattern variation — LND · S
Every section H2 splits Geist 800 foreground from Geist 800 muted-foreground in the same shape. Eight identical syntactic moves. Vary three of them — make some single-color, swap one to a single bold sentence with no muted-second-half.

### T3.8 · Mono budget — CROSS · S
Mono is currently doing too much: timestamps, captions, CTAs, row labels. DESIGN.md §1 bans "monospace as lazy 'technical' shorthand." Reserve mono for **digits and data tokens**. CTAs and editorial captions back to Geist sans.

### T3.9 · Marketing header DRY — CROSS · S
`(marketing)/layout.tsx:13` and `(public)/layout.tsx:65-95` duplicate the entire top-bar. Extract into `<MarketingHeader variant="marketing|public-anon" />`.

---

## 🎬 Aceternity wishlist (separate decisions, all optional)

These are not part of the tiered priority — they're brand-permitted moments to add ambition. Pick the ones that serve the story; skip the rest.

| Component | Where | Why | Worth it? |
|---|---|---|---|
| **TextGenerateEffect** | Hero headline word-by-word reveal at first paint | DESIGN.md §7 permits ambitious first-load motion; static hero feels 2022 | ✅ Strong yes |
| **HoverEffect** | BentoGrid category cells + MarketCard grid | Other cells dim to 70% as one lights up; "the product responds to me" | ✅ Yes for Bento, maybe for MarketCard |
| **StickyScroll** | WorkedExample three-step | Score animates from 2,453 → 2,471 as user scrolls each step | ✅ The one place choreography is earned |
| **Compare** | NotBetting section | Drag-to-compare betting site vs forecast.social | 🟡 Verify works with text content first |
| **GlowCard / MovingBorder** | ForecastScoreHero (Top 5% only) | Make the brand asset feel earned without crypto-glow | 🟡 Gate strictly to Top 5% band |
| **Sparkles** | Score-milestone notification (one-shot) | First time you cross 2,000 / 2,500 / 3,000 | ✅ Tight, earned moment |
| **BentoGrid** | /feed Trending lane | Solves the identical-card-grid issue + adds hierarchy | ✅ Yes |

**Avoid entirely:** Meteors, BackgroundBeams, GlowingStars, Vortex, FollowingPointer. All push toward the crypto-glow lane DESIGN.md §1.2 explicitly rejects.

---

## Order to ship

If we batch by surface area to minimize churn:

**Commit 1 (landing scaffolding pass):** T1.1, T1.2, T1.3, T1.8, T1.9 — single landing.tsx PR, ~1 day.
**Commit 2 (mobile + chrome):** T1.5, T1.6, T1.7, T2.6, T2.7 — half a day.
**Commit 3 (MarketCard cleanup):** T1.4 — half a day.
**Commit 4 (primitives):** T2.1, T2.2 — a day.
**Commit 5 (prediction slider rebuild):** T2.3 — a day.
**Commits 6-N (deeper landing):** T2.4, T2.5, T2.8, T2.9 — staged over the following days.

Tier 3 lands ad-hoc after launch.

---

## What I will NOT do without explicit go-ahead

- Touch the algorithm or scoring math (it's frozen per AGENTS.md)
- Change DESIGN.md tokens (the system, not the application of it)
- Install new dependencies beyond what's already in TECH_STACK.md
- Add motion that doesn't respect `prefers-reduced-motion`
- Ship anything that breaks light or dark mode
- Make changes to admin-only pages a priority — they're not the launch surface
