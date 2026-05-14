# forecast.social — Documentation Set

This folder contains everything Claude Code needs to build forecast.social end-to-end.

## How to use

All canonical docs live in `/docs`. The repo root holds a thin `CLAUDE.md` that `@`-includes `docs/CLAUDE.md` so Claude Code auto-loads the full doc set:

```
forecast.social/
├── CLAUDE.md            ← thin pointer: `@docs/CLAUDE.md` (auto-loaded by Claude Code)
└── docs/
    ├── CLAUDE.md        ← canonical entry point. Read first.
    ├── AGENTS.md        ← operating rules for the AI agent
    ├── PRD.md
    ├── TECH_STACK.md
    ├── DESIGN.md
    ├── ARCHITECTURE.md
    ├── DATABASE.md
    ├── SCORING.md
    └── IMPLEMENTATION.md
```

### Required plugins

Before running Claude Code in this repo, install the plugins (one-time setup):

- **`context7`** — library docs MCP. Mandatory before writing non-trivial code against any pinned library.
- **`superpowers`** — development workflow skills (brainstorming, planning, TDD, verification, debugging).
- **`playwright`** — browser-automation MCP for manual smoke tests and checkpoint screenshots.
- **`vercel`** — deploy + logs + docs MCP for staging previews and checkpoint reports.

After installing, run `/reload-plugins` then `/mcp` to verify all servers connect.

Then run Claude Code in that repo. It will pick up `CLAUDE.md` automatically. The first message should simply be:

> Read all docs starting with CLAUDE.md, then begin Phase 0 from IMPLEMENTATION.md. Stop at the Phase 0 checkpoint and report back.

## Doc index

| File              | Purpose                                                        |
|-------------------|----------------------------------------------------------------|
| `CLAUDE.md`       | Entry point. Read first. Non-negotiables. Order to read docs.  |
| `AGENTS.md`       | How Claude Code should operate, commit, and report.            |
| `PRD.md`          | Product spec. What we are building, for whom, and why.         |
| `TECH_STACK.md`   | Pinned versions of every dependency, with rationale.           |
| `DESIGN.md`       | Design system: tokens, type, color, motion, components.        |
| `ARCHITECTURE.md` | File structure, data flow, auth pattern, server-vs-client.     |
| `DATABASE.md`     | Full Postgres schema, RLS policies, triggers, seed data.       |
| `SCORING.md`      | The Forecast Score algorithm, with reference TypeScript.       |
| `IMPLEMENTATION.md`| Phased build plan. Build in this order.                       |

## What this product is, in 30 seconds

A social network where reputation, not money, is the currency. Users predict real-world events as probabilities. Their track record builds into a permanent, public **Forecast Score**. Every correct call produces a shareable receipt. Halal by design, legal everywhere, addictive on purpose.

See `PRD.md` for the long version.
