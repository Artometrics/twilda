import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import {
  getNovelFull,
  exportNovelText,
  getOrCreateChatThread,
  appendChatMessage,
} from "@/lib/novels/service";
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

async function callAi(system: string, userMessage: string): Promise<string> {
  const gateway = "https://api.netlify.com/v1/ai/gateway/chat/completions";
  const res = await fetch(gateway, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "AI gateway unavailable");
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "No response generated.";
}

export const POST: APIRoute = async ({ cookies, params, request }) => {
  const supabase = createSupabaseServerClient(cookies);
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
  if (!novel) return new Response(JSON.stringify({ error: "Novel not found" }), { status: 404 });

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
    const reply = await callAi(system, userMsg);
    await appendChatMessage(supabase, thread.id, "assistant", reply);
    return new Response(JSON.stringify({ reply, threadId: thread.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "AI request failed" }),
      { status: 502 },
    );
  }
};
