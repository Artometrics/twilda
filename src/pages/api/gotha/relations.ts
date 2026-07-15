import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, url }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const personId = url.searchParams.get("person_id");
  if (!personId) return new Response(JSON.stringify({ error: "person_id required" }), { status: 400 });

  const { data, error } = await supabase
    .from("gotha_relations")
    .select("id, from_person_id, to_person_id, rel, note")
    .eq("user_id", user.id)
    .or(`from_person_id.eq.${personId},to_person_id.eq.${personId}`);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data ?? []), { headers: { "Content-Type": "application/json" } });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await request.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("gotha_relations")
    .insert({
      user_id: user.id,
      from_person_id: String(body.from_person_id),
      to_person_id: String(body.to_person_id),
      rel: String(body.rel ?? "other"),
      note: body.note ? String(body.note) : null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return new Response(JSON.stringify({ error: "Relation already exists" }), { status: 409 });
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data), { status: 201, headers: { "Content-Type": "application/json" } });
};

export const DELETE: APIRoute = async ({ cookies, request, url }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const id = url.searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });

  const { error } = await supabase
    .from("gotha_relations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
};
