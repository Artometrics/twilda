-- Twilda 009 — storyboard panels for AI image generation (idempotent)
-- Run after 003_novel_drafts.sql.

create table if not exists public.storyboard_panels (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels (id) on delete cascade,
  draft_id uuid references public.novel_drafts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sort_order int not null default 0,
  caption text not null default '',
  prompt text not null default '',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists storyboard_panels_novel_draft_idx
  on public.storyboard_panels (novel_id, draft_id, sort_order);

create index if not exists storyboard_panels_user_idx
  on public.storyboard_panels (user_id);

alter table public.storyboard_panels enable row level security;

drop policy if exists "storyboard_select_own" on public.storyboard_panels;
create policy "storyboard_select_own" on public.storyboard_panels
  for select using (auth.uid() = user_id);

drop policy if exists "storyboard_insert_own" on public.storyboard_panels;
create policy "storyboard_insert_own" on public.storyboard_panels
  for insert with check (auth.uid() = user_id);

drop policy if exists "storyboard_update_own" on public.storyboard_panels;
create policy "storyboard_update_own" on public.storyboard_panels
  for update using (auth.uid() = user_id);

drop policy if exists "storyboard_delete_own" on public.storyboard_panels;
create policy "storyboard_delete_own" on public.storyboard_panels
  for delete using (auth.uid() = user_id);

-- Private storage bucket for 16:9 panel images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'storyboard',
  'storyboard',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storyboard_storage_select" on storage.objects;
create policy "storyboard_storage_select" on storage.objects
  for select using (
    bucket_id = 'storyboard'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storyboard_storage_insert" on storage.objects;
create policy "storyboard_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'storyboard'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storyboard_storage_update" on storage.objects;
create policy "storyboard_storage_update" on storage.objects
  for update using (
    bucket_id = 'storyboard'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storyboard_storage_delete" on storage.objects;
create policy "storyboard_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'storyboard'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on table public.storyboard_panels is
  '16:9 storyboard frames with shot line + AI image prompt, per novel draft.';
