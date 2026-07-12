import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { createNovel, ensureStarterNovels } from "@/lib/novels/service";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    await ensureStarterNovels(supabase, user.id);
    const body = await request.json().catch(() => ({}));
    const id = await createNovel(supabase, user.id, body);
    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Create failed" }),
      { status: 500 },
    );
  }
};
