-- ============================================================================
-- 0012 — enable Supabase Realtime on the markets table
--
-- Subscribers can listen for postgres_changes on the markets table to get
-- live consensus + prediction_count updates. The recompute_market_consensus
-- trigger already writes those fields after every insert.
--
-- Idempotent: ALTER PUBLICATION ... ADD TABLE is wrapped in a DO block so
-- re-running doesn't error.
-- ============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'markets'
  ) then
    alter publication supabase_realtime add table markets;
  end if;
end $$;
