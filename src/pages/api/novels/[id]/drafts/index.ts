import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { createDraft, listDrafts, setActiveDraft } from "@/lib/novels/drafts";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  try {
    const drafts = await listDrafts(supabase, user.id, params.id!);
    return new Response(JSON.stringify(drafts), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Load failed" }),
      { status: 400 },
    );
  }
};

export const POST: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "activate" && body.draft_id) {
      await setActiveDraft(supabase, user.id, params.id!, String(body.draft_id));
      return new Response(JSON.stringify({ ok: true, active_draft_id: body.draft_id }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const draft = await createDraft(supabase, user.id, params.id!, {
      name: String(body.name ?? "New draft"),
      summary: body.summary ? String(body.summary) : "",
      slug: body.slug ? String(body.slug) : undefined,
      setActive: body.setActive !== false,
    });
    return new Response(JSON.stringify(draft), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Create failed" }),
      { status: 400 },
    );
  }
};
