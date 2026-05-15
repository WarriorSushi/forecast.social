-- ============================================================================
-- 0011 — RLS + approval trigger for market_proposals
--
-- Policies:
--  - SELECT: a proposer can see their own; admins see everything; the
--    general public sees approved + rejected proposals (so the audit
--    log is transparent).
--  - INSERT: any authenticated user can propose; we don't gate this
--    at the DB level beyond auth.uid() = proposed_by because rate
--    limits live in the server action.
--  - UPDATE: admin-only (review actions).
--
-- Trigger on_proposal_approved: when status transitions to 'approved',
-- copy the proposal into markets with created_by = proposed_by, slug
-- pinned, and write the new market id back to approved_market_id.
--
-- Idempotent.
-- ============================================================================

alter table market_proposals enable row level security;

drop policy if exists "proposals self or public-resolved readable" on market_proposals;
create policy "proposals self or public-resolved readable" on market_proposals
  for select using (
    auth.uid() = proposed_by
    or status in ('approved', 'rejected')
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

drop policy if exists "proposals insert self" on market_proposals;
create policy "proposals insert self" on market_proposals
  for insert with check (auth.uid() = proposed_by);

drop policy if exists "proposals update admin" on market_proposals;
create policy "proposals update admin" on market_proposals
  for update using (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

-- touch_updated_at
drop trigger if exists market_proposals_touch_updated_at on market_proposals;
create trigger market_proposals_touch_updated_at
  before update on market_proposals
  for each row
  execute function touch_updated_at();

-- ----------------------------------------------------------------------------
-- on_proposal_approved — copy approved proposal into markets
--
-- We attribute created_by to the proposer, NOT the reviewing admin.
-- The slug is checked for collision; if taken we suffix a random tail.
-- ----------------------------------------------------------------------------
create or replace function public.on_proposal_approved()
returns trigger
language plpgsql
as $$
declare
  final_slug text;
  collision_count int;
  new_market_id uuid;
begin
  -- Only act on transitions INTO approved.
  if new.status <> 'approved' or new.status is null then
    return new;
  end if;
  if old.status = 'approved' and new.status = 'approved' then
    return new; -- no-op on repeat updates that leave status as approved
  end if;

  -- Don't copy twice if approved_market_id is already set.
  if new.approved_market_id is not null then
    return new;
  end if;

  final_slug := new.slug;
  select count(*) into collision_count from markets where slug = final_slug;
  if collision_count > 0 then
    final_slug := final_slug || '-' || substr(md5(random()::text), 1, 5);
  end if;

  insert into markets (
    slug,
    title,
    description,
    category_slug,
    created_by,
    resolution_source,
    closes_at,
    resolves_at
  )
  values (
    final_slug,
    new.title,
    new.description,
    new.category_slug,
    new.proposed_by,
    new.resolution_source,
    new.closes_at,
    new.resolves_at
  )
  returning id into new_market_id;

  new.approved_market_id := new_market_id;
  return new;
end;
$$;

drop trigger if exists proposals_on_approve on market_proposals;
create trigger proposals_on_approve
  before update on market_proposals
  for each row
  when (new.status = 'approved' and (old.status is distinct from 'approved'))
  execute function public.on_proposal_approved();
