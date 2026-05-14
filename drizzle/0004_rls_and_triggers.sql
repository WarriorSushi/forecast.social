-- ============================================================================
-- 0004 — RLS + triggers for markets, market_resolutions, predictions
--
-- Markets and market_resolutions policies (from Phase 2 spec; the original
-- 0003_markets_rls.sql was never journaled, so its contents land here).
--
-- Predictions:
--   - RLS: publicly readable; users can insert their own predictions only on
--     open, unresolved markets (per DATABASE.md). No UPDATE or DELETE policy.
--   - on_prediction_inserted: BEFORE INSERT — snapshots the market's
--     consensus_probability onto the new row's consensus_at_time, so each
--     prediction permanently records what the crowd believed at submission.
--   - recompute_market_consensus: AFTER INSERT — recomputes the market's
--     consensus_probability as the average of each user's latest call, and
--     refreshes prediction_count. Also bumps users.total_predictions.
--
-- Idempotent; safe to re-run.
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

-- touch_updated_at trigger on markets (matches users)
drop trigger if exists markets_touch_updated_at on markets;
create trigger markets_touch_updated_at
  before update on markets
  for each row
  execute function touch_updated_at();

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
-- predictions
-- ----------------------------------------------------------------------------
alter table predictions enable row level security;

drop policy if exists "predictions readable" on predictions;
create policy "predictions readable" on predictions
  for select using (true);

drop policy if exists "predictions insert self" on predictions;
create policy "predictions insert self" on predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from markets m
      where m.id = market_id
      and m.resolved_at is null
      and m.closes_at > now()
    )
  );

-- No UPDATE policy: predictions are immutable.
-- No DELETE policy: predictions are immutable.

-- ----------------------------------------------------------------------------
-- on_prediction_inserted — snapshots consensus before the row is committed.
-- ----------------------------------------------------------------------------
create or replace function public.snapshot_consensus_before_insert()
returns trigger
language plpgsql
as $$
declare
  current_consensus real;
begin
  select consensus_probability into current_consensus
  from markets
  where id = new.market_id;

  -- If the column was passed in explicitly (e.g. by an admin tool), respect it.
  if new.consensus_at_time is null then
    new.consensus_at_time := current_consensus;
  end if;

  return new;
end;
$$;

drop trigger if exists predictions_snapshot_consensus on predictions;
create trigger predictions_snapshot_consensus
  before insert on predictions
  for each row
  execute function public.snapshot_consensus_before_insert();

-- ----------------------------------------------------------------------------
-- recompute_market_consensus — AFTER INSERT, refreshes consensus_probability,
-- prediction_count on markets, and bumps users.total_predictions.
-- ----------------------------------------------------------------------------
create or replace function public.recompute_market_consensus()
returns trigger
language plpgsql
as $$
declare
  new_consensus real;
  new_count int;
begin
  -- Average of each user's most recent prediction on this market.
  with latest_per_user as (
    select distinct on (user_id) probability
    from predictions
    where market_id = new.market_id
    order by user_id, created_at desc
  )
  select avg(probability)::real into new_consensus
  from latest_per_user;

  select count(*) into new_count
  from predictions
  where market_id = new.market_id;

  update markets
  set consensus_probability = new_consensus,
      prediction_count = new_count,
      updated_at = now()
  where id = new.market_id;

  -- Bump the user's lifetime prediction count.
  update users
  set total_predictions = total_predictions + 1,
      updated_at = now()
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists predictions_recompute_consensus on predictions;
create trigger predictions_recompute_consensus
  after insert on predictions
  for each row
  execute function public.recompute_market_consensus();
