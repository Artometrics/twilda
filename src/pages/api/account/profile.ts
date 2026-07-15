import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, locals }) => {
  const supabase = locals.supabase ?? createSupabaseServerClient(cookies, request);
  const user = locals.user ?? (await supabase.auth.getUser()).data.user;
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await request.json().catch(() => ({}));
  const display_name = body.display_name != null ? String(body.display_name).trim() || null : null;
  const pen_name = body.pen_name != null ? String(body.pen_name).trim() || null : null;

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name,
    pen_name,
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
};
