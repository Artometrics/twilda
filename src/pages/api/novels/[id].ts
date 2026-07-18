import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { exportNovelText, getNovelFull, updateNovelMetadata } from "@/lib/novels/service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const novel = await getNovelFull(supabase, user.id, params.id!);
  if (!novel) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

  return new Response(JSON.stringify(novel), {
    headers: { "Content-Type": "application/json" },
  });
};

export const PATCH: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const patch: {
    title?: string;
    author?: string;
    synopsis?: string;
    series_name?: string | null;
  } = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.author === "string") patch.author = body.author;
  if (typeof body.synopsis === "string") patch.synopsis = body.synopsis;
  if (body.series_name === null || typeof body.series_name === "string") {
    patch.series_name = body.series_name;
  }

  try {
    await updateNovelMetadata(supabase, user.id, params.id!, patch);
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

export const DELETE: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { error } = await supabase
    .from("novels")
    .delete()
    .eq("id", params.id!)
    .eq("user_id", user.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
