-- Run this if 001_initial_schema.sql failed partway (e.g. "last_opened_at does not exist").
-- Safe to run multiple times.

-- Subscriptions (if 001 stopped before this)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  status text not null default 'active' check (status in ('active', 'trialing', 'canceled', 'past_due')),
  ai_credits_remaining int not null default 5,
  ai_credits_monthly int not null default 5,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create or replace function public.handle_new_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_subscription on public.profiles;
create trigger on_profile_subscription
  after insert on public.profiles
  for each row execute function public.handle_new_subscription();

insert into public.subscriptions (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- Patch novels table if an older version existed
alter table public.novels add column if not exists synopsis text not null default '';
alter table public.novels add column if not exists author text not null default '';
alter table public.novels add column if not exists cover_kind text not null default 'gatsby';
alter table public.novels add column if not exists series_name text;
alter table public.novels add column if not exists is_template boolean not null default false;
alter table public.novels add column if not exists last_opened_at timestamptz;
alter table public.novels add column if not exists created_at timestamptz not null default now();
alter table public.novels add column if not exists updated_at timestamptz not null default now();

create index if not exists novels_user_id_idx on public.novels (user_id);
create index if not exists novels_last_opened_idx on public.novels (user_id, last_opened_at desc nulls last);

-- Chapters
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels (id) on delete cascade,
  sort_order int not null default 0,
  title text not null default 'Chapter I',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chapters_novel_id_idx on public.chapters (novel_id, sort_order);

alter table public.chapters enable row level security;

drop policy if exists "chapters_all_own" on public.chapters;
create policy "chapters_all_own" on public.chapters
  for all using (
    exists (
      select 1 from public.novels n
      where n.id = chapters.novel_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.novels n
      where n.id = chapters.novel_id and n.user_id = auth.uid()
    )
  );

-- Scenes
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  sort_order int not null default 0,
  title text not null default 'Scene 1',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scenes_chapter_id_idx on public.scenes (chapter_id, sort_order);

alter table public.scenes enable row level security;

drop policy if exists "scenes_all_own" on public.scenes;
create policy "scenes_all_own" on public.scenes
  for all using (
    exists (
      select 1 from public.chapters c
      join public.novels n on n.id = c.novel_id
      where c.id = scenes.chapter_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chapters c
      join public.novels n on n.id = c.novel_id
      where c.id = scenes.chapter_id and n.user_id = auth.uid()
    )
  );

-- Codex
create table if not exists public.codex_entries (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels (id) on delete cascade,
  type text not null default 'other' check (type in ('character', 'location', 'lore', 'other')),
  name text not null,
  initials text not null default '??',
  tags jsonb not null default '[]'::jsonb,
  aliases jsonb not null default '[]'::jsonb,
  summary text not null default '',
  description text not null default '',
  mentions int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists codex_entries_novel_id_idx on public.codex_entries (novel_id);

alter table public.codex_entries enable row level security;

drop policy if exists "codex_all_own" on public.codex_entries;
create policy "codex_all_own" on public.codex_entries
  for all using (
    exists (
      select 1 from public.novels n
      where n.id = codex_entries.novel_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.novels n
      where n.id = codex_entries.novel_id and n.user_id = auth.uid()
    )
  );

-- Snippets
create table if not exists public.snippets (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.snippets enable row level security;

drop policy if exists "snippets_all_own" on public.snippets;
create policy "snippets_all_own" on public.snippets
  for all using (
    exists (
      select 1 from public.novels n
      where n.id = snippets.novel_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.novels n
      where n.id = snippets.novel_id and n.user_id = auth.uid()
    )
  );

-- Chat
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels (id) on delete cascade,
  title text not null default 'Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_threads enable row level security;

drop policy if exists "chat_threads_all_own" on public.chat_threads;
create policy "chat_threads_all_own" on public.chat_threads
  for all using (
    exists (
      select 1 from public.novels n
      where n.id = chat_threads.novel_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.novels n
      where n.id = chat_threads.novel_id and n.user_id = auth.uid()
    )
  );

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_all_own" on public.chat_messages;
create policy "chat_messages_all_own" on public.chat_messages
  for all using (
    exists (
      select 1 from public.chat_threads t
      join public.novels n on n.id = t.novel_id
      where t.id = chat_messages.thread_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chat_threads t
      join public.novels n on n.id = t.novel_id
      where t.id = chat_messages.thread_id and n.user_id = auth.uid()
    )
  );

-- Triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists novels_updated_at on public.novels;
create trigger novels_updated_at before update on public.novels
  for each row execute function public.set_updated_at();

drop trigger if exists chapters_updated_at on public.chapters;
create trigger chapters_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();

drop trigger if exists scenes_updated_at on public.scenes;
create trigger scenes_updated_at before update on public.scenes
  for each row execute function public.set_updated_at();

drop trigger if exists codex_updated_at on public.codex_entries;
create trigger codex_updated_at before update on public.codex_entries
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
