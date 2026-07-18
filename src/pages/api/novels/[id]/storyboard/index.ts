import type { APIRoute } from "astro";
import { dbErrorMessage } from "@/lib/auth/guards";
import {
  createStoryboardPanel,
  isStoryboardSetupError,
  listStoryboardPanels,
} from "@/lib/novels/storyboard";
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
    const panels = await listStoryboardPanels(supabase, user.id, params.id!, draftId);
    return new Response(JSON.stringify({ panels }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: isStoryboardSetupError(message) ? 503 : 500,
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

  let body: { draft_id?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const panel = await createStoryboardPanel(
      supabase,
      user.id,
      params.id!,
      body.draft_id ?? null,
    );
    return new Response(JSON.stringify({ panel }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: isStoryboardSetupError(message) ? 503 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
