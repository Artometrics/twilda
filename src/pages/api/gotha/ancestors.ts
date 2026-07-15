import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, url }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const personId = url.searchParams.get("person_id");
  const maxGenerations = Number(url.searchParams.get("generations") ?? 6);

  if (!personId) {
    return new Response(JSON.stringify({ error: "person_id required" }), { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc("gotha_ancestors", {
      p_person_id: personId,
      p_max_generations: Math.min(maxGenerations, 15),
    });
    if (error) throw error;
    return new Response(JSON.stringify(data ?? []), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Query failed" }),
      { status: 500 },
    );
  }
};
