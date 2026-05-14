-- ============================================================================
-- 0003 — RLS for markets + market_resolutions (Phase 2)
--
-- DATABASE.md "Row Level Security" section. Markets are publicly readable;
-- insert/update gated on the actor's is_admin flag. market_resolutions is
-- also admin-only.
--
-- Idempotent. Re-running this against an environment that already has the
-- policies is a no-op.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- markets
-- ----------------------------------------------------------------------------
alter table markets enable row level security;

drop policy if exists "markets readable" on markets;
create policy "markets readable" on markets
  for select using (true);

drop policy if exists "markets insert admin" on markets;
create policy "markets insert admin" on markets
  for insert with check (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

drop policy if exists "markets update admin" on markets;
create policy "markets update admin" on markets
  for update using (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

-- No DELETE policy: markets are not hard-deleted. Soft-delete via outcome=invalid.

-- ----------------------------------------------------------------------------
-- market_resolutions
-- ----------------------------------------------------------------------------
alter table market_resolutions enable row level security;

drop policy if exists "market_resolutions readable" on market_resolutions;
create policy "market_resolutions readable" on market_resolutions
  for select using (true);

drop policy if exists "market_resolutions insert admin" on market_resolutions;
create policy "market_resolutions insert admin" on market_resolutions
  for insert with check (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

-- ----------------------------------------------------------------------------
-- touch_updated_at trigger on markets (mirrors users)
-- ----------------------------------------------------------------------------
drop trigger if exists markets_touch_updated_at on markets;
create trigger markets_touch_updated_at
  before update on markets
  for each row
  execute function touch_updated_at();
