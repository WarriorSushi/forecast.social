# ARCHITECTURE.md — Code layout and patterns

## Folder structure

```
forecast-social/
├── CLAUDE.md                # entry point (this doc set)
├── AGENTS.md                # rules for the AI agent (Claude Code)
├── docs/                    # all the planning docs you're reading
│   ├── PRD.md
│   ├── TECH_STACK.md
│   ├── DESIGN.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── SCORING.md
│   └── IMPLEMENTATION.md
├── public/
│   ├── fonts/               # (auto-managed by next/font)
│   ├── icons/
│   └── og/                  # static og image fallbacks
├── drizzle/                 # generated migrations
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (marketing)/     # public-facing pages, marketing layout
│   │   │   ├── page.tsx     # landing
│   │   │   ├── manifesto/
│   │   │   └── layout.tsx
│   │   ├── (app)/           # signed-in app, app shell layout
│   │   │   ├── feed/
│   │   │   ├── markets/
│   │   │   │   ├── page.tsx           # list
│   │   │   │   └── [slug]/page.tsx    # market detail
│   │   │   ├── u/
│   │   │   │   └── [username]/page.tsx # profile
│   │   │   ├── leaderboard/
│   │   │   ├── notifications/
│   │   │   ├── settings/
│   │   │   └── layout.tsx
│   │   ├── (auth)/          # auth screens, minimal layout
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── admin/           # admin tooling, gated
│   │   │   ├── markets/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── inngest/route.ts        # inngest webhook
│   │   │   ├── og/[…]/route.ts         # og image generation
│   │   │   └── share/[predictionId]/route.ts  # share card PNG
│   │   ├── layout.tsx       # root: fonts, theme provider, sonner
│   │   └── globals.css      # tokens from DESIGN.md
│   ├── components/
│   │   ├── ui/              # shadcn primitives (do not hand-edit shadcn output unless restyling)
│   │   ├── app/             # composed app components
│   │   │   ├── prediction-card.tsx
│   │   │   ├── prediction-slider.tsx
│   │   │   ├── consensus-sparkline.tsx
│   │   │   ├── forecast-score-hero.tsx
│   │   │   ├── category-radar.tsx
│   │   │   ├── leaderboard-row.tsx
│   │   │   ├── market-thread.tsx
│   │   │   └── share-card-preview.tsx
│   │   ├── marketing/       # landing-page only
│   │   ├── icons/           # custom icons if any
│   │   └── theme-toggle.tsx
│   ├── lib/
│   │   ├── env.ts           # zod-validated env
│   │   ├── supabase/
│   │   │   ├── server.ts    # cookie-based server client
│   │   │   ├── client.ts    # browser client
│   │   │   └── admin.ts     # service-role client (server-only)
│   │   ├── db/
│   │   │   ├── schema.ts    # Drizzle schema (see DATABASE.md)
│   │   │   ├── index.ts     # drizzle client
│   │   │   └── queries/     # typed query helpers
│   │   ├── scoring/
│   │   │   ├── brier.ts
│   │   │   ├── streak.ts
│   │   │   ├── score.ts     # the main Forecast Score (see SCORING.md)
│   │   │   └── rank.ts
│   │   ├── inngest/
│   │   │   ├── client.ts
│   │   │   └── functions/
│   │   │       ├── resolve-market.ts
│   │   │       ├── recompute-scores.ts
│   │   │       └── notify.ts
│   │   ├── share/
│   │   │   └── card.tsx     # Satori / @vercel/og template
│   │   ├── ratelimit.ts
│   │   ├── auth.ts          # session helpers
│   │   ├── types.ts
│   │   └── utils.ts         # cn() and friends
│   ├── server/
│   │   └── actions/         # all server actions, one file per domain
│   │       ├── predictions.ts
│   │       ├── markets.ts
│   │       ├── follows.ts
│   │       ├── comments.ts
│   │       └── admin.ts
│   ├── hooks/
│   │   ├── use-supabase.ts
│   │   ├── use-realtime-market.ts
│   │   └── use-theme.ts
│   └── styles/              # only if extra global pieces are needed
├── drizzle.config.ts
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── .env.local
```

## Rendering rules

**Default to Server Components.** Drop to client only when:

- Interactive state (slider value, theme toggle, dialog open).
- Browser-only APIs (clipboard, share sheet).
- Subscriptions / realtime.

Mark client components with `"use client"` at the top of the file. Keep client components small and leaf-shaped. If a page has one interactive island, lift the rest into server components above it.

## Data flow

