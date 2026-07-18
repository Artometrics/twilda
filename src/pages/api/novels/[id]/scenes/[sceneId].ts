import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { updateSceneContent } from "@/lib/novels/service";

export const prerender = false;

export const PATCH: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  let body: { content?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  if (typeof body.content !== "string") {
    return new Response(JSON.stringify({ error: "content required" }), { status: 400 });
  }

  try {
    await updateSceneContent(supabase, user.id, params.sceneId!, body.content);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Save failed" }),
      { status: 500 },
    );
  }
};
