-- Twilda initial schema: profiles + novels with RLS.
-- Apply in Supabase SQL Editor or via `supabase db push` after linking the project.

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Novels (per-user writing projects)
-- ---------------------------------------------------------------------------

create table public.novels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled',
  author text not null default '',
  synopsis text not null default '',
  cover_kind text not null default 'trinity'
    check (cover_kind in ('gatsby', 'cardinal', 'trinity')),
  series text,
  content jsonb not null default '{"codex":[],"chapters":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index novels_user_id_idx on public.novels (user_id);
create index novels_updated_at_idx on public.novels (user_id, updated_at desc);

alter table public.novels enable row level security;

create policy "Novels are viewable by owner"
  on public.novels
  for select
  using (auth.uid() = user_id);

create policy "Novels are insertable by owner"
  on public.novels
  for insert
  with check (auth.uid() = user_id);

create policy "Novels are updatable by owner"
  on public.novels
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Novels are deletable by owner"
  on public.novels
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger novels_set_updated_at
  before update on public.novels
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
