import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { createSnippet, listSnippets } from "@/lib/novels/service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, params }) => {
  const supabase = createSupabaseServerClient(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  try {
    const snippets = await listSnippets(supabase, user.id, params.id!);
    return new Response(JSON.stringify(snippets), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Load failed" }),
      { status: 400 },
    );
  }
};

export const POST: APIRoute = async ({ cookies, params, request }) => {
  const supabase = createSupabaseServerClient(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await request.json();
  try {
    const snippet = await createSnippet(supabase, user.id, params.id!, {
      title: String(body.title ?? "Untitled snippet"),
      content: String(body.content ?? ""),
    });
    return new Response(JSON.stringify(snippet), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Create failed" }),
      { status: 400 },
    );
  }
};
