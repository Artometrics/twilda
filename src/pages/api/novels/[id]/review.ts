import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { getNovelFull, exportNovelText } from "@/lib/novels/service";
import { createServerClient } from "@/lib/supabase/server";

export const prerender = false;

async function decrementCredit(userId: string): Promise<boolean> {
  const admin = createServerClient({ useServiceRole: true });
  const { data: sub } = await admin
    .from("subscriptions")
    .select("ai_credits_remaining")
    .eq("user_id", userId)
    .maybeSingle();
  const remaining = sub?.ai_credits_remaining ?? 0;
  if (remaining <= 0) return false;
  await admin
    .from("subscriptions")
    .update({ ai_credits_remaining: remaining - 1 })
    .eq("user_id", userId);
  return true;
}

export const POST: APIRoute = async ({ cookies, params }) => {
  const supabase = createSupabaseServerClient(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const ok = await decrementCredit(user.id);
  if (!ok) {
    return new Response(JSON.stringify({ error: "No AI credits remaining." }), { status: 402 });
  }

  const novel = await getNovelFull(supabase, user.id, params.id!);
  if (!novel) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

  const manuscript = await exportNovelText(supabase, user.id, params.id!);
  const codexNotes = novel.codex.map((e) => `${e.name}: ${e.summary}`).join("\n");

  const feedback = [
    `Review for "${novel.title}"`,
    "",
    "Consistency notes:",
    `- ${novel.codex.length} Codex entries tracked.`,
    `- Manuscript length: ${manuscript.split(/\s+/).filter(Boolean).length.toLocaleString()} words.`,
    "",
    "Codex highlights:",
    codexNotes.slice(0, 2000) || "(none yet)",
    "",
    "Suggested next steps:",
    "1. Verify character names match Codex spelling.",
    "2. Check scene transitions between chapters.",
    "3. Run Chat mode to brainstorm fixes for any plot holes you notice.",
  ].join("\n");

  return new Response(JSON.stringify({ feedback }), {
    headers: { "Content-Type": "application/json" },
  });
};
