import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import {
  addDraftReference,
  browseDraftLibrary,
  listDraftReferences,
  removeDraftReference,
} from "@/lib/novels/drafts";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, params, url }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const draftId = url.searchParams.get("draft_id");
  const browseId = url.searchParams.get("browse");

  try {
    if (browseId) {
      const library = await browseDraftLibrary(supabase, user.id, params.id!, browseId);
      return new Response(JSON.stringify(library), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!draftId) {
      return new Response(JSON.stringify({ error: "draft_id required" }), { status: 400 });
    }
    const refs = await listDraftReferences(supabase, user.id, params.id!, draftId);
    return new Response(JSON.stringify(refs), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Load failed" }),
      { status: 400 },
    );
  }
};

export const POST: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await request.json().catch(() => ({}));
  try {
    const ref = await addDraftReference(supabase, user.id, params.id!, {
      draft_id: String(body.draft_id),
      source_draft_id: String(body.source_draft_id),
      source_type: body.source_type,
      source_id: body.source_id ?? null,
      note: body.note ? String(body.note) : "",
    });
    return new Response(JSON.stringify(ref), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Create failed" }),
      { status: 400 },
    );
  }
};

export const DELETE: APIRoute = async ({ cookies, request, params, url }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const refId = url.searchParams.get("id");
  if (!refId) {
    return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
  }

  try {
    await removeDraftReference(supabase, user.id, params.id!, refId);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Delete failed" }),
      { status: 400 },
    );
  }
};
