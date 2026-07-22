-- Fast public market discovery as the catalog grows. Trigram GIN indexes
-- support contains-search across both question and resolution criteria; the
-- partial B-tree keeps the dominant open-market sort small.
create extension if not exists pg_trgm with schema extensions;

create index if not exists markets_title_trgm_idx
  on public.markets using gin (title extensions.gin_trgm_ops);

create index if not exists markets_description_trgm_idx
  on public.markets using gin (description extensions.gin_trgm_ops);

create index if not exists markets_open_closes_idx
  on public.markets (closes_at)
  where resolved_at is null;
