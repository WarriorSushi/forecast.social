-- ============================================================================
-- 0009 — indexes flagged by the post-Phase-7 architecture audit
--
-- All `IF NOT EXISTS` so re-runs are no-ops.
--   - follows.(follower_id, created_at desc) — feed Lane 1 joins on follower_id
--   - notifications partial idx where read_at is null — unread badge count
--   - predictions.(user_id, market_id, created_at desc) — user-centric
--     recompute path; existing (market, user, created) is market-first
--   - markets.(resolved_at, closes_at) — status filtering on feed + lists
-- ============================================================================

create index if not exists follows_follower_created_idx
  on follows (follower_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on notifications (user_id) where read_at is null;

create index if not exists predictions_user_market_created_idx
  on predictions (user_id, market_id, created_at desc);

create index if not exists markets_resolved_closes_idx
  on markets (resolved_at, closes_at);
