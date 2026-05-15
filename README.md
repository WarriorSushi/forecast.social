# forecast.social

The track-record social network for predictions. Make probabilistic calls on tech, sports, crypto, and pop culture. Your accuracy compounds into a permanent, public **Forecast Score**.

No wagering. No real money. Just reputation.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19.2)
- **Tailwind CSS v4** (CSS-first `@theme inline`)
- **Drizzle ORM** + **Supabase** (Postgres + Auth + Storage + Realtime)
- **Geist** (sans + mono) + **Instrument Serif** (the wordmark + hero sub-heading)
- **shadcn/ui** primitives, **motion v12** for animation, **sonner** for toasts
- **next/og** for share cards
- **@vercel/analytics** + **@vercel/speed-insights** for observability

Pinned versions live in `docs/TECH_STACK.md`. The design system is `docs/DESIGN.md`. The build plan that got us here is `docs/IMPLEMENTATION.md`.

## Run locally

```sh
pnpm install
cp .env.example .env.local
# Fill in .env.local with your Supabase project values

pnpm migrate          # apply Drizzle migrations
pnpm dev              # http://localhost:3000
```

You'll need a Supabase project (free tier works). See `docs/PRODUCTION.md` for which Supabase keys go where.

## Make yourself admin

After signing up via the UI:

```sh
pnpm tsx scripts/make-admin.ts your@email.com
```

Then visit `/admin/markets`, `/admin/proposals`, `/admin/invites`.

## Seed data

```sh
pnpm tsx scripts/seed-markets.ts          # 10 starter markets
pnpm tsx scripts/seed-more-markets.ts     # 15 more
pnpm tsx scripts/seed-test-predictions.ts # resolved test predictions for the admin
```

## Deploy

See `docs/PRODUCTION.md` for the full Vercel + Supabase production checklist.

## Documentation

| Doc | What |
|---|---|
| `docs/PRD.md` | Product spec — what we're building and why. |
| `docs/TECH_STACK.md` | Pinned dependencies. |
| `docs/DESIGN.md` | Design system. Non-negotiable on aesthetic. |
| `docs/ARCHITECTURE.md` | File structure, routing, data flow. |
| `docs/DATABASE.md` | Postgres schema, RLS, indexes. |
| `docs/SCORING.md` | The Forecast Score algorithm. |
| `docs/IMPLEMENTATION.md` | Phased build plan (v1). |
| `docs/V2.md` | v2 roadmap (proposals shipped, Inngest/email/API queued). |
| `docs/REVIEW.md` | Post-Phase-7 multi-agent audit + actions taken. |
| `docs/PRODUCTION.md` | Deployment checklist. |
| `docs/AGENTS.md` | Operating rules for Claude Code. |

## License

MIT. See `LICENSE`.
