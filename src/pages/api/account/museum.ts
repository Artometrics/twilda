import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

const COLLECTION_SELECT =
  "id, seed_entity_id, title, kind, summary, portrait_url, source_url, license, attribution, notes, created_at";

/** List the signed-in user's museum / atlas seed collections. */
export const GET: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { data, error } = await supabase
    .from("atlas_collections")
    .select(COLLECTION_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") {
      return new Response(
        JSON.stringify({ error: "Museum tables missing — run supabase/migrations/005_atlas_museum.sql" }),
        { status: 503 },
      );
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data ?? []), {
    headers: { "Content-Type": "application/json" },
  });
};

/** Bookmark a seed entity into the user's museum collection. */
export const POST: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await request.json().catch(() => ({}));
  const seedEntityId = body.seedEntityId ? String(body.seedEntityId).trim() : "";
  if (!seedEntityId) {
    return new Response(JSON.stringify({ error: "seedEntityId required" }), { status: 400 });
  }

  const row = {
    user_id: user.id,
    seed_entity_id: seedEntityId,
    title: body.title != null ? String(body.title) : null,
    kind: body.kind != null ? String(body.kind) : null,
    summary: body.summary != null ? String(body.summary) : null,
    portrait_url: body.portraitUrl != null ? String(body.portraitUrl) : null,
    source_url: body.sourceUrl != null ? String(body.sourceUrl) : null,
    license: body.license != null ? String(body.license) : null,
    attribution: body.attribution != null ? String(body.attribution) : null,
    notes: body.notes != null ? String(body.notes) : null,
  };

  const { data, error } = await supabase
    .from("atlas_collections")
    .upsert(row, { onConflict: "user_id,seed_entity_id" })
    .select(COLLECTION_SELECT)
    .single();

  if (error) {
    if (error.code === "42P01") {
      return new Response(
        JSON.stringify({ error: "Museum tables missing — run supabase/migrations/005_atlas_museum.sql" }),
        { status: 503 },
      );
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

/** Remove a collection entry — ?seedEntityId= */
export const DELETE: APIRoute = async ({ cookies, request, url }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const seedEntityId = url.searchParams.get("seedEntityId")?.trim();
  if (!seedEntityId) {
    return new Response(JSON.stringify({ error: "seedEntityId required" }), { status: 400 });
  }

  const { error } = await supabase
    .from("atlas_collections")
    .delete()
    .eq("user_id", user.id)
    .eq("seed_entity_id", seedEntityId);

  if (error) {
    if (error.code === "42P01") {
      return new Response(
        JSON.stringify({ error: "Museum tables missing — run supabase/migrations/005_atlas_museum.sql" }),
        { status: 503 },
      );
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
