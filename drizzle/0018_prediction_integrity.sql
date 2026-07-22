-- ============================================================================
-- 0018 — prediction integrity
--
-- A prediction is evidence only when the database accepted it before the
-- market closed and before an outcome existed. Enforce that invariant at the
-- write boundary, hide legacy late rows from the public Data API, and repair
-- derived aggregates so historical test data cannot affect product truth.
-- ============================================================================

create or replace function public.snapshot_consensus_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_consensus real;
  market_closes_at timestamptz;
  market_resolved_at timestamptz;
begin
  select consensus_probability, closes_at, resolved_at
    into current_consensus, market_closes_at, market_resolved_at
  from public.markets
  where id = new.market_id;

  if not found then
    raise exception 'Market not found.' using errcode = '23503';
  end if;

  -- The timestamp is evidence, so the database owns it. Callers cannot
  -- backdate a prediction through a privileged script or direct connection.
  new.created_at := statement_timestamp();

  if market_resolved_at is not null then
    raise exception 'This market is already resolved.' using errcode = '23514';
  end if;

  if market_closes_at <= new.created_at then
    raise exception 'This market has closed.' using errcode = '23514';
  end if;

  new.consensus_at_time := current_consensus;
  return new;
end;
$$;

revoke execute on function public.snapshot_consensus_before_insert()
  from public, anon, authenticated;

-- Legacy direct-insert test rows that landed at/after close are not valid
-- public calls. Preserve the rows for auditability, but remove score stamps.
update public.predictions as p
set brier = null,
    was_correct = null,
    resolved_at = null
from public.markets as m
where p.market_id = m.id
  and p.created_at >= m.closes_at;

-- Rebuild every market's public counters from valid calls only.
update public.markets as m
set consensus_probability = (
      select avg(latest.probability)::real
      from (
        select distinct on (p.user_id) p.probability
        from public.predictions as p
        where p.market_id = m.id
          and p.created_at < m.closes_at
        order by p.user_id, p.created_at desc
      ) as latest
    ),
    prediction_count = (
      select count(*)::int
      from public.predictions as p
      where p.market_id = m.id
        and p.created_at < m.closes_at
    ),
    updated_at = now();

update public.users as u
set total_predictions = (
      select count(*)::int
      from public.predictions as p
      join public.markets as m on m.id = p.market_id
      where p.user_id = u.id
        and p.created_at < m.closes_at
    ),
    updated_at = now();

-- Public Data API reads follow the same integrity rule. The application uses
-- a direct Postgres connection, so its queries also filter explicitly.
drop policy if exists "predictions readable" on public.predictions;
create policy "predictions readable" on public.predictions
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.markets as m
      where m.id = predictions.market_id
        and predictions.created_at < m.closes_at
    )
  );
