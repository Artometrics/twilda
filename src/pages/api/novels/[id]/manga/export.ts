import type { APIRoute } from "astro";
import { dbErrorMessage } from "@/lib/auth/guards";
import {
  exportMangaPdf,
  exportMangaZip,
  isMangaSetupError,
} from "@/lib/novels/manga";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, params, url }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const draftId = url.searchParams.get("draft");
  const format = (url.searchParams.get("format") || "zip") as "zip" | "cbz" | "pdf";
  const sequenceParam = url.searchParams.get("sequence");
  const sequence = sequenceParam ? Number(sequenceParam) : undefined;

  try {
    if (format === "pdf") {
      const { bytes, filename } = await exportMangaPdf(
        supabase,
        user.id,
        params.id!,
        draftId,
        sequence,
      );
      return new Response(new Uint8Array(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const { bytes, filename, contentType } = await exportMangaZip(
      supabase,
      user.id,
      params.id!,
      draftId,
      { sequence, format: format === "cbz" ? "cbz" : "zip" },
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: isMangaSetupError(message) ? 503 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
