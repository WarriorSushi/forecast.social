# CLAUDE.md — Read This First

You are building **forecast.social**, a track-record social network for predictions. This file is your map. Read every doc in `/docs` before writing code, and re-read them whenever you start a new feature.

> **Doc layout.** The canonical version of every doc — including this one — lives in `/docs`. The repo root holds a thin `CLAUDE.md` that `@`-includes `docs/CLAUDE.md` so Claude Code auto-loads the full doc set on session start.

## What this product is

A social network where **reputation, not money**, is the currency. Users make probabilistic predictions on real-world questions (tech launches, sports, crypto prices, pop culture). Their accuracy is scored permanently, publicly, and unfakeably. The killer artifact is the **Forecast Score** on every profile and the **share card** generated when a user is proven right.

It is not a betting site. There is no wagering. This must be reflected in every word of copy, every UI affordance, and every database constraint.

## How to use this doc set

Read in this order. Do not skip.

1. **`PRD.md`** — Product spec. What we are building and why. The source of truth for scope.
2. **`TECH_STACK.md`** — Exact versions of every dependency. Pinned. Do not upgrade without permission.
3. **`DESIGN.md`** — Design system: color tokens, typography, motion, components. The product must look premium in both light and dark mode. This doc is non-negotiable on aesthetic.
4. **`ARCHITECTURE.md`** — File structure, routing, data flow, auth pattern, server-vs-client boundaries.
5. **`DATABASE.md`** — Full Postgres schema, RLS policies, indexes, migrations.
6. **`SCORING.md`** — The Forecast Score algorithm. This is the heart of the product. Implement exactly as specified.
7. **`IMPLEMENTATION.md`** — Phased build plan. Build in this order. Ship each phase end-to-end before moving on.
8. **`AGENTS.md`** — Operating rules for you (Claude Code). Read every session.

## Non-negotiables

- **No betting, no wagering, no real money flowing between users.** Ever.
- **Probabilities, not yes/no.** Predictions are always 0–100%, not binary picks.
- **Predictions are locked.** A user can re-predict (adding to their history) but can never edit a past prediction. The receipt is the product.
- **Light and dark mode must both be beautiful.** Bold premium in both: cool neutral palette, Geist 700/800 display, indigo accent used sparingly. Light is near-white and airy; dark is a lifted neutral, not pure ink. See `DESIGN.md`. Never ship something that only looks good in dark.
- **Mobile-first.** Every screen designed for 390px before desktop.
- **Numbers are heroes.** Forecast Scores, probabilities, streaks — these are the brand. Treat them with typographic respect.
- **Server Components by default.** Drop to client only when interactivity demands it.
- **Type-safe end to end.** Drizzle schemas → tRPC-style server actions → typed client hooks.
- **Always consult tooling MCPs before writing non-trivial code.** See "Tooling MCPs" below. This is not optional.

## Tooling MCPs (mandatory)

The following plugin MCPs and skills are installed for this project. Use them — your training data is older than the pinned versions in `TECH_STACK.md`.

### `context7` — library docs (MCP)

Before writing or modifying any non-trivial code that uses an external library, fetch up-to-date docs with `context7`. Always.

- **Two-step call:** `mcp__plugin_context7_context7__resolve-library-id` → `mcp__plugin_context7_context7__query-docs`.
- **Mandatory for:** Next.js 16, React 19.2, Tailwind v4, shadcn/ui, Drizzle ORM, `@supabase/ssr`, `@supabase/supabase-js`, Inngest, `next-themes`, `motion`, `recharts`, `zod`, `react-hook-form`, `@upstash/ratelimit`, `resend`, `react-email`, `satori`/`@vercel/og`, `geist`.
- **Use even when you think you know.** Patch syntax changes between versions (App Router APIs, Tailwind v4 `@theme`, Drizzle migration commands, Supabase ssr cookie patterns) are exactly the kind of thing that drifts.
- **Skip only for:** pure business logic, your own code, generic programming concepts.

### `superpowers` — development workflow skills

Invoke via the Skill tool. Use them where they fit; they are not all required for every change.

- `superpowers:brainstorming` — **before** any creative work (new feature, new component, new behavior). Always run this first when starting a fresh feature.
- `superpowers:writing-plans` — once a spec is clear, before touching code on multi-step tasks.
- `superpowers:test-driven-development` — for `lib/scoring/` and any other module with an automated test (AGENTS.md item 10).
- `superpowers:systematic-debugging` — when something is broken; before proposing a fix.
- `superpowers:verification-before-completion` — before claiming any work is done, fixed, or passing. No "it should work" — run the check.
- `superpowers:executing-plans` / `:subagent-driven-development` — for executing a written plan, especially in parallel-safe chunks.
- `superpowers:requesting-code-review` / `:receiving-code-review` — at checkpoints and on review feedback.

### Other available MCPs

- **`playwright`** — automated browser smoke tests. Use for Phase 0 checkpoint screenshots (light/dark, mobile/desktop) and any visual regression check.
- **`vercel`** — deploy previews, runtime logs, deployment inspection. Use during checkpoints.

## Quality bar

This is a v1 that needs to look like a v3. The user has explicitly asked for a "highly polished, premium" feel. Compare your output to: Linear, Vercel dashboard, Arc browser, The Browser Company site, Cron, Raycast, The Athletic. If it doesn't feel like it belongs in that company, it isn't done.

## When you're stuck

- If a feature isn't in `PRD.md`, do not build it. Ask.
- If a dependency isn't in `TECH_STACK.md`, do not install it. Ask.
- If a design choice isn't in `DESIGN.md`, propose one referencing the design philosophy and wait for sign-off before applying it broadly.
- If you find an inconsistency between docs, stop and flag it.

## Start here

After reading all docs, your first action is `IMPLEMENTATION.md` → **Phase 0**. Do not skip ahead. Do not start with the auth flow. Start with the foundation: repo init, design tokens, font loading, theme switcher. Get the shell looking premium before any feature exists inside it.
