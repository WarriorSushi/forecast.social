-- ============================================================================
-- 0016 — P0 security hardening
--
-- The application uses a privileged server-side Postgres connection for every
-- table mutation. Browser Supabase clients are limited to Realtime reads and
-- avatar Storage operations. Lock the Data API to that architecture so a
-- signed-in user cannot bypass server actions, Zod validation, rate limits, or
-- admin checks by calling PostgREST directly.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Data API grants: public product data is read-only. Private workflow data
--    is not exposed at all. Server-side Postgres and service_role retain their
--    existing access.
-- --------------------------------------------------------------------------
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;

grant select on table
  public.categories,
  public.users,
  public.markets,
  public.market_resolutions,
  public.predictions,
  public.user_category_scores,
  public.follows,
  public.comments,
  public.comment_upvotes
to anon, authenticated;

-- New public-schema objects are private until a migration grants the exact
-- privileges they need.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Trigger helpers are internal implementation details, not public RPCs.
revoke execute on all functions in schema public from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Remove browser mutation policies. These writes all flow through typed,
--    authenticated server actions using the server-side database connection.
-- --------------------------------------------------------------------------
drop policy if exists "users update self" on public.users;

drop policy if exists "markets insert admin" on public.markets;
drop policy if exists "markets update admin" on public.markets;
drop policy if exists "market_resolutions insert admin" on public.market_resolutions;

drop policy if exists "predictions insert self" on public.predictions;

drop policy if exists "follows insert self" on public.follows;
drop policy if exists "follows delete self" on public.follows;

drop policy if exists "comments insert self" on public.comments;
drop policy if exists "comments update self" on public.comments;
drop policy if exists "comments delete self or admin" on public.comments;

drop policy if exists "upvotes insert self" on public.comment_upvotes;
drop policy if exists "upvotes delete self" on public.comment_upvotes;

drop policy if exists "notifications insert any" on public.notifications;
drop policy if exists "notifications update self" on public.notifications;

drop policy if exists "proposals insert self" on public.market_proposals;
drop policy if exists "proposals update admin" on public.market_proposals;

drop policy if exists "invite_codes admin insert" on public.invite_codes;

-- --------------------------------------------------------------------------
-- 3. Recreate read policies with explicit roles. Private tables retain precise
--    policies as defense in depth, even though they have no Data API grants.
-- --------------------------------------------------------------------------
drop policy if exists "categories readable" on public.categories;
create policy "categories readable" on public.categories
  for select to anon, authenticated using (true);

drop policy if exists "users readable" on public.users;
create policy "users readable" on public.users
  for select to anon, authenticated using (true);

drop policy if exists "markets readable" on public.markets;
create policy "markets readable" on public.markets
  for select to anon, authenticated using (true);

drop policy if exists "market_resolutions readable" on public.market_resolutions;
create policy "market_resolutions readable" on public.market_resolutions
  for select to anon, authenticated using (true);

drop policy if exists "predictions readable" on public.predictions;
create policy "predictions readable" on public.predictions
  for select to anon, authenticated using (true);

drop policy if exists "user_category_scores readable" on public.user_category_scores;
create policy "user_category_scores readable" on public.user_category_scores
  for select to anon, authenticated using (true);

drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows
  for select to anon, authenticated using (true);

drop policy if exists "comments readable" on public.comments;
create policy "comments readable" on public.comments
  for select to anon, authenticated using (true);

drop policy if exists "upvotes readable" on public.comment_upvotes;
create policy "upvotes readable" on public.comment_upvotes
  for select to anon, authenticated using (true);

drop policy if exists "notifications read self" on public.notifications;
create policy "notifications read self" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "proposals self or public-resolved readable" on public.market_proposals;
create policy "proposals self or public-resolved readable" on public.market_proposals
  for select to anon, authenticated
  using (
    status in ('approved', 'rejected')
    or (select auth.uid()) = proposed_by
    or exists (
      select 1 from public.users
      where users.id = (select auth.uid()) and users.is_admin = true
    )
  );

drop policy if exists "invite_codes admin read" on public.invite_codes;
create policy "invite_codes admin read" on public.invite_codes
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = (select auth.uid()) and users.is_admin = true
    )
  );

-- --------------------------------------------------------------------------
-- 4. The consensus snapshot is evidence. Always derive it in the database;
--    never respect a caller-supplied value.
-- --------------------------------------------------------------------------
create or replace function public.snapshot_consensus_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_consensus real;
begin
  select consensus_probability into current_consensus
  from public.markets
  where id = new.market_id;

  new.consensus_at_time := current_consensus;
  return new;
end;
$$;

revoke execute on function public.snapshot_consensus_before_insert()
  from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- 5. Storage remains the only browser write path. Scope policies explicitly
--    to roles and prevent an UPDATE from moving an object into another user's
--    folder.
-- --------------------------------------------------------------------------
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars self insert" on storage.objects;
create policy "avatars self insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars self update" on storage.objects;
create policy "avatars self update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars self delete" on storage.objects;
create policy "avatars self delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
