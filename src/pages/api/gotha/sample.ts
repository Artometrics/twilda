import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { SAMPLE_FAMILY_PERSONS, SAMPLE_FAMILY_RELATIONS } from "@/lib/gotha/sample-family";

export const prerender = false;

/** Seed a Habsburg-adjacent demo tree for the signed-in user (only if they have no people yet). */
export const POST: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { count, error: countError } = await supabase
    .from("gotha_persons")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    if (countError.code === "42P01") {
      return new Response(
        JSON.stringify({ error: "GOTHA tables missing — run supabase/migrations/004_atlas_schema.sql" }),
        { status: 503 },
      );
    }
    return new Response(JSON.stringify({ error: countError.message }), { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return new Response(JSON.stringify({ error: "Sample already blocked — delete your people first, or keep your tree." }), {
      status: 409,
    });
  }

  const keyToId = new Map<string, string>();

  for (const person of SAMPLE_FAMILY_PERSONS) {
    const base = {
      user_id: user.id,
      name: person.name,
      birth_year: person.birth_year,
      birth_month: person.birth_month,
      birth_day: person.birth_day,
      birth_place: person.birth_place,
      birth_lat: person.birth_lat,
      birth_lng: person.birth_lng,
      death_year: person.death_year,
      family_name: person.family_name,
      is_self: person.is_self,
      notes: person.notes,
    };

    // Prefer atlas_seed_id (005); fall back if column not migrated yet
    let { data, error } = await supabase
      .from("gotha_persons")
      .insert({ ...base, atlas_seed_id: person.atlas_seed_id })
      .select("id")
      .single();

    if (error && (error.message?.includes("atlas_seed_id") || error.code === "PGRST204")) {
      ({ data, error } = await supabase.from("gotha_persons").insert(base).select("id").single());
    }

    if (error || !data) {
      return new Response(JSON.stringify({ error: error?.message ?? "Failed to insert sample person" }), { status: 500 });
    }
    keyToId.set(person.key, data.id);
  }

  const relRows = SAMPLE_FAMILY_RELATIONS.map((r) => ({
    user_id: user.id,
    from_person_id: keyToId.get(r.from)!,
    to_person_id: keyToId.get(r.to)!,
    rel: r.rel,
  })).filter((r) => r.from_person_id && r.to_person_id);

  if (relRows.length > 0) {
    const { error: relError } = await supabase.from("gotha_relations").insert(relRows);
    if (relError) {
      return new Response(JSON.stringify({ error: relError.message }), { status: 500 });
    }
  }

  const selfId = keyToId.get("you") ?? [...keyToId.values()][0];
  return new Response(JSON.stringify({ ok: true, focusId: selfId, count: keyToId.size }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
