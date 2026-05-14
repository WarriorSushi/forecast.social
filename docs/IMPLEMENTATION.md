# IMPLEMENTATION.md — Build plan, phase by phase

Ship each phase end-to-end before moving on. "End-to-end" means: it works locally, it's deployed to a staging Vercel preview, the UI matches `DESIGN.md` quality, and it has at least manual smoke-test coverage.

Each phase ends with a checkpoint. **Stop at every checkpoint and ask for review** before the next phase. Premature parallelism is the single biggest failure mode for AI-built products.

## Phase 0 — Foundation (the shell)

**Goal:** A premium-looking empty app. No features yet. Just the bones, the brand, and the theming.

1. `pnpm create next-app@latest . --yes` (TS, Tailwind, App Router, Turbopack) — scaffold **in-place** at the repo root so the existing `/docs` and root `CLAUDE.md` are preserved.
2. Replace the generated `AGENTS.md` at the repo root with a thin `@docs/AGENTS.md` pointer (mirroring `CLAUDE.md`). Canonical docs stay in `/docs`. **Before installing any library**, run `context7` `resolve-library-id` + `query-docs` for that library's pinned version (see `CLAUDE.md` "Tooling MCPs").
3. Install: `next-themes`, `geist`, `tw-animate-css`, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `sonner`, `zod`, `motion`.
4. Configure `globals.css` with the full token set from `DESIGN.md` §3.
5. Load **Instrument Serif** via `next/font/google` and **Geist Sans / Mono** via the `geist` package. Wire them into `@theme` font tokens.
6. `pnpm dlx shadcn@latest init` — style `new-york`, base `neutral`, CSS variables, RSC yes. Then `shadcn@latest add button card input label dropdown-menu dialog sonner skeleton avatar badge separator tabs tooltip`.
7. Add `ThemeProvider` with `next-themes` and a three-state theme toggle (System / Light / Dark) in the top right.
8. Build the **landing page** at `/`. Use Instrument Serif + Geist + Geist Mono together. A single hero, a one-line manifesto, three product screenshots-to-be (gray placeholder cards for now), and a "Get early access" CTA that links to `/sign-up` (which doesn't work yet — that's fine). The landing must be beautiful in both light and dark. This is the design proof.
9. Build the **app shell layout** at `(app)/layout.tsx` with desktop left rail + mobile bottom tab bar. All routes 404 for now.
10. Add a `theme-debug` route at `/debug/design` that renders every type scale, every color token, every primitive in light and dark. Useful for the rest of the build.

**Checkpoint:** landing page deployed. Light and dark both gorgeous. User signs off on visual direction before any features go in. Run the **DESIGN.md §12 "premium checklist."** All ten boxes must check.

## Phase 1 — Auth & profile

**Goal:** A user can sign up, set a username, see an empty profile.

1. Set up Supabase project. **Auth settings (Phase 1 dev):** enable Email provider, disable "Confirm email," disable "Secure password change," disable Google/Apple (defer per `TECH_STACK.md` "Sign-in methods"). Capture `NEXT_PUBLIC_SUPABASE_URL`, anon key, service-role key, and the direct-postgres `DATABASE_URL` (Drizzle uses the direct connection, not the pooler).
2. Install `@supabase/supabase-js`, `@supabase/ssr`, `drizzle-orm`, `drizzle-kit`, `postgres`.
3. Build `lib/supabase/{server,client,admin}.ts` per `ARCHITECTURE.md`.
4. Add `src/middleware.ts` to refresh sessions on every request.
5. Author `lib/db/schema.ts` with `users` and `categories` tables. Generate and apply migration. Seed categories.
6. Add the auth-user trigger from `DATABASE.md` so a `users` row appears on signup.
7. Build `/sign-in` and `/sign-up` pages. **Phase 1:** email + password (`supabase.auth.signInWithPassword` / `signUp`) so the playwright MCP can drive the flow end-to-end. Form built on `react-hook-form` + zod, matching the design system — no shadcn defaults visible. Sign-up creates the auth.users row; the `handle_new_auth_user` trigger creates the matching `public.users` row.
8. Build the **onboarding flow** — after first sign-in, user must pick a username (3–20 lower-alphanum + underscore) and display name before reaching `/feed`. Server-side validate uniqueness.
9. Build a minimal `/u/[username]` profile page: avatar, display name, handle, bio, "Unranked" badge. Empty states for prediction history.
10. Build `/settings` with: change display name, change bio, upload avatar (Supabase Storage), sign out.

