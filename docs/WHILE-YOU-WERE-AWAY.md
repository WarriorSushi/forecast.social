# WHILE-YOU-WERE-AWAY.md

A summary of what shipped while you were on vacation. The session ran autonomously through the remaining v1 phases, then through the highest-leverage v2 items, with a multi-agent review in between.

Every commit was pushed to `main`. The deployed code is at `https://github.com/WarriorSushi/forecast.social`.

## Phases shipped

### Phase 5 — Social layer (commit `176268e`)

- **follows** table + RLS (public read, self insert/delete, no-self-follow check).
- **FollowButton** on profile pages with `useOptimistic`; follower/following counts in the header.
- **comments + comment_upvotes** tables with a trigger that keeps `comments.upvote_count` in sync. Single-level threading (one nested reply level). 4000-char body limit enforced at the DB.
- **CommentsSection** on every market detail page: tops sorted by upvotes desc + created_at desc; replies inline asc. @mentions and bare URLs auto-linkify.
- **notifications** table with typed kinds: `follow`, `market_resolved`, `reply`, `score_milestone`, `bold_call`, `proposal_resolved` (the last added in V2.0).
- **Fan-out hooks** added in: `toggleFollow`, `postComment`, `resolveMarket` (per-predictor `market_resolved` with their pre-close latest call + correct/missed flag), `recomputeUserScore` (milestone crossings at 1500 / 2000 / 2500).
- **`/feed`** rebuilt with three lanes:
  1. Recent calls from people you follow (last 48h)
  2. Trending markets you haven't called (24h, with fallback to closing-soon)
  3. Bold calls — strong claims (≤15% or ≥85%) from forecasters with category score ≥ 1800
- **`/notifications`** page with read/unread row tint, per-kind rendering, "Mark all read" button. Bell badge with unread count on the desktop rail.

Checkpoint screenshots: `.checkpoints/phase-5/01-02`.

### Phase 6 — Share cards (commit `b645054`)

- Three dynamic 1080×1080 PNG endpoints using `next/og`, **no new deps**:
  - `/api/share/market/[slug]` — category + status pill, oversized consensus %, call count.
  - `/api/share/user/[username]` — display name + handle, big Forecast Score with `/3000`, streak in green, top three category scores.
  - `/api/share/prediction/[id]` — the receipt. Timestamp, market title, three-column "your call / consensus / outcome", @handle, correct/missed result.
- **og:image + twitter:card** wired into market and profile `generateMetadata` so shared links unfurl as poster-sized images.
- **Share button** on resolved-correct rows in the profile prediction history.

Reference render: `.checkpoints/phase-6/share-user.png`.

### Phase 7 — Polish & launch readiness (commit `58b5e7a`)

- **Loading skeletons** at every major route: `/markets`, `/markets/[slug]`, `/feed`, `/leaderboard`, `/notifications`, `/u/[username]`. Skeleton bars in `muted`, never spinners (per DESIGN.md §11).
- **`not-found.tsx`** and **`error.tsx`** styled to the design system. Error boundary surfaces the digest in dev.
- **`sitemap.ts`** emits the top 500 most-recently-updated markets, the top 500 ranked profiles, plus the four core surfaces. Hourly revalidate.
- **`robots.ts`** allows everything except `/admin`, `/settings`, `/onboarding`, `/api/`.
- **Root layout metadata** sets `metadataBase` + `openGraph` + `twitter` defaults so every page gets sane unfurls.
- **`/predict`** redirects to `/markets?sort=closing-soon` (replaces the Phase-3 stub).
- **In-memory rate limiter** (`src/lib/rate-limit.ts`) wired into `submitPrediction` (30/min) and `postComment` (12/min). Production swap to Upstash is V2.6.
- **15 more seeded markets** so `/markets` has 30+ to browse out of the gate (`scripts/seed-more-markets.ts`).

## Multi-agent post-Phase-7 review (commit `8d1f3ad`)

Three sub-agents reviewed in parallel: a code reviewer (server actions + RLS), an architecture/scale auditor, and a design + UX auditor. Findings consolidated in `docs/REVIEW.md`.

**Critical fixes shipped:**
- **`notifications` had no INSERT policy** — every `createNotification` would have failed silently in production. Added in migration `0008`.
- **`user_category_scores` had no RLS at all** — anon clients could mutate scores via PostgREST. Enabled RLS in `0008`.
- **`resolveMarket` was not transactional** — audit row + market state mutation could desync on crash. Wrapped in `db.transaction()`.

**Important fixes shipped:**
- `updateProfile` revalidated `/u/${user.id}` (UUID) instead of `/u/${username}`. Now uses `RETURNING` to grab the username and revalidate correctly.
- `/api/share/prediction/[id]` accepted any UUID and returned pre-resolution receipts — gated on `market_resolved_at IS NOT NULL AND outcome != 'invalid'`.
- Feed trending query was filtering out resolved markets AFTER the top-12 was picked, wasting slots. Filter moved into the aggregate.
- Four missing indexes added (`0009`): `follows.(follower_id, created_at desc)`, `notifications` partial where `read_at IS NULL`, `predictions.(user_id, market_id, created_at desc)`, `markets.(resolved_at, closes_at)`.

