import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { exportNovelText, listNovels } from "@/lib/novels/service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const novels = await listNovels(supabase, user.id);
  const manuscripts: Record<string, string> = {};

  for (const novel of novels) {
    try {
      manuscripts[novel.id] = await exportNovelText(supabase, user.id, novel.id);
    } catch {
      manuscripts[novel.id] = "";
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, pen_name, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const payload = {
    exportedAt: new Date().toISOString(),
    profile,
    novels: novels.map((n) => ({
      id: n.id,
      title: n.title,
      author: n.author,
      synopsis: n.synopsis,
      updated_at: n.updated_at,
    })),
    manuscripts,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="twilda-export.json"',
      "Cache-Control": "no-store",
    },
  });
};
