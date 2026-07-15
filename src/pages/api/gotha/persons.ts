import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { data, error } = await supabase
    .from("gotha_persons")
    .select(
      "id, name, birth_year, birth_month, birth_day, birth_place, birth_lat, birth_lng, death_year, family_name, is_self, portrait_url, atlas_entity_id, atlas_seed_id, notes",
    )
    .eq("user_id", user.id)
    .order("birth_year", { ascending: true, nullsFirst: false });

  if (error) {
    // Column may not exist yet before 005 — retry without atlas_seed_id
    if (error.message?.includes("atlas_seed_id")) {
      const retry = await supabase
        .from("gotha_persons")
        .select(
          "id, name, birth_year, birth_month, birth_day, birth_place, birth_lat, birth_lng, death_year, family_name, is_self, portrait_url, atlas_entity_id, notes",
        )
        .eq("user_id", user.id)
        .order("birth_year", { ascending: true, nullsFirst: false });
      if (retry.error) return new Response(JSON.stringify({ error: retry.error.message }), { status: 500 });
      return new Response(JSON.stringify(retry.data ?? []), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data ?? []), { headers: { "Content-Type": "application/json" } });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await request.json().catch(() => ({}));

  const atlasSeedId =
    body.atlas_seed_id != null && String(body.atlas_seed_id).trim()
      ? String(body.atlas_seed_id).trim()
      : null;
  const atlasEntityRaw = body.atlas_entity_id != null ? String(body.atlas_entity_id).trim() : "";
  const atlasEntityId = UUID_RE.test(atlasEntityRaw) ? atlasEntityRaw : null;

  const base = {
    user_id: user.id,
    name: String(body.name ?? "Unknown"),
    birth_year: body.birth_year ? Number(body.birth_year) : null,
    birth_month: body.birth_month ? Number(body.birth_month) : null,
    birth_day: body.birth_day ? Number(body.birth_day) : null,
    birth_place: body.birth_place ? String(body.birth_place) : null,
    birth_lat: body.birth_lat ? Number(body.birth_lat) : null,
    birth_lng: body.birth_lng ? Number(body.birth_lng) : null,
    death_year: body.death_year ? Number(body.death_year) : null,
    family_name: body.family_name ? String(body.family_name) : null,
    is_self: Boolean(body.is_self),
    notes: body.notes ? String(body.notes) : null,
    atlas_entity_id: atlasEntityId,
  };

  // Prefer atlas_seed_id (005); fall back if column missing
  let { data, error } = await supabase
    .from("gotha_persons")
    .insert({ ...base, atlas_seed_id: atlasSeedId })
    .select("id, name")
    .single();

  if (error && (error.message?.includes("atlas_seed_id") || error.code === "PGRST204")) {
    ({ data, error } = await supabase.from("gotha_persons").insert(base).select("id, name").single());
  }

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 201, headers: { "Content-Type": "application/json" } });
};
