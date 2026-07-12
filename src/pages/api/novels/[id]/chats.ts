import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { listChatThreads } from "@/lib/novels/service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, params }) => {
  const supabase = createSupabaseServerClient(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  try {
    const threads = await listChatThreads(supabase, user.id, params.id!);
    return new Response(JSON.stringify(threads), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Load failed" }),
      { status: 400 },
    );
  }
};
