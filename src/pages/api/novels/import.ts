import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { importNovelFromText } from "@/lib/novels/service";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const title = form.get("title")?.toString() || "Imported Novel";

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "file required" }), { status: 400 });
  }

  try {
    const text = await file.text();
    const id = await importNovelFromText(supabase, user.id, title, text);
    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Import failed" }),
      { status: 500 },
    );
  }
};
