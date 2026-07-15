import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT_FULL =
  "id, name, birth_year, birth_month, birth_day, birth_place, birth_lat, birth_lng, death_year, family_name, is_self, portrait_url, atlas_entity_id, atlas_seed_id, notes";
const SELECT_FALLBACK =
  "id, name, birth_year, birth_month, birth_day, birth_place, birth_lat, birth_lng, death_year, family_name, is_self, portrait_url, atlas_entity_id, notes";

/** Best-effort place geocode via Nominatim when lat/lng omitted. */
async function geocodePlace(place: string): Promise<{ lat: number; lng: number } | null> {
  const q = place.trim();
  if (!q || q.length > 200) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "TwildaGOTHA/1.0 (genealogy map; contact via site)",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { lat?: string; lon?: string }[];
    const hit = json?.[0];
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function optNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function optStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

async function resolveCoords(body: Record<string, unknown>): Promise<{
  birth_lat: number | null;
  birth_lng: number | null;
}> {
  let birth_lat = optNum(body.birth_lat);
  let birth_lng = optNum(body.birth_lng);
  const place = optStr(body.birth_place);
  if ((birth_lat == null || birth_lng == null) && place) {
    const geo = await geocodePlace(place);
    if (geo) {
      birth_lat = birth_lat ?? geo.lat;
      birth_lng = birth_lng ?? geo.lng;
    }
  }
  return { birth_lat, birth_lng };
}

function atlasFields(body: Record<string, unknown>) {
  const atlasSeedId = optStr(body.atlas_seed_id);
  const atlasEntityRaw = body.atlas_entity_id != null ? String(body.atlas_entity_id).trim() : "";
  const atlasEntityId = UUID_RE.test(atlasEntityRaw) ? atlasEntityRaw : null;
  return { atlas_seed_id: atlasSeedId, atlas_entity_id: atlasEntityId };
}

export const GET: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { data, error } = await supabase
    .from("gotha_persons")
    .select(SELECT_FULL)
    .eq("user_id", user.id)
    .order("birth_year", { ascending: true, nullsFirst: false });

  if (error) {
    if (error.message?.includes("atlas_seed_id")) {
      const retry = await supabase
        .from("gotha_persons")
        .select(SELECT_FALLBACK)
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

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { atlas_seed_id: atlasSeedId, atlas_entity_id: atlasEntityId } = atlasFields(body);
  const { birth_lat, birth_lng } = await resolveCoords(body);

  const base = {
    user_id: user.id,
    name: String(body.name ?? "Unknown"),
    birth_year: optNum(body.birth_year),
    birth_month: optNum(body.birth_month),
    birth_day: optNum(body.birth_day),
    birth_place: optStr(body.birth_place),
    birth_lat,
    birth_lng,
    death_year: optNum(body.death_year),
    family_name: optStr(body.family_name),
    is_self: Boolean(body.is_self),
    notes: optStr(body.notes),
    atlas_entity_id: atlasEntityId,
  };

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

export const PATCH: APIRoute = async ({ cookies, request, url }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const id = url.searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { atlas_seed_id: atlasSeedId, atlas_entity_id: atlasEntityId } = atlasFields(body);
  const { birth_lat, birth_lng } = await resolveCoords(body);

  const patch: Record<string, unknown> = {
    name: String(body.name ?? "Unknown"),
    birth_year: optNum(body.birth_year),
    birth_month: optNum(body.birth_month),
    birth_day: optNum(body.birth_day),
    birth_place: optStr(body.birth_place),
    birth_lat,
    birth_lng,
    death_year: optNum(body.death_year),
    family_name: optStr(body.family_name),
    is_self: Boolean(body.is_self),
    notes: optStr(body.notes),
    atlas_entity_id: atlasEntityId,
    atlas_seed_id: atlasSeedId,
  };

  let { data, error } = await supabase
    .from("gotha_persons")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name")
    .single();

  if (error && (error.message?.includes("atlas_seed_id") || error.code === "PGRST204")) {
    const { atlas_seed_id: _drop, ...withoutSeed } = patch;
    ({ data, error } = await supabase
      .from("gotha_persons")
      .update(withoutSeed)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name")
      .single());
  }

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!data) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
};

export const DELETE: APIRoute = async ({ cookies, request, url }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const id = url.searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });

  // Relations cascade may or may not be configured — clean up manually.
  await supabase.from("gotha_relations").delete().eq("user_id", user.id).or(`from_person_id.eq.${id},to_person_id.eq.${id}`);

  const { error } = await supabase.from("gotha_persons").delete().eq("id", id).eq("user_id", user.id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
};
