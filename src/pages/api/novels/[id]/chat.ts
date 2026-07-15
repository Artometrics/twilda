import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import {
  getNovelFull,
  exportNovelText,
  getOrCreateChatThread,
  appendChatMessage,
} from "@/lib/novels/service";
import { callAiGateway, decrementCredit, refundCredit } from "@/lib/billing/credits";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const ok = await decrementCredit(user.id);
  if (!ok) {
    return new Response(JSON.stringify({ error: "No AI credits remaining. Upgrade your plan." }), {
      status: 402,
    });
  }

  const { message, promptId, threadId } = await request.json();
  const novel = await getNovelFull(supabase, user.id, params.id!);
  if (!novel) {
    await refundCredit(user.id);
    return new Response(JSON.stringify({ error: "Novel not found" }), { status: 404 });
  }

  const thread = await getOrCreateChatThread(supabase, user.id, params.id!, threadId);
  await appendChatMessage(supabase, thread.id, "user", message);

  const codexSummary = novel.codex
    .slice(0, 12)
    .map((e) => `- ${e.name} (${e.type}): ${e.summary}`)
    .join("\n");

  const manuscript = await exportNovelText(supabase, user.id, params.id!);
  const excerpt = manuscript.slice(0, 6000);

  const system = `You are Twilda, a novel-writing assistant. Novel: "${novel.title}" by ${novel.author}.
Synopsis: ${novel.synopsis}
Codex:
${codexSummary}
Manuscript excerpt:
${excerpt}`;

  const userMsg = promptId ? `${message}\n\n(Context prompt id: ${promptId})` : message;

  try {
    const reply = await callAiGateway(system, userMsg);
    await appendChatMessage(supabase, thread.id, "assistant", reply);
    return new Response(JSON.stringify({ reply, threadId: thread.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    await refundCredit(user.id);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "AI request failed" }),
      { status: 502 },
    );
  }
};
