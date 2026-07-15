import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { getNovelFull, exportNovelText } from "@/lib/novels/service";
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
    return new Response(JSON.stringify({ error: "No AI credits remaining." }), { status: 402 });
  }

  const novel = await getNovelFull(supabase, user.id, params.id!);
  if (!novel) {
    await refundCredit(user.id);
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  const manuscript = await exportNovelText(supabase, user.id, params.id!);
  const wordCount = manuscript.split(/\s+/).filter(Boolean).length;
  const codexNotes = novel.codex
    .slice(0, 20)
    .map((e) => `- ${e.name} (${e.type}): ${e.summary}`)
    .join("\n");
  const excerpt = manuscript.slice(0, 8000);

  const system = `You are Twilda's manuscript Review assistant. Give concise, actionable feedback on consistency, pacing, and character clarity. Use short sections with bullet points. Do not invent plot that is not in the manuscript.`;

  const userMessage = `Review the novel "${novel.title}" by ${novel.author}.

Synopsis: ${novel.synopsis}

Codex (${novel.codex.length} entries):
${codexNotes || "(none yet)"}

Word count: ${wordCount.toLocaleString()}

Manuscript excerpt:
${excerpt}

Return:
1) Consistency notes
2) Pacing / structure
3) Character / Codex alignment
4) Suggested next steps (3–5 bullets)`;

  try {
    const feedback = await callAiGateway(system, userMessage, { maxTokens: 1000 });
    return new Response(JSON.stringify({ feedback }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    await refundCredit(user.id);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Review failed" }),
      { status: 502 },
    );
  }
};
