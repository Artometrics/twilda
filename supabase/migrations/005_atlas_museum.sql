-- Atlas museum collections + enrich cache (idempotent)
-- Run after 004_atlas_schema.sql

-- ─── User museum collections (seed entity bookmarks) ─────────────────────────
create table if not exists public.atlas_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  seed_entity_id text not null, -- Atlas TypeScript seed id e.g. "met-washington-crossing"
  title text,
  kind text,
  summary text,
  portrait_url text,
  source_url text,
  license text,
  attribution text,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, seed_entity_id)
);

create index if not exists atlas_collections_user_id_idx on public.atlas_collections (user_id);

alter table public.atlas_collections enable row level security;

drop policy if exists "atlas_collections_all_own" on public.atlas_collections;
create policy "atlas_collections_all_own" on public.atlas_collections
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Server-side enrich response cache ───────────────────────────────────────
create table if not exists public.atlas_enrich_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz default now()
);

alter table public.atlas_enrich_cache enable row level security;

-- Read for authenticated (and service); writes via service_role only
drop policy if exists "atlas_enrich_cache_select" on public.atlas_enrich_cache;
create policy "atlas_enrich_cache_select" on public.atlas_enrich_cache
  for select using (true);

-- No insert/update/delete policies for anon/authenticated → public cannot write

-- ─── GOTHA: text seed id alongside uuid atlas_entity_id ──────────────────────
alter table public.gotha_persons
  add column if not exists atlas_seed_id text;

create index if not exists gotha_persons_atlas_seed_id_idx
  on public.gotha_persons (atlas_seed_id)
  where atlas_seed_id is not null;

-- ─── Grants ───────────────────────────────────────────────────────────────────
grant all on table public.atlas_collections to postgres, authenticated, service_role;
grant select on table public.atlas_collections to anon;

grant select on table public.atlas_enrich_cache to postgres, anon, authenticated, service_role;
grant all on table public.atlas_enrich_cache to postgres, service_role;