```
        ┌───────────────┐
        │  Client (RSC) │
        └──────┬────────┘
               │ Server Action (Zod-validated input)
               ▼
        ┌───────────────┐
        │  Server Action│ ──► writes Drizzle → Supabase Postgres
        │   (server/)   │ ──► emits Inngest event for side effects
        └──────┬────────┘
               │ revalidatePath / revalidateTag
               ▼
        ┌───────────────┐
        │  RSC re-renders│
        └───────────────┘
```

- **All mutations go through server actions in `src/server/actions/`.** No direct DB calls from client.
- **Server actions validate input with Zod** before touching the DB. No naked input.
- **Server actions return typed results.** Use a `Result<T, E>` discriminated union so the client can render success and error consistently.
- **Cache invalidation is explicit:** `revalidatePath('/markets/[slug]')` or `revalidateTag('predictions:user:123')`.

## Auth pattern

We use `@supabase/ssr` with cookie-based sessions. Three clients:

- `lib/supabase/server.ts` — used in Server Components and server actions. Reads cookies.
- `lib/supabase/client.ts` — used in client components for realtime subscriptions only.
- `lib/supabase/admin.ts` — service-role key. **Never imported into a client component**. Reserved for admin operations and Inngest functions.

A middleware (`src/middleware.ts`) refreshes the session on every navigation. Protected routes (`/feed`, `/u/[username]/settings`, `/admin`) check `await getUser()` in their layout / page and `redirect('/sign-in')` if absent.

### Authorization (RLS)

The database enforces who can read and write what via Postgres Row Level Security. See `DATABASE.md` for the full policy set. Key idea: even if the client somehow sends a bad query, RLS rejects it. Server actions still validate, but RLS is the floor.

## Background jobs (Inngest)

Three core jobs:

1. **`market.resolve`** — fired when admin resolves a market.
   - Loads all predictions on that market.
   - Computes Brier score per prediction.
   - Updates `predictions.brier` and `predictions.outcome_at`.
   - Triggers `score.recompute` for each affected user.
   - Triggers `notify.market.resolved` per predictor.

2. **`score.recompute`** — recomputes a user's Forecast Score.
   - Reads all resolved predictions.
   - Applies the algorithm in `SCORING.md`.
   - Writes new global + per-category scores to `users` + `user_category_scores`.
   - Updates streak counters.

3. **`notify.*`** — fans out notifications. Writes rows to `notifications` and (later) sends emails / push.

Inngest functions live in `lib/inngest/functions/`. The handler is mounted at `/api/inngest`.

## Realtime

One realtime subscription, used on the market detail page: subscribe to inserts on `predictions` filtered by `market_id`. Update the consensus sparkline live as predictions come in. Unsubscribe on unmount.

Do not use realtime for the feed; it's chronological and re-fetches on focus.

## Caching strategy

- **Marketing pages** (`(marketing)/*`): fully static, `revalidate = 3600`.
- **Markets list** (`/markets`): RSC fetch with `revalidate = 60`.
- **Market detail** (`/markets/[slug]`): RSC fetch with `revalidate = 30`, plus realtime subscription for live data.
- **Profile** (`/u/[username]`): RSC fetch with `revalidate = 60`, busted via tag on score recompute.
- **Feed**: RSC fetch, `revalidate = 0` (always fresh).
- **Leaderboard**: RSC fetch with `revalidate = 300` and tag bust on recompute.

Use `revalidateTag()` from Inngest jobs after score recompute, so caches drop the moment a user's score changes.

## Error handling

- Server actions return `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. No throwing across the wire.
- Client renders friendly errors via Sonner.
- 404s and 500s use Next's `not-found.tsx` and `error.tsx` files, styled to match the design system. They are not afterthoughts.
- Inngest handles its own retries with exponential backoff.

## Forms

`react-hook-form` + `zod` resolver on the client, identical Zod schema validated on the server side of every server action. One schema, two consumers.

## Type safety

- Drizzle types flow through into server actions, then to client via the action's return type.
- Never `as any`. If a type is wrong, fix the source.
- `lib/types.ts` exports cross-cutting types (e.g., `Category`, `Outcome`, `Result<T, E>`).

## Performance

- Use `next/image` for all images including avatars.
- Use `next/font` for all fonts; do not link to Google Fonts in `<head>`.
- Avoid client-side JS for anything that can be a Server Component.
- Lighthouse target: 95+ on mobile for all primary routes.

## Accessibility

- Every interactive element keyboard-reachable.
- Visible focus rings always (use `--ring` token).
- Color contrast ≥ AA in both themes (verify on `signal-positive` and `signal-negative` in particular).
- Respect `prefers-reduced-motion`.
- Slider has aria-valuemin / max / now and keyboard arrow support.
