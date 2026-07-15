import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { exportNovelText, listNovels } from "@/lib/novels/service";

export const prerender = false;

/** Soft-select: empty array if table missing or query fails. */
async function softRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: () => PromiseLike<{ data: any[] | null; error: { code?: string; message?: string } | null }>,
): Promise<{ rows: unknown[]; failed: boolean }> {
  try {
    const { data, error } = await run();
    if (error) return { rows: [], failed: true };
    return { rows: data ?? [], failed: false };
  } catch {
    return { rows: [], failed: true };
  }
}

export const GET: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const novels = await listNovels(supabase, user.id);
  const manuscripts: Record<string, string> = {};

  for (const novel of novels) {
    try {
      manuscripts[novel.id] = await exportNovelText(supabase, user.id, novel.id);
    } catch {
      manuscripts[novel.id] = "";
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, pen_name, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [museumRes, personsFull, relationsRes] = await Promise.all([
    softRows(() =>
      db
        .from("atlas_collections")
        .select(
          "id, seed_entity_id, title, kind, summary, portrait_url, source_url, license, attribution, notes, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ),
    softRows(() =>
      db
        .from("gotha_persons")
        .select(
          "id, name, birth_year, birth_month, birth_day, birth_place, birth_lat, birth_lng, death_year, family_name, is_self, portrait_url, atlas_entity_id, atlas_seed_id, notes",
        )
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
    ),
    softRows(() =>
      db
        .from("gotha_relations")
        .select("id, from_person_id, to_person_id, rel, note, created_at")
        .eq("user_id", user.id),
    ),
  ]);

  let gotha_persons = personsFull.rows;
  if (personsFull.failed) {
    gotha_persons = (
      await softRows(() =>
        db
          .from("gotha_persons")
          .select(
            "id, name, birth_year, birth_month, birth_day, birth_place, birth_lat, birth_lng, death_year, family_name, is_self, portrait_url, atlas_entity_id, notes",
          )
          .eq("user_id", user.id)
          .order("name", { ascending: true }),
      )
    ).rows;
  }

  return new Response(
    JSON.stringify({
      exported_at: new Date().toISOString(),
      email: user.email,
      profile,
      novels,
      manuscripts,
      atlas_collections: museumRes.rows,
      gotha_persons,
      gotha_relations: relationsRes.rows,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="twilda-export.json"',
      },
    },
  );
};
