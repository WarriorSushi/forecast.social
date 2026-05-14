-- =====================================================================
-- Phase 1 — RLS, triggers, seed
--
-- This migration assumes 0000_low_menace has already created
-- public.users and public.categories. It then:
--   1. Enables RLS and writes Phase-1 policies (users, categories).
--   2. Creates a trigger that auto-provisions public.users on Supabase
--      auth sign-up.
--   3. Creates a generic updated_at touch trigger and wires it to users.
--   4. Seeds the four launch categories.
--
-- Idempotent: every statement uses IF NOT EXISTS / OR REPLACE / ON
-- CONFLICT, so the migration can be re-applied without harm.
-- =====================================================================

-- --------------------------------------------------------------------
-- 1. Row Level Security
-- --------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.categories enable row level security;

-- Users: anyone may read; only self may update; inserts happen only via
-- the auth trigger (security definer), so no INSERT policy is needed.
drop policy if exists "users readable" on public.users;
create policy "users readable" on public.users
  for select using (true);

drop policy if exists "users update self" on public.users;
create policy "users update self" on public.users
  for update using (auth.uid() = id);

-- Categories: anyone may read; writes only via service role.
drop policy if exists "categories readable" on public.categories;
create policy "categories readable" on public.categories
  for select using (true);

-- --------------------------------------------------------------------
-- 2. Auth user trigger — auto-create public.users on auth.users insert.
--
-- The temporary username is `user_<8-hex>` so the row is valid
-- immediately (passes the format check), and the onboarding flow
-- updates it to the user's chosen handle. display_name defaults to a
-- generic "Forecaster" until set.
-- --------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, display_name)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(new.raw_user_meta_data->>'name', 'Forecaster')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- --------------------------------------------------------------------
-- 3. Generic updated_at touch trigger
-- --------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------------------
-- 4. Seed categories — the four launch buckets from PRD.md §6
-- --------------------------------------------------------------------

insert into public.categories (slug, name, description, sort_order)
values
  ('tech-ai',     'Tech & AI',     'Model launches, product ships, IPOs.',         1),
  ('crypto',      'Crypto',        'Prices, protocol launches, regulation.',       2),
  ('sports',      'Sports',        'Game outcomes, season MVPs, championships.',   3),
  ('pop-culture', 'Pop Culture',   'Box office, awards, charts.',                  4)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;
