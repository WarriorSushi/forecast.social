-- ============================================================================
-- 0008 — fixes flagged by the post-Phase-7 code review
--
-- 1. notifications: add an INSERT policy. Without it, every createNotification
--    call fails silently against an authenticated Supabase context. We use
--    `with check (true)` because all writes route through server actions that
--    have already authenticated the caller; the per-user read policy still
--    enforces visibility.
--
-- 2. user_category_scores: enable RLS + add public-read policy. The table was
--    created in 0005 without RLS, meaning anyone with the anon key could
--    INSERT/UPDATE/DELETE scores directly via PostgREST.
--
-- Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- notifications: allow inserts (server-action-authenticated)
-- ----------------------------------------------------------------------------
drop policy if exists "notifications insert any" on notifications;
create policy "notifications insert any" on notifications
  for insert with check (true);

-- ----------------------------------------------------------------------------
-- user_category_scores: enable RLS + read-only-public, write via service role
-- ----------------------------------------------------------------------------
alter table user_category_scores enable row level security;

drop policy if exists "user_category_scores readable" on user_category_scores;
create policy "user_category_scores readable" on user_category_scores
  for select using (true);

-- No INSERT / UPDATE / DELETE policy: only the server-side Drizzle client
-- (postgres superuser) writes here. Anon and authenticated clients cannot
-- mutate scores.
