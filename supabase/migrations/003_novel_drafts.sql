-- Novel drafts / timelines: alternate outlines, bibles, and manuscript branches per novel.
-- Idempotent — safe to re-run.

-- Drafts
create table if not exists public.novel_drafts (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels (id) on delete cascade,
  name text not null default 'Main',
  slug text not null default 'main',
  summary text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (novel_id, slug)
);

create index if not exists novel_drafts_novel_id_idx on public.novel_drafts (novel_id, sort_order);

alter table public.novel_drafts enable row level security;

drop policy if exists "novel_drafts_all_own" on public.novel_drafts;
create policy "novel_drafts_all_own" on public.novel_drafts
  for all using (
    exists (
      select 1 from public.novels n
      where n.id = novel_drafts.novel_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.novels n
      where n.id = novel_drafts.novel_id and n.user_id = auth.uid()
    )
  );

-- Active draft pointer on novels
alter table public.novels add column if not exists active_draft_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'novels_active_draft_id_fkey'
  ) then
    alter table public.novels
      add constraint novels_active_draft_id_fkey
      foreign key (active_draft_id) references public.novel_drafts (id) on delete set null;
  end if;
end $$;

-- Scope content to a draft
alter table public.chapters add column if not exists draft_id uuid references public.novel_drafts (id) on delete cascade;
alter table public.codex_entries add column if not exists draft_id uuid references public.novel_drafts (id) on delete cascade;
alter table public.snippets add column if not exists draft_id uuid references public.novel_drafts (id) on delete cascade;
alter table public.chat_threads add column if not exists draft_id uuid references public.novel_drafts (id) on delete cascade;

create index if not exists chapters_draft_id_idx on public.chapters (draft_id, sort_order);
create index if not exists codex_entries_draft_id_idx on public.codex_entries (draft_id);
create index if not exists snippets_draft_id_idx on public.snippets (draft_id);

-- Cross-draft references (pin another timeline's entry into the active draft)
create table if not exists public.draft_references (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels (id) on delete cascade,
  draft_id uuid not null references public.novel_drafts (id) on delete cascade,
  source_draft_id uuid not null references public.novel_drafts (id) on delete cascade,
  source_type text not null check (source_type in ('codex', 'snippet', 'draft')),
  source_id uuid,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (draft_id, source_draft_id, source_type, source_id)
);

create index if not exists draft_references_draft_id_idx on public.draft_references (draft_id);

alter table public.draft_references enable row level security;

drop policy if exists "draft_references_all_own" on public.draft_references;
create policy "draft_references_all_own" on public.draft_references
  for all using (
    exists (
      select 1 from public.novels n
      where n.id = draft_references.novel_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.novels n
      where n.id = draft_references.novel_id and n.user_id = auth.uid()
    )
  );

-- Backfill: every novel gets a Main draft; attach orphan content
insert into public.novel_drafts (novel_id, name, slug, summary, sort_order)
select n.id, 'Main', 'main', 'Primary draft', 0
from public.novels n
where not exists (
  select 1 from public.novel_drafts d where d.novel_id = n.id
);

update public.novels n
set active_draft_id = d.id
from public.novel_drafts d
where d.novel_id = n.id
  and d.slug = 'main'
  and n.active_draft_id is null;

update public.chapters c
set draft_id = n.active_draft_id
from public.novels n
where n.id = c.novel_id
  and c.draft_id is null
  and n.active_draft_id is not null;

update public.codex_entries e
set draft_id = n.active_draft_id
from public.novels n
where n.id = e.novel_id
  and e.draft_id is null
  and n.active_draft_id is not null;

update public.snippets s
set draft_id = n.active_draft_id
from public.novels n
where n.id = s.novel_id
  and s.draft_id is null
  and n.active_draft_id is not null;

update public.chat_threads t
set draft_id = n.active_draft_id
from public.novels n
where n.id = t.novel_id
  and t.draft_id is null
  and n.active_draft_id is not null;

drop trigger if exists novel_drafts_updated_at on public.novel_drafts;
create trigger novel_drafts_updated_at before update on public.novel_drafts
  for each row execute function public.set_updated_at();

grant all on table public.novel_drafts to postgres, anon, authenticated, service_role;
grant all on table public.draft_references to postgres, anon, authenticated, service_role;
