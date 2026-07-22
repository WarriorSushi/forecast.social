-- ============================================================================
-- 0019 — early-resolution integrity
--
-- A market may be resolved before its scheduled close. In that case the
-- actual resolution timestamp becomes the hard evidence boundary. Exclude
-- legacy rows inserted after that moment from scores, aggregates, and public
-- Data API reads while preserving the underlying audit rows.
-- ============================================================================

update public.predictions as p
set brier = null,
    was_correct = null,
    resolved_at = null
from public.markets as m
where p.market_id = m.id
  and (
    p.created_at >= m.closes_at
    or (m.resolved_at is not null and p.created_at >= m.resolved_at)
  );
update public.markets as m
set consensus_probability = (
      select avg(latest.probability)::real
      from (
        select distinct on (p.user_id) p.probability
        from public.predictions as p
        where p.market_id = m.id
          and p.created_at < m.closes_at
          and (m.resolved_at is null or p.created_at < m.resolved_at)
        order by p.user_id, p.created_at desc
      ) as latest
    ),
    prediction_count = (
      select count(*)::int
      from public.predictions as p
      where p.market_id = m.id
        and p.created_at < m.closes_at
        and (m.resolved_at is null or p.created_at < m.resolved_at)
    ),
    updated_at = now();

update public.users as u
set total_predictions = (
      select count(*)::int
      from public.predictions as p
      join public.markets as m on m.id = p.market_id
      where p.user_id = u.id
        and p.created_at < m.closes_at
        and (m.resolved_at is null or p.created_at < m.resolved_at)
    ),
    updated_at = now();

drop policy if exists "predictions readable" on public.predictions;
create policy "predictions readable" on public.predictions
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.markets as m
      where m.id = predictions.market_id
        and predictions.created_at < m.closes_at
        and (m.resolved_at is null or predictions.created_at < m.resolved_at)
    )
  );