**Design fixes shipped:**
- Stripped italic Instrument Serif from 5 Bento category descriptions on the landing — DESIGN.md §2 caps Stylized at "two places only" (wordmark + hero sub-heading). Bento overreach removed.
- `tabular-nums` added to every digit pill on `ForecastScoreHero`.
- Per-row "share ↗" chip on profile neutralized from indigo to muted ghost to reduce accent overuse.

**Deferred to v2:**
- `stampPredictionScoring` N+1 inside per-user recompute → **V2.1 Inngest pipeline**.
- Sequential resolution recompute on markets with thousands of predictors → **V2.1**.
- In-process rate limiter → **V2.6 Upstash swap**.
- `completeOnboarding` TOCTOU race → bundled with **V2.0** profile work.

## V2 items shipped

### V2.0 — User-submitted markets with approval queue (commit `7d1838e`)

Anyone signed-in can propose a market; admins approve/reject from `/admin/proposals`. On approve, a Postgres trigger copies the proposal into `markets` crediting the proposer in `created_by`.

- **`market_proposals`** table with status enum (`pending` / `approved` / `rejected` / `needs_revision`), `rationale` field, `approved_market_id` set by the trigger so notifications can deep-link.
- **`proposeMarket`** server action — rate-limited to 1/6h per user (friction is the point), Zod-validated, closes_at must be ≥1h in the future.
- **`reviewProposal`** server action — admin-only, fires a `proposal_resolved` notification to the proposer with the approval status, optional rejection note, and the new market slug if approved.
- **`/markets/propose`** for the user-facing form (with a list of your past proposals beneath).
- **`/admin/proposals`** tabbed queue (pending / approved / rejected / revise) with collapsible rationale and a Review panel with Approve / Revise / Reject buttons.
- "Propose a market →" link surfaced on `/markets`.

Checkpoint screenshots: `.checkpoints/v2-proposals/01-02`.

### V2.2 — Live consensus via Supabase Realtime (commit `63fadee`)

The consensus % and call count on `/markets/[slug]` now update in real time without a page refresh.

- Migration `0012` enables the `supabase_realtime` publication on the `markets` table (idempotent via `pg_publication_tables` check).
- **`LiveConsensus`** client component subscribes to `postgres_changes` UPDATEs on a single market row, filtered by id, and re-renders the consensus percentage or call count when the payload arrives.
- SSR provides the initial values so there's no client-side waterfall on first paint.
- Resolved markets skip the live subscription — those numbers are frozen anyway.

### V2.3 — Invite codes (admin scope) (commit `608ff0a`)

Foundation for a launch-ramp invite system. Admin generates and tracks codes; the actual signup-side gate is left as a one-flag follow-up.

- **`invite_codes`** table: 8-char codes from a 31-symbol alphabet (omits ambiguous `I L O 0 1`), tracked with `created_by`, `used_by`, `used_at`, `note`. RLS: admin-only read/write.
- **`generateInviteCodes`** server action — Zod-validated batch generation (1-200 per batch).
- **`/admin/invites`** page: total / unused / used stat cards, generator form with count + optional note, table of recent 100 codes with select-all font-mono code, "who used it" linked to their profile.

## What's deferred

- **V2.1 Inngest pipeline** — the architecture audit's flagged scaling concern (sequential per-user recompute on resolution). The math works at current volume; needs Inngest env keys to wire up. Deferred until you're ready to set those up.
- **V2.4 Resend transactional email** — welcome, market resolved digest, milestone email. Needs RESEND_API_KEY.
- **V2.5 Algorithmic feed v2** — current feed has three hand-written lanes; the ranker is the next pass.
- **V2.6 Public API + Upstash rate limit swap** — read-only `/api/public/*` with cross-process rate limits.

Full v2 plan: `docs/V2.md`.

## Database state

Migrations applied through `0014`:
- 0000 / 0001 — initial users + categories + RLS + handle_new_auth_user trigger
- 0002 / 0003 / 0004 — markets, predictions, RLS + consensus triggers
- 0005 — user_category_scores
- 0006 / 0007 — follows / comments / comment_upvotes / notifications + RLS
- 0008 / 0009 — review fixes (RLS gaps + indexes)
- 0010 / 0011 — market_proposals + approval trigger
- 0012 — Realtime publication on markets
- 0013 / 0014 — invite_codes + RLS

Seed data: 25 markets across all categories, 1 admin user (`@warriorsushi`), 7 resolved test predictions, 1 ranked user with a Forecast Score of 1,359.

## Suggested first thing to do when you're back

1. **Pull `main`** and run `pnpm install && pnpm dev` to bring the dev environment up against the latest schema.
2. Skim **`docs/REVIEW.md`** (the multi-agent audit) and **`docs/V2.md`** (the roadmap) — both are short.
3. Smoke-test the new surfaces:
   - `/markets/propose` (signed-in) — submit a proposal.
   - `/admin/proposals` — approve your own proposal and watch it appear in `/markets`.
   - `/admin/invites` — generate a batch.
   - `/markets/[slug]` — open two browsers, submit a prediction in one, watch the consensus move in the other (Realtime).
4. Decide whether **V2.1 Inngest** is worth the env-var setup now, or wait until you actually see a resolution take >15s on a real market.

Welcome back.
