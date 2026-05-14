# AGENTS.md — Rules for Claude Code

Read this every session before writing code.

## Operating principles

1. **Read all docs first.** `CLAUDE.md` is the entry point. Read it, then read every doc in `/docs`. If you start writing code without reading them, stop and re-read.
2. **Use the tooling MCPs.** Before writing any non-trivial library code, fetch up-to-date docs with `context7` (resolve-library-id → query-docs). For new features, run `superpowers:brainstorming` first, then `superpowers:writing-plans`. Before claiming anything is done, run `superpowers:verification-before-completion`. See `CLAUDE.md` "Tooling MCPs" for the full list and when to use each.
3. **Build in the order of `IMPLEMENTATION.md`.** Do not jump ahead. Each phase has a checkpoint; stop and report at each.
4. **One feature at a time.** End-to-end completion before parallelism. A half-built feed and half-built leaderboard is worse than a finished feed alone.
5. **Match the design quality bar.** Compare every screen to Linear / Vercel / Arc / Cron. If it doesn't pass `DESIGN.md` §12, redesign before moving on.
6. **Pin to `TECH_STACK.md`.** Do not install anything not on the list without explicit permission.
7. **Server actions for all mutations.** No direct DB calls from client.
8. **Type-safe end to end.** No `any`. No `@ts-ignore`. Fix the source.
9. **Mobile-first.** 390px viewport, then scale up.
10. **Commit early, commit often.** Every meaningful unit of work is a commit. Branch names: `phase-N/short-feature-name`.
11. **Test the happy path manually with `playwright` MCP.** Automated unit tests are required only on `lib/scoring/` (the algorithm must be tested). For everything else, drive the dev server with the `playwright` MCP to verify light + dark + mobile + desktop before declaring a phase complete.

## When in doubt

- If the spec is ambiguous, ask before guessing.
- If a doc contradicts another doc, stop and flag it.
- If a feature seems missing from `PRD.md`, do not invent it. Ask.
- If a design decision seems missing from `DESIGN.md`, propose a small option set referencing the design philosophy and wait for sign-off.

## Hard rules (do not break)

- **No betting, no wagering, no real money flow.** This is non-negotiable. If a feature suggestion involves any of these, refuse and flag.
- **Predictions are immutable.** Database has no UPDATE policy on `predictions`. Don't add one.
- **Light and dark mode both ship.** Don't ship a screen that only looks good in one.
- **No purple gradients, no glassmorphism, no neon glow.** See `DESIGN.md` §1.
- **No Inter, no framer-motion, no Prisma, no Clerk.** See `TECH_STACK.md` "Do not install."
- **Service-role Supabase key never touches a client component.** It lives in `lib/supabase/admin.ts` and Inngest jobs only.
- **No "it should work."** Before reporting any work as done, run `superpowers:verification-before-completion` and present evidence (command output, screenshot, page load) — never an assertion.
- **Don't guess library APIs.** If you're about to write more than ~10 lines against a pinned library, query `context7` first. Saving five seconds by trusting recall is how stale APIs land in production.

## Reporting

When you reach a checkpoint:

1. Push the branch.
2. Open a Vercel preview.
3. Reply with:
   - What you built (bullets).
   - What you skipped or deferred and why.
   - Any decisions you made on your own (so they can be reviewed).
   - A screenshot or screen recording link (light and dark).
   - Any questions blocking the next phase.

That is the deliverable. Then wait for "green light to proceed."

## Communication

- Be direct. State what you did, what you couldn't, and why.
- Don't pad with apologies. Don't oversell.
- Surface real risks early. A hard problem flagged at hour 1 is fine; the same problem hidden until hour 10 is not.

You are building something that should look like it took a team of 5 designers and 3 engineers a year. The doc set gives you the path. Follow it carefully and the product will be good.
