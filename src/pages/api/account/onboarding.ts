import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

/** Mark onboarding as completed (welcome modal dismiss). */
export const POST: APIRoute = async ({ cookies, request, locals }) => {
  const supabase = locals.supabase ?? createSupabaseServerClient(cookies, request);
  const user = locals.user ?? (await supabase.auth.getUser()).data.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, onboarding_completed: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
