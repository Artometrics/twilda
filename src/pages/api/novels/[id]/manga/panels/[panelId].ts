import type { APIRoute } from "astro";
import { dbErrorMessage } from "@/lib/auth/guards";
import {
  isMangaSetupError,
  updateMangaPanel,
  uploadMangaPanelImage,
  type MangaResearchLinkRow,
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

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("image");
      if (!(file instanceof File) || file.size === 0) {
        return new Response(JSON.stringify({ error: "image file required" }), { status: 400 });
      }
      const panel = await uploadMangaPanelImage(
        supabase,
        user.id,
        params.id!,
        params.panelId!,
        file,
      );
      return new Response(JSON.stringify({ panel }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: {
      caption?: string;
      dialogue?: string;
      sfx?: string;
      notes?: string;
      prompt?: string;
      negative_notes?: string;
      source_url?: string | null;
      higgsfield_job_id?: string | null;
      research_links?: MangaResearchLinkRow[];
    };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const panel = await updateMangaPanel(supabase, user.id, params.id!, params.panelId!, {
      caption: typeof body.caption === "string" ? body.caption : undefined,
      dialogue: typeof body.dialogue === "string" ? body.dialogue : undefined,
      sfx: typeof body.sfx === "string" ? body.sfx : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      prompt: typeof body.prompt === "string" ? body.prompt : undefined,
      negative_notes: typeof body.negative_notes === "string" ? body.negative_notes : undefined,
      source_url: body.source_url === undefined ? undefined : body.source_url,
      higgsfield_job_id:
        body.higgsfield_job_id === undefined ? undefined : body.higgsfield_job_id,
      research_links: Array.isArray(body.research_links) ? body.research_links : undefined,
    });
    return new Response(JSON.stringify({ panel }), {
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
