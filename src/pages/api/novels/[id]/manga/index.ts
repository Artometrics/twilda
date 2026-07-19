import type { APIRoute } from "astro";
import { dbErrorMessage } from "@/lib/auth/guards";
import {
  ensureMangaSeeded,
  isMangaSetupError,
  listMangaPages,
  seedMangaFromPilot,
} from "@/lib/novels/manga";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, params, url }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const draftId = url.searchParams.get("draft");
    if (draftId && url.searchParams.get("ensure") === "1") {
      await ensureMangaSeeded(supabase, user.id, params.id!, draftId);
    }
    const pages = await listMangaPages(supabase, user.id, params.id!, draftId);
    return new Response(JSON.stringify({ pages }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: isMangaSetupError(message) ? 503 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: { draft_id?: string; reseed?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!body.draft_id) {
    return new Response(JSON.stringify({ error: "draft_id required" }), { status: 400 });
  }

  try {
    if (body.reseed) {
      await seedMangaFromPilot(supabase, user.id, params.id!, body.draft_id);
    } else {
      await ensureMangaSeeded(supabase, user.id, params.id!, body.draft_id);
    }
    const pages = await listMangaPages(supabase, user.id, params.id!, body.draft_id);
    return new Response(JSON.stringify({ pages }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: isMangaSetupError(message) ? 503 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
