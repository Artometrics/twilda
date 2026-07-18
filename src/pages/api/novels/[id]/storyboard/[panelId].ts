import type { APIRoute } from "astro";
import { dbErrorMessage } from "@/lib/auth/guards";
import {
  deleteStoryboardPanel,
  isStoryboardSetupError,
  reorderStoryboardPanel,
  updateStoryboardPanel,
  uploadStoryboardImage,
} from "@/lib/novels/storyboard";
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
      const panel = await uploadStoryboardImage(
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
      prompt?: string;
      sort_order?: number;
      move?: "up" | "down";
    };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    if (body.move === "up" || body.move === "down") {
      const panels = await reorderStoryboardPanel(
        supabase,
        user.id,
        params.id!,
        params.panelId!,
        body.move,
      );
      return new Response(JSON.stringify({ panels }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const panel = await updateStoryboardPanel(supabase, user.id, params.id!, params.panelId!, {
      caption: typeof body.caption === "string" ? body.caption : undefined,
      prompt: typeof body.prompt === "string" ? body.prompt : undefined,
      sort_order: typeof body.sort_order === "number" ? body.sort_order : undefined,
    });
    return new Response(JSON.stringify({ panel }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: isStoryboardSetupError(message) ? 503 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    await deleteStoryboardPanel(supabase, user.id, params.id!, params.panelId!);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: isStoryboardSetupError(message) ? 503 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
