import type { APIRoute } from "astro";
import { hasPublicSupabaseEnv, pingSupabase } from "@/lib/site";

export const prerender = false;

export const GET: APIRoute = async () => {
  const supabase = await pingSupabase();

  const body = {
    ok: true,
    site: import.meta.env.PUBLIC_SITE_URL || null,
    supabase: {
      configured: hasPublicSupabaseEnv(),
      reachable: supabase.reachable,
      ...(supabase.error ? { error: supabase.error } : {}),
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
