-- ============================================================================
-- 0007 — RLS for follows, comments, comment_upvotes, notifications
--
-- Per DATABASE.md. follows are publicly readable; insertion gated to the
-- follower themselves. Comments are publicly readable; users author and
-- edit their own; admins or authors may delete. Upvotes likewise. Notifications
-- are private per-user.
--
-- Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- follows
-- ----------------------------------------------------------------------------
alter table follows enable row level security;

drop policy if exists "follows readable" on follows;
create policy "follows readable" on follows for select using (true);

drop policy if exists "follows insert self" on follows;
create policy "follows insert self" on follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "follows delete self" on follows;
create policy "follows delete self" on follows
  for delete using (auth.uid() = follower_id);

-- ----------------------------------------------------------------------------
-- comments
-- ----------------------------------------------------------------------------
alter table comments enable row level security;

drop policy if exists "comments readable" on comments;
create policy "comments readable" on comments for select using (true);

drop policy if exists "comments insert self" on comments;
create policy "comments insert self" on comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "comments update self" on comments;
create policy "comments update self" on comments
  for update using (auth.uid() = user_id);

drop policy if exists "comments delete self or admin" on comments;
create policy "comments delete self or admin" on comments
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

-- ----------------------------------------------------------------------------
-- comment_upvotes
-- ----------------------------------------------------------------------------
alter table comment_upvotes enable row level security;

drop policy if exists "upvotes readable" on comment_upvotes;
create policy "upvotes readable" on comment_upvotes for select using (true);

drop policy if exists "upvotes insert self" on comment_upvotes;
create policy "upvotes insert self" on comment_upvotes
  for insert with check (auth.uid() = user_id);

drop policy if exists "upvotes delete self" on comment_upvotes;
create policy "upvotes delete self" on comment_upvotes
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- comment upvote count trigger — keep comments.upvote_count in sync
-- ----------------------------------------------------------------------------
create or replace function public.recompute_comment_upvote_count()
returns trigger
language plpgsql
as $$
begin
  update comments
  set upvote_count = (
    select count(*) from comment_upvotes where comment_id = coalesce(new.comment_id, old.comment_id)
  )
  where id = coalesce(new.comment_id, old.comment_id);
  return null;
end;
$$;

drop trigger if exists comment_upvotes_recompute_insert on comment_upvotes;
create trigger comment_upvotes_recompute_insert
  after insert on comment_upvotes
  for each row execute function public.recompute_comment_upvote_count();

drop trigger if exists comment_upvotes_recompute_delete on comment_upvotes;
create trigger comment_upvotes_recompute_delete
  after delete on comment_upvotes
  for each row execute function public.recompute_comment_upvote_count();

-- ----------------------------------------------------------------------------
-- notifications — private per-user
-- ----------------------------------------------------------------------------
alter table notifications enable row level security;

drop policy if exists "notifications read self" on notifications;
create policy "notifications read self" on notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications update self" on notifications;
create policy "notifications update self" on notifications
  for update using (auth.uid() = user_id);
