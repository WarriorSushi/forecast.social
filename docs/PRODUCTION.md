# PRODUCTION.md — Deployment checklist

Concrete steps to get forecast.social live on Vercel. Everything that doesn't require a click-through-on-a-website is already in the code.

## 1. Vercel project setup

1. Push the repo to GitHub (already done — `WarriorSushi/forecast.social`).
2. In Vercel, create a new project. Import from GitHub. Framework preset: **Next.js**.
3. Root directory: leave as the repo root.
4. Build command: `pnpm build` (auto-detected from package.json).
5. Install command: `pnpm install` (auto-detected).
6. Output directory: leave default (`.next`).

## 2. Environment variables (Vercel → Settings → Environment Variables)

Set **all** of these for the Production environment. Mirror to Preview if you want preview deploys against the same Supabase.

| Name | Value | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vxhbcsjjmkdhsrjfoawg.supabase.co` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` | Supabase → Project Settings → API → anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Supabase → Project Settings → API → service_role |
| `DATABASE_URL` | **Use the pooled URL** — see below | Supabase → Project Settings → Database → Connection string → URI (**Transaction mode pooler**, port 6543) |
| `NEXT_PUBLIC_SITE_URL` | `https://forecast.social` | The production domain you connect in step 4 |
| `INVITE_CODES_REQUIRED` | `"true"` for the launch ramp, `"false"` to open signups | Your call |
| `CRON_SECRET` | Random secret, at least 16 characters | Generate once; Vercel sends it as the cron bearer token |

**Critical: `DATABASE_URL` in production.** Use the **transaction-mode pooler** URL (`...pooler.supabase.co:6543`), NOT the direct connection (`db....supabase.co:5432`). Vercel's serverless functions spawn many short-lived connections; the direct port exhausts in seconds at any traffic.

The migration script (`pnpm migrate`) still wants the direct connection for `CREATE` operations — set that in your local `.env.local` only, keep the pooler URL in Vercel.

## 3. Run migrations against the cloud DB

If your local has been migrating all along, this is already done. To confirm:

```
pnpm migrate
```

Should print `✓ migrations applied`. If you set up a fresh Supabase project, this is how you bootstrap the schema.

## 4. Domain + DNS

1. Vercel → Settings → Domains → add `forecast.social` and `www.forecast.social`.
2. Update DNS at your registrar to point to Vercel (Vercel will tell you the exact A / CNAME records).
3. After DNS propagates (usually minutes), Vercel auto-issues a Let's Encrypt cert.

## 5. Supabase production tightening

In the Supabase dashboard:

1. **Auth → URL Configuration**: set site URL to `https://forecast.social`. Add `https://forecast.social/auth/callback` to the redirect allowlist.
2. **Auth → Providers → Email**: turn **Confirm email** back ON for production. (It was disabled in Phase 1 for fast dev testing.)
3. **Auth → Rate limits**: tighten the signup rate limit if you're not using invite codes.
4. **Storage → avatars bucket**: confirm it's marked Public. The migration creates it correctly; just verify.
5. **Database → Replication**: confirm the `supabase_realtime` publication includes the `markets` table (migration 0012 added it).
6. **Database → Indexes**: spot-check that the 0009 indexes are present — `psql ... -c "\di"` or via the Database UI.

## 6. Promote the first admin

After deploying, sign up with the email you want to use as admin. Then run **locally** (against the production DB by exporting the production DATABASE_URL):

```
pnpm tsx scripts/make-admin.ts your@email.com
```

That user can now see /admin/markets, /admin/proposals, and /admin/invites.

## 7. Generate the first wave of invite codes

Sign in as the admin, go to `/admin/invites`, generate 100-200 codes for the first wave.

If `INVITE_CODES_REQUIRED=true`, hand those codes out. Otherwise signups are open.

## 8. Seed the first batch of markets

If you didn't already, run:

```
pnpm tsx scripts/seed-markets.ts
pnpm tsx scripts/seed-more-markets.ts
```

These will skip slugs that already exist, so they're safe to re-run.

## 9. Post-deploy smoke test

After the first production deploy:

- Visit `/` — landing page, full layout.
- Visit `/api/health` — should return JSON with `"status": "ok"` and `"db": "ok"`.
- Sign in. Submit a prediction. Watch the consensus live-update.
- Resolve a market as admin. Check that scoring updates the profile.
- Confirm the Cron Jobs page lists `/api/cron/recompute-scores` at `0 3 * * *`.
- Open `/api/share/market/<slug>` — should download a 1080×1080 PNG.
- Run a Lighthouse check on `/`. Target: Performance ≥ 90, Accessibility ≥ 95, SEO 100.

## 10. Things to wire up later (not blocking launch)

Tracked in `docs/V2.md`:

- **V2.1 Inngest pipeline** — when a market gets a few thousand predictors, the synchronous recompute will time out. Set up Inngest (`INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in Vercel) and move `recomputeUsersForMarket` to a function.
- **V2.4 Resend transactional email** — welcome + market-resolved digest. Needs `RESEND_API_KEY` and a verified domain.
- **V2.6 Upstash rate limit** — current rate limiter is in-process; swap to Upstash Redis when you have ≥ 2 Vercel function workers concurrent.

## Known gaps the multi-agent audit flagged (deferred to v2)

See `docs/REVIEW.md` for the full audit; in short:

- Resolution and nightly recomputation now batch prediction scoring writes and bound user-level concurrency. Inngest remains the high-scale path when individual markets reach thousands of forecasters.
- `completeOnboarding` has a TOCTOU race on username uniqueness; the DB UNIQUE constraint catches it, so the worst case is an ugly error message. Cosmetic fix in V2.0 follow-up.
- Feed page reads 6 queries with no caching. Acceptable at current volume; revisit with V2.5 ranker.

## You're done

If `pnpm migrate` is green, env vars are set, and the domain is attached, you can deploy and the app will work. The rest of this doc is operational hygiene.