**Checkpoint:** Sign up, claim username, view profile, sign out, sign back in.

## Phase 2 — Markets (read-only)

**Goal:** Markets exist in the DB. Users can browse them. No predictions yet.

1. Add `markets`, `market_resolutions` tables. Generate migration with all indexes and RLS.
2. Add an `is_admin` flag for your own user.
3. Build `/admin/markets` (gated by `is_admin`) with: list of markets, "Create market" form (title, description, category, closes_at, resolves_at, resolution_source). Server action validates with Zod, inserts via Drizzle.
4. Seed 10 markets manually to have content.
5. Build `/markets` — a grid/list of prediction cards (DESIGN.md §6 prediction card). Filter by category as URL search params. Sort by "Closing soon" / "Most predicted" / "New".
6. Build `/markets/[slug]` — full market page. Title in display serif, description, resolution source link, closes-at countdown, "predict" CTA (does nothing yet). Placeholder for sparkline and discussion.
7. Build the **consensus sparkline component** as an inline SVG (no library needed). Shows a flat line for now since no predictions exist.

**Checkpoint:** Admin creates a market. It appears on `/markets` and at `/markets/[slug]` and is gorgeous on mobile.

## Phase 3 — Predictions (the core)

**Goal:** Users can make predictions. The product becomes interactive.

1. Add `predictions` table + RLS (immutable, see `DATABASE.md`) + the `on_prediction_inserted` trigger.
2. Build the **prediction slider** as a client component in `components/app/prediction-slider.tsx`. Continuous 0–100, snaps to 1%, value bubble on drag, color shift through the slider track.
3. Build server action `predictions/submit` — Zod validates (`marketId: uuid`, `probability: 0-1`), inserts, snapshots `consensus_at_time`, revalidates the market page.
4. On the market page, integrate the slider: signed-in user sees their last prediction (if any), can drag to a new value, submit creates a new immutable record. Toast on success ("Locked in at 73%").
5. Render the **predictions timeline** on the market page: list of recent predictions, anonymized except for username and value. Real names link to profiles.
6. Update the consensus sparkline to render real data — sample at 12 evenly-spaced points across the market's lifespan, plotted as `consensus_probability` derived from predictions.
7. Build the **profile prediction history**: chronological list of user's predictions, each with the market title, their value, the market consensus at the time, and a "pending" / "correct" / "missed" pill.
8. Add Supabase Realtime subscription on the market page: live consensus updates as new predictions come in.

**Checkpoint:** Two browser sessions, two users, both predict on the same market, both see the consensus move live.

## Phase 4 — Resolution & scoring

**Goal:** Markets resolve. Forecast Scores compute. The scoreboard comes alive.

1. Implement `lib/scoring/score.ts` exactly per `SCORING.md`. Unit-test it with a few synthetic cases (perfect, random, anti-skill, single-prediction shrinkage).
2. Add `user_category_scores` table.
3. Set up Inngest. Create `lib/inngest/client.ts` and the `/api/inngest` handler.
4. Build the `market.resolve` Inngest function. Triggered by the admin pressing "Resolve as Yes/No/Invalid" in `/admin/markets/[slug]`. It:
   - Inserts a `market_resolutions` row.
   - Updates the market's `outcome`, `resolved_at`.
   - For each user with predictions on this market, fires `score.recompute`.
   - Fires `notify.market.resolved` per predictor.
5. Build the `score.recompute` Inngest function. Loads all resolved predictions for a user, applies the algorithm, updates `users.forecast_score`, `users.current_streak`, `users.longest_streak`, and all `user_category_scores` rows.
6. Build the **Forecast Score hero** component for the profile. Big Instrument Serif number, count-up animation on first paint, rank percentile overline ("TOP 1% • TECH & AI"). Italic display if top 10%.
7. Build the **category radar** component (recharts radar chart) showing per-category scores.
8. Build `/leaderboard` — global and per-category, dense_rank, top 100, podium treatment for top 3 (display-serif rank numbers).
9. Add the **nightly recompute** Inngest scheduled function (`cron('0 3 * * *')`).

