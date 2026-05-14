# TECH_STACK.md — Pinned dependencies and rationale

Stack as of **May 2026**. Do not upgrade major versions without explicit permission. Patch and minor versions inside the pinned major are fine.

## Runtime

| Tool        | Version       | Notes                                                   |
|-------------|---------------|---------------------------------------------------------|
| Node.js     | `20.9+` LTS   | Minimum for Next.js 16.                                 |
| pnpm        | `9.x`         | Preferred. npm/yarn work but pnpm is default.           |

## Core framework

| Package      | Version    | Why                                                        |
|--------------|------------|------------------------------------------------------------|
| `next`       | `16.2.x`   | App Router, Turbopack default, React Compiler stable.      |
| `react`      | `19.2.x`   | Required by Next 16. View Transitions, Activity, useEffectEvent.|
| `react-dom`  | `19.2.x`   |                                                            |
| `typescript` | `5.x` latest | Strict mode on. No `any`.                                |

Bootstrap with: `pnpm create next-app@latest forecast-social --yes`. This gives you TS, Tailwind, ESLint, App Router, Turbopack, the `@/*` import alias, and an `AGENTS.md` file. Keep all of those; rename / replace `AGENTS.md` with ours.

## Styling

| Package                 | Version   | Why                                                                 |
|-------------------------|-----------|---------------------------------------------------------------------|
| `tailwindcss`           | `4.x`     | CSS-first config via `@theme`. No `tailwind.config.js`.             |
| `@tailwindcss/postcss`  | `4.x`     | Build plugin.                                                       |
| `tw-animate-css`        | latest    | Replaces deprecated `tailwindcss-animate`. shadcn now ships with this. |
| `class-variance-authority` | latest | Variant API for components.                                         |
| `clsx`, `tailwind-merge` | latest   | The standard `cn()` helper.                                         |
| `next-themes`           | latest    | Class-based `dark` toggle, system preference, no FOUC.              |

Color model: **OKLCH** for all design tokens. Better gamut, better perceptual uniformity. shadcn now ships OKLCH defaults — we override with ours from `DESIGN.md`.

## Components

| Package        | Version | Why                                                                              |
|----------------|---------|----------------------------------------------------------------------------------|
| `shadcn/ui`    | latest  | CLI-installed primitives, owned in `components/ui`. Base style: `new-york`.      |
| `radix-ui/*`   | latest  | Underlying primitives (shadcn pulls these in per-component).                     |
| `lucide-react` | latest  | Icon set. Don't mix in other icon libraries.                                     |
| `sonner`       | latest  | Toasts (shadcn deprecated their old toast in favor of sonner).                   |

**Initialize shadcn with Tailwind v4:** `pnpm dlx shadcn@latest init`. Choose `new-york` style, base color `neutral`, CSS variables yes, RSC yes.

## Database & ORM

| Package                | Version | Why                                                                     |
|------------------------|---------|-------------------------------------------------------------------------|
| `@supabase/supabase-js`| latest  | Postgres + Storage + Realtime.                                          |
| `@supabase/ssr`        | latest  | Cookie-based SSR auth for App Router. Use this, not the old auth-helpers.|
| `drizzle-orm`          | latest  | Lightweight, type-safe, SQL-first. Better than Prisma for this stack.   |
| `drizzle-kit`          | latest  | Migrations, push, studio.                                               |
| `postgres`             | latest  | The driver Drizzle uses with Supabase Postgres.                         |

We use **Supabase Postgres for data and Supabase Auth for sessions.** Drizzle owns the schema; we author it in TypeScript and push migrations through `drizzle-kit`. RLS policies are authored as raw SQL migrations alongside.

## Auth

**Supabase Auth.** Not Clerk. Reasons:

- Single stack (auth + DB + storage on one platform = one bill, one mental model).
- Row Level Security ties authorization to the database, not to middleware.
- Free up to 50,000 MAUs vs Clerk's 10,000.
- App Router support via `@supabase/ssr` is solid in 2026.
- We don't need Clerk's pre-built UI; our design language is too specific.

Sign-in methods at launch: **Email magic link + Google OAuth + Apple OAuth**.

