-- Twilda 010 — Manga Studio pages + panels (idempotent)
-- Run after 009_storyboard_panels.sql.

-- Character sheet fields on codex
alter table public.codex_entries
  add column if not exists appearance_lock text not null default '';

alter table public.codex_entries
  add column if not exists element_id text not null default '';

alter table public.codex_entries
  add column if not exists ref_image_path text;

create table if not exists public.manga_pages (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels (id) on delete cascade,
  draft_id uuid references public.novel_drafts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  scene_key text not null default '',
  sequence int not null default 1,
  page_number int not null default 1,
  title text not null default '',
  summary text not null default '',
  script_notes text not null default '',
  layout text not null default 'grid_2x3',
  page_image_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manga_pages_novel_draft_idx
  on public.manga_pages (novel_id, draft_id, sort_order);

create index if not exists manga_pages_scene_key_idx
  on public.manga_pages (novel_id, draft_id, scene_key);

alter table public.manga_pages enable row level security;

drop policy if exists "manga_pages_select_own" on public.manga_pages;
create policy "manga_pages_select_own" on public.manga_pages
  for select using (auth.uid() = user_id);

drop policy if exists "manga_pages_insert_own" on public.manga_pages;
create policy "manga_pages_insert_own" on public.manga_pages
  for insert with check (auth.uid() = user_id);

drop policy if exists "manga_pages_update_own" on public.manga_pages;
create policy "manga_pages_update_own" on public.manga_pages
  for update using (auth.uid() = user_id);

drop policy if exists "manga_pages_delete_own" on public.manga_pages;
create policy "manga_pages_delete_own" on public.manga_pages
  for delete using (auth.uid() = user_id);

create table if not exists public.manga_panels (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.manga_pages (id) on delete cascade,
  novel_id uuid not null references public.novels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot int not null default 1 check (slot >= 1 and slot <= 6),
  sort_order int not null default 0,
  caption text not null default '',
  dialogue text not null default '',
  sfx text not null default '',
  notes text not null default '',
  prompt text not null default '',
  negative_notes text not null default '',
  image_path text,
  source_url text,
  higgsfield_job_id text,
  research_links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, slot)
);

create index if not exists manga_panels_page_idx
  on public.manga_panels (page_id, slot);

create index if not exists manga_panels_novel_idx
  on public.manga_panels (novel_id, user_id);

alter table public.manga_panels enable row level security;

drop policy if exists "manga_panels_select_own" on public.manga_panels;
create policy "manga_panels_select_own" on public.manga_panels
  for select using (auth.uid() = user_id);

drop policy if exists "manga_panels_insert_own" on public.manga_panels;
create policy "manga_panels_insert_own" on public.manga_panels
  for insert with check (auth.uid() = user_id);

drop policy if exists "manga_panels_update_own" on public.manga_panels;
create policy "manga_panels_update_own" on public.manga_panels
  for update using (auth.uid() = user_id);

drop policy if exists "manga_panels_delete_own" on public.manga_panels;
create policy "manga_panels_delete_own" on public.manga_panels
  for delete using (auth.uid() = user_id);

-- Private manga storage (panels + composited pages)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'manga',
  'manga',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "manga_storage_select" on storage.objects;
create policy "manga_storage_select" on storage.objects
  for select using (
    bucket_id = 'manga'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "manga_storage_insert" on storage.objects;
create policy "manga_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'manga'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "manga_storage_update" on storage.objects;
create policy "manga_storage_update" on storage.objects
  for update using (
    bucket_id = 'manga'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "manga_storage_delete" on storage.objects;
create policy "manga_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'manga'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on table public.manga_pages is
  'Manga Studio pages: one storyboard scene = one 6-panel page (grid_2x3).';
comment on table public.manga_panels is
  'Six panels per manga page with script, prompt, and image/source_url.';
