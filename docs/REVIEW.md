# REVIEW.md — Post-Phase-7 audit + actions

Three sub-agents reviewed the codebase after Phase 7 shipped: a code reviewer (server actions + RLS + scoring), an architecture/scale auditor (request paths, transactions, indexes), and a design + UX auditor (DESIGN.md conformance, empty states, accent usage, mobile 390px). This document captures the consolidated findings and what shipped in response.

## Summary table

| Finding | Severity | Status | Where |
|---|---|---|---|
| `notifications` table missing INSERT policy | Critical | **Fixed** | `drizzle/0008_review_fixes.sql` |
| `user_category_scores` no RLS at all | Critical | **Fixed** | `drizzle/0008_review_fixes.sql` |
| `resolveMarket` not transactional | Critical | **Fixed** | `src/server/actions/resolve-market.ts` |
| `updateProfile` revalidates wrong path (UUID instead of username) | Important | **Fixed** | `src/server/actions/profile.ts` |
| `/api/share/prediction/[id]` leaks unresolved predictions | Important | **Fixed** | `src/app/api/share/prediction/[id]/route.tsx` |
| Feed trending query doesn't filter open markets | Important | **Fixed** | `src/app/(app)/feed/page.tsx` |
| Missing indexes (follows.follower_id direction, notifications unread, predictions user-first, markets resolution-state) | Important | **Fixed** | `drizzle/0009_review_indexes.sql` |
| `completeOnboarding` TOCTOU race on username uniqueness | Important | Acceptable (DB unique constraint catches; friendly-error mapping → V2) | `src/server/actions/profile.ts:58-79` |
| `stampPredictionScoring` N+1 inside per-user recompute | Important | Deferred → **V2.1** | `src/lib/scoring/recompute.ts:248-269` |
| Resolution path scales O(N × M) sequentially; will time out on a 5k-predictor market | Important | Deferred → **V2.1 Inngest pipeline** | `src/lib/scoring/recompute.ts` |
| Rate limiter is in-process (per-worker drift) | Acceptable | Deferred → **V2.6 Upstash swap** | `src/lib/rate-limit.ts` |
| Feed page: 6 sequential queries, no caching | Acceptable for current volume | Deferred → V2 algorithmic feed | `src/app/(app)/feed/page.tsx` |
| Italic Instrument Serif on 5 Bento descriptions + receipt mock wordmark = brand drift | Design | **Fixed** | `src/app/(marketing)/page.tsx` (5 Bento spans, 1 mock wordmark) |
| Empty states drift: 5 surfaces don't match §11 (size, missing CTA) | Design | Partially fixed via component reuse; remaining stragglers → next pass | various |
| `tabular-nums` missing on score-hero pills, streak text, rank fallback | Design | **Fixed** on ScoreHero | `src/components/profile/forecast-score-hero.tsx` |
| Accent overuse: per-row "share ↗" chip on profile uses indigo | Design | **Fixed** (chip neutralized) | `src/app/(app)/u/[username]/page.tsx` |
| Accent overuse on notifications (bold-call %, milestone number) | Design | Acceptable in context | `src/app/(app)/notifications/page.tsx` |
| Card radii drift (rounded-2xl / rounded-3xl ignore `--radius` token) | Design | Acceptable for now; treat as the project standard | many |
| Hero uses ad-hoc `text-[112px]` etc. instead of `text-display-xl` token | Design | Acceptable — the inline sizing is responsive across breakpoints; tokens don't have separate xl values | `src/app/(marketing)/page.tsx` |
| Mobile 390px: profile call-history grid `[1fr_72px_72px]` leaves 118px for title | Design | Note: acceptable since `truncate` keeps row tidy; revisit | `src/app/(app)/u/[username]/page.tsx:269` |
| Mobile 390px: fanned hero cards translate-x [36-40%] partially overflow on the smallest viewport | Design | Acceptable — page `overflow-x-hidden` clips cleanly; readable on inspection | `src/app/(marketing)/page.tsx` |

## What this means for V2

The three deferred-to-v2 items map cleanly to `docs/V2.md`:

- **V2.1 (Inngest pipeline)** is now reinforced by two independent findings: the resolution path's O(N × M) sequential recompute (architecture audit) and the `stampPredictionScoring` per-row UPDATE loop (code review). Both vanish when scoring fans out as Inngest steps.
- **V2.6 (Public API / Upstash rate limits)** picks up the in-process rate-limit limitation. Cross-process consistency lands when we move to Upstash.
- The TOCTOU mapping improvement on `completeOnboarding` is small enough to bundle into V2.0 (user-submitted markets) since that phase touches profile/proposal flows.

## What was deliberately NOT fixed

Most design "drift" items are conscious project decisions made over the build cycle:

- **Card radii at `rounded-2xl` / `rounded-3xl`** — DESIGN.md prescribes a single `--radius` (0.75rem), but the product evolved to larger rounded corners that read more premium. Either update DESIGN.md or commit to a token-based pass; both are V2 housekeeping, not v1 blockers.
- **Inline `text-[Npx]`** on hero/score numbers — chosen for breakpoint-specific scaling beyond the standard tokens. Worth a future tokens revision but not a regression.
- **Per-event accent on notifications** (milestone number, bold-call %) — these ARE the brand moments in those rows; demoting them would read flat.

## Verification

After fixes:
- `pnpm tsc --noEmit` is clean.
- `pnpm migrate` applies 0008 + 0009 cleanly against the cloud DB.
- The /predict redirect, the /api/share/prediction guard, and the resolveMarket transaction were spot-checked via curl + smoke test.

The codebase is in good shape to take a v2 build cycle on top of.
