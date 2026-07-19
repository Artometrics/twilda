import type { APIRoute } from "astro";
import { dbErrorMessage } from "@/lib/auth/guards";
import {
  compositeMangaPage,
  isMangaSetupError,
  updateMangaPage,
} from "@/lib/novels/manga";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

export const PATCH: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: {
    title?: string;
    summary?: string;
    script_notes?: string;
    composite?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  try {
    if (body.composite) {
      const page = await compositeMangaPage(
        supabase,
        user.id,
        params.id!,
        params.pageId!,
      );
      return new Response(JSON.stringify({ page }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const page = await updateMangaPage(supabase, user.id, params.id!, params.pageId!, {
      title: typeof body.title === "string" ? body.title : undefined,
      summary: typeof body.summary === "string" ? body.summary : undefined,
      script_notes: typeof body.script_notes === "string" ? body.script_notes : undefined,
    });
    return new Response(JSON.stringify({ page }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: isMangaSetupError(message) ? 503 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