**Checkpoint:** Resolve a test market. All predictors' scores update. Leaderboard reflects new ranks. Numbers count up.

## Phase 5 — Social layer

**Goal:** The product feels like a social network, not a betting tool.

1. Add `follows` table + RLS.
2. Build the follow / unfollow button on profile pages. Server action with optimistic update on the client.
3. Build the **feed** at `/feed`. Mix:
   - Predictions from people the user follows (last 48h).
   - Trending markets (by prediction count in last 24h) that they haven't predicted on.
   - A "bold call" surface: a prediction at ≥85% or ≤15% from a user with a strong category score.
4. Build `comments` + `comment_upvotes` tables + RLS.
5. Build the **market discussion thread** on `/markets/[slug]`. Single-level reply, upvote, sorted by `upvote_count desc, created_at desc`. Markdown not needed — plain text + auto-linked URLs.
6. Add `@mention` rendering (linkify `@username` in comments).
7. Build notifications:
   - `notifications` table.
   - Bell icon in nav with unread count.
   - `/notifications` page.
   - Inngest fan-out for: new follower, market resolved (for predictors), reply to your comment, score milestone (crossed 1500 / 2000 / 2500).

**Checkpoint:** Two users follow each other, comment on a market, resolve a market, both get notifications.

## Phase 6 — Share cards (the marketing)

**Goal:** Every correct prediction generates a beautiful shareable image.

1. Install `satori` + `@vercel/og` (or the bundled `next/og`).
2. Design the share card template per `DESIGN.md` §6. 1080×1080 PNG.
3. Build `/api/share/[predictionId]/route.ts` that renders the PNG on demand.
4. Add a "Share" button on resolved correct predictions in the profile timeline and the market page. Tapping it: copy link, open native share sheet on mobile, download PNG on desktop.
5. Set `og:image` on all market pages to a dynamic share card showing current consensus + top forecasters.
6. Set `og:image` on profile pages to a dynamic share card showing the user's Forecast Score and category radar.

**Checkpoint:** Resolve a market. A predictor shares their card to X. Card looks like a poster.

## Phase 7 — Polish & launch readiness

**Goal:** Production hardening, performance, and the launch ramp.

1. **Rate limit** every server action via Upstash. See `TECH_STACK.md` for limits.
2. **Error and 404 pages** styled to the design system.
3. **Loading states** everywhere — skeleton bars, not spinners.
4. **Empty states** everywhere — designed per `DESIGN.md` §11.
5. **Email**: welcome email on signup, "your market resolved" email (Resend + react-email).
6. **SEO**: per-market `<title>` and meta, sitemap, robots.txt, structured data on profiles.
7. **Analytics**: Vercel Analytics + Vercel Speed Insights. No third-party trackers.
8. **Auditing pass**: every page in light, dark, mobile, desktop. Run the DESIGN.md premium checklist.
9. **Seed launch markets**: 40–50 across categories, mix of horizons (see PRD.md §6).
10. **Invite system**: simple `invite_codes` table, signups gated by code. Generate 200 codes for the first wave.
11. **Status page** at `/status` — single static page acknowledging current uptime / limits.
12. **Production deploy**: connect domain `forecast.social`. Verify all env vars. Enable Vercel WAF defaults. Lock the staging branch behind basic auth.

**Checkpoint:** You can hand a code to a stranger and they have a clean, fast, beautiful experience from landing → signup → first prediction → first resolution.

## After launch (v2 backlog, do not build yet)

- User-submitted markets with approval queue.
- Creator subscriptions / paid newsletters from a profile.
- Sponsored markets.
- Native iOS / Android.
- Algorithmic feed.
- Multi-language (start with i18n folder structure ready, but don't translate).
- DMs.
- Web push notifications.
- Public API.

## How to estimate

Don't. Build phase by phase, ship phase by phase, ask for review at every checkpoint.

If anything is unclear, stop and ask. The single biggest risk is building a feature that wasn't actually requested. Stay disciplined to this doc.
