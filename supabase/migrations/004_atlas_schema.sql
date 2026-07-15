-- Atlas + GOTHA schema (idempotent)
-- Run after 001_initial_schema.sql and 003_novel_drafts.sql

-- ─── Atlas entities ───────────────────────────────────────────────────────────
create table if not exists public.atlas_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,  -- null = public seed
  kind text not null check (kind in ('person','place','work','idea','event','deity','dynasty','concept')),
  name text not null,
  summary text not null default '',
  description text not null default '',
  start_year int,
  end_year int,
  lat float,
  lng float,
  portrait_url text,
  callout_label text,
  tags jsonb not null default '[]'::jsonb,
  aliases jsonb not null default '[]'::jsonb,
  provenance jsonb not null default '[]'::jsonb,
  rank int,
  peer_set text,
  value_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists atlas_entities_kind_idx on public.atlas_entities (kind);
create index if not exists atlas_entities_user_id_idx on public.atlas_entities (user_id);

alter table public.atlas_entities enable row level security;

drop policy if exists "atlas_entities_read" on public.atlas_entities;
create policy "atlas_entities_read" on public.atlas_entities
  for select using (
    user_id is null  -- public seed rows
    or auth.uid() = user_id
  );

drop policy if exists "atlas_entities_write" on public.atlas_entities;
create policy "atlas_entities_write" on public.atlas_entities
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Atlas links ──────────────────────────────────────────────────────────────
create table if not exists public.atlas_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  from_id uuid not null references public.atlas_entities (id) on delete cascade,
  to_id uuid not null references public.atlas_entities (id) on delete cascade,
  rel text not null,
  year int,
  year_end int,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists atlas_links_from_idx on public.atlas_links (from_id);
create index if not exists atlas_links_to_idx on public.atlas_links (to_id);

alter table public.atlas_links enable row level security;

drop policy if exists "atlas_links_read" on public.atlas_links;
create policy "atlas_links_read" on public.atlas_links
  for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "atlas_links_write" on public.atlas_links;
create policy "atlas_links_write" on public.atlas_links
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Atlas scenes ─────────────────────────────────────────────────────────────
create table if not exists public.atlas_scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  slug text not null,
  title text not null default '',
  subtitle text,
  year int,
  center_lat float,
  center_lng float,
  zoom float default 4,
  badge text,
  callout_ids jsonb not null default '[]'::jsonb,
  focus_id text,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

alter table public.atlas_scenes enable row level security;

drop policy if exists "atlas_scenes_read" on public.atlas_scenes;
create policy "atlas_scenes_read" on public.atlas_scenes
  for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "atlas_scenes_write" on public.atlas_scenes;
create policy "atlas_scenes_write" on public.atlas_scenes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── GOTHA — personal genealogy ───────────────────────────────────────────────
create table if not exists public.gotha_persons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  birth_year int,
  birth_month int,
  birth_day int,
  birth_place text,
  birth_lat float,
  birth_lng float,
  death_year int,
  family_name text,
  notes text,
  portrait_url text,
  is_self boolean not null default false,
  atlas_entity_id uuid references public.atlas_entities (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gotha_persons_user_id_idx on public.gotha_persons (user_id);

alter table public.gotha_persons enable row level security;

drop policy if exists "gotha_persons_all_own" on public.gotha_persons;
create policy "gotha_persons_all_own" on public.gotha_persons
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── GOTHA — relationships ────────────────────────────────────────────────────
create table if not exists public.gotha_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_person_id uuid not null references public.gotha_persons (id) on delete cascade,
  to_person_id uuid not null references public.gotha_persons (id) on delete cascade,
  rel text not null check (rel in ('parent','child','sibling','partner','adopted','other')),
  note text,
  created_at timestamptz not null default now(),
  unique (from_person_id, to_person_id, rel)
);

create index if not exists gotha_relations_from_idx on public.gotha_relations (from_person_id);
create index if not exists gotha_relations_to_idx on public.gotha_relations (to_person_id);
create index if not exists gotha_relations_user_id_idx on public.gotha_relations (user_id);

alter table public.gotha_relations enable row level security;

drop policy if exists "gotha_relations_all_own" on public.gotha_relations;
create policy "gotha_relations_all_own" on public.gotha_relations
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Ancestor traversal function ─────────────────────────────────────────────
create or replace function public.gotha_ancestors(
  p_user_id uuid,
  p_person_id uuid,
  p_max_generations int default 10
)
returns table (
  person_id uuid,
  name text,
  generation int,
  path uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  with recursive ancestors as (
    select
      gp.id as person_id,
      gp.name,
      0 as generation,
      array[gp.id] as path
    from gotha_persons gp
    where gp.id = p_person_id and gp.user_id = p_user_id

    union all

    select
      parent.id,
      parent.name,
      a.generation + 1,
      a.path || parent.id
    from ancestors a
    join gotha_relations gr on gr.to_person_id = a.person_id
      and gr.rel = 'parent'
      and gr.user_id = p_user_id
    join gotha_persons parent on parent.id = gr.from_person_id
    where a.generation < p_max_generations
      and not (parent.id = any(a.path))
  )
  select person_id, name, generation, path from ancestors;
$$;

-- ─── Updated-at triggers ──────────────────────────────────────────────────────
drop trigger if exists atlas_entities_updated_at on public.atlas_entities;
create trigger atlas_entities_updated_at before update on public.atlas_entities
  for each row execute function public.set_updated_at();

drop trigger if exists gotha_persons_updated_at on public.gotha_persons;
create trigger gotha_persons_updated_at before update on public.gotha_persons
  for each row execute function public.set_updated_at();

-- ─── Grant access ─────────────────────────────────────────────────────────────
grant all on table public.atlas_entities to postgres, anon, authenticated, service_role;
grant all on table public.atlas_links to postgres, anon, authenticated, service_role;
grant all on table public.atlas_scenes to postgres, anon, authenticated, service_role;
grant all on table public.gotha_persons to postgres, anon, authenticated, service_role;
grant all on table public.gotha_relations to postgres, anon, authenticated, service_role;
grant execute on function public.gotha_ancestors to postgres, anon, authenticated, service_role;
