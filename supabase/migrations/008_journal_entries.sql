-- Twilda 008 — private journal entries (idempotent)
-- Run after 001_initial_schema.sql.

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_entries_user_updated_idx
  on public.journal_entries (user_id, updated_at desc);

alter table public.journal_entries enable row level security;

drop policy if exists "journal_select_own" on public.journal_entries;
create policy "journal_select_own" on public.journal_entries
  for select using (auth.uid() = user_id);

drop policy if exists "journal_insert_own" on public.journal_entries;
create policy "journal_insert_own" on public.journal_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "journal_update_own" on public.journal_entries;
create policy "journal_update_own" on public.journal_entries
  for update using (auth.uid() = user_id);

drop policy if exists "journal_delete_own" on public.journal_entries;
create policy "journal_delete_own" on public.journal_entries
  for delete using (auth.uid() = user_id);

comment on table public.journal_entries is
  'Private journal notes for a Twilda user (Library companion).';
