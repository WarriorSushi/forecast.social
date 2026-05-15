-- ============================================================================
-- 0014 — RLS for invite_codes
--
-- Admins read/write everything. The general public is opaque — there's
-- no SELECT-by-anonymous policy, so PostgREST will return 0 rows for
-- non-admin clients. Code validation at signup runs through the server
-- action (Drizzle superuser), which bypasses RLS.
--
-- Idempotent.
-- ============================================================================

alter table invite_codes enable row level security;

drop policy if exists "invite_codes admin read" on invite_codes;
create policy "invite_codes admin read" on invite_codes
  for select using (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

drop policy if exists "invite_codes admin insert" on invite_codes;
create policy "invite_codes admin insert" on invite_codes
  for insert with check (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

-- No UPDATE / DELETE policy: writes flow through the server action with
-- the postgres superuser connection.
