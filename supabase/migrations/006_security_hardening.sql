-- Twilda 006 — security hardening for GOTHA ancestors RPC
-- Idempotent. Run after 004_atlas_schema.sql.

-- Recreate ancestors using auth.uid() so callers cannot supply another user id.
create or replace function public.gotha_ancestors(
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
    where gp.id = p_person_id
      and gp.user_id = auth.uid()

    union all

    select
      parent.id,
      parent.name,
      a.generation + 1,
      a.path || parent.id
    from ancestors a
    join gotha_relations gr on gr.to_person_id = a.person_id
      and gr.rel = 'parent'
      and gr.user_id = auth.uid()
    join gotha_persons parent on parent.id = gr.from_person_id
    where a.generation < p_max_generations
      and not (parent.id = any(a.path))
  )
  select person_id, name, generation, path from ancestors;
$$;

-- Drop legacy 3-arg overload if present.
drop function if exists public.gotha_ancestors(uuid, uuid, int);

revoke all on function public.gotha_ancestors(uuid, int) from public, anon;
grant execute on function public.gotha_ancestors(uuid, int) to authenticated, service_role, postgres;