## Background jobs

| Package    | Version | Why                                                                  |
|------------|---------|----------------------------------------------------------------------|
| `inngest`  | latest  | Durable workflows for market resolution, score recomputation, notifications. |
| `@inngest/next` | latest | Next.js handler.                                                |

Use Inngest for anything that must complete reliably and may take >1s: resolving a market, recomputing scores after resolution, generating share-card images, sending notification batches.

## Realtime

Supabase Realtime for live consensus probability updates on a market page. Subscribe to inserts on the `predictions` table filtered by `market_id`. Don't reach for Pusher / Ably — we already have it.

## Email

| Package    | Version | Why                                                            |
|------------|---------|----------------------------------------------------------------|
| `resend`   | latest  | Transactional emails. Modern API, free tier covers launch.     |
| `react-email`| latest| Author email templates as React components.                    |

Use for: welcome, market resolution notifications, weekly digest.

## Rate limiting

| Package                  | Version | Why                                            |
|--------------------------|---------|------------------------------------------------|
| `@upstash/ratelimit`     | latest  | Sliding-window limiter, serverless-friendly.   |
| `@upstash/redis`         | latest  | Edge Redis.                                    |

Limit: 60 predictions/min/user, 10 comments/min/user, 5 follows/min/user. Tune from logs.

## Motion

| Package | Version | Why                                                                    |
|---------|---------|------------------------------------------------------------------------|
| `motion`| latest  | The successor to `framer-motion`. Tree-shakes better. We use it sparingly.|

Use only for: count-up number animations on Forecast Score, share-card reveal, page transitions on the market page (with React 19.2 View Transitions where possible).

## Charts

| Package    | Version | Why                                                       |
|------------|---------|-----------------------------------------------------------|
| `recharts` | latest  | Probability-over-time graphs, sparklines, category radar. |

If recharts feels heavy for a sparkline, hand-roll an inline SVG. Don't add a second chart library.

## Forms & validation

| Package          | Version | Why                                                  |
|------------------|---------|------------------------------------------------------|
| `zod`            | `3.x`   | Schema validation everywhere (server actions, env).  |
| `react-hook-form`| latest  | Forms.                                               |
| `@hookform/resolvers` | latest | Zod adapter.                                    |

## Dev tooling

| Package      | Version | Why                                            |
|--------------|---------|------------------------------------------------|
| `eslint`     | latest  | Comes with Next.                               |
| `prettier`   | latest  | Format on save.                                |
| `@types/*`   | latest  | All type packages.                             |

## Hosting

- **App:** Vercel.
- **Postgres + Auth + Storage:** Supabase (Free tier or Pro depending on growth).
- **Redis:** Upstash (free tier).
- **Inngest:** Inngest cloud (free tier covers launch).
- **Email:** Resend (free tier).
- **Domain:** `forecast.social` already owned.

## Fonts

Loaded via `next/font/google` (zero-CLS, self-hosted automatically).

| Role      | Font               | Notes                                                   |
|-----------|--------------------|---------------------------------------------------------|
| Display   | **Instrument Serif** | Editorial, slightly italic-leaning. Big hero numbers and headlines. |
| Body      | **Geist**            | Modern grotesque. Replaces Inter. Reads cleaner.        |
| Numeric / Mono | **Geist Mono**  | Tickers, scores, percentages, timestamps.               |

All three are free and on Google Fonts (or via `geist` package for Geist Sans/Mono). Do not substitute. See `DESIGN.md` for usage rules.

## Env vars

Required at runtime, validated by `zod` in `lib/env.ts`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL                    # Drizzle postgres connection
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL
```

## Do not install

- **Inter.** Use Geist.
- **framer-motion.** Use `motion` (its successor).
- **Prisma.** We use Drizzle.
- **NextAuth / Auth.js.** We use Supabase Auth.
- **Chakra / Mantine / MUI.** We use shadcn primitives.
- **A second icon library.** Lucide only.
- **A second chart library.** Recharts only.
- **localStorage-based state managers.** Server is the source of truth.

If you think you need something not on this list, ask first.
