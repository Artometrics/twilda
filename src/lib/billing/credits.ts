import { createServerClient } from "@/lib/supabase/server";

/**
 * Atomically consume one AI credit. Returns false when none remain.
 * Uses a compare-and-set update so concurrent requests cannot double-spend.
 */
export async function decrementCredit(userId: string): Promise<boolean> {
  const admin = createServerClient({ useServiceRole: true });
  const { data: sub } = await admin
    .from("subscriptions")
    .select("ai_credits_remaining")
    .eq("user_id", userId)
    .maybeSingle();

  const remaining = sub?.ai_credits_remaining ?? 0;
  if (remaining <= 0) return false;

  const { data: updated, error } = await admin
    .from("subscriptions")
    .update({ ai_credits_remaining: remaining - 1 })
    .eq("user_id", userId)
    .eq("ai_credits_remaining", remaining)
    .select("ai_credits_remaining")
    .maybeSingle();

  if (error) return false;
  return Boolean(updated);
}

/** Refund one credit after a failed AI call (best-effort). */
export async function refundCredit(userId: string): Promise<void> {
  const admin = createServerClient({ useServiceRole: true });
  const { data: sub } = await admin
    .from("subscriptions")
    .select("ai_credits_remaining")
    .eq("user_id", userId)
    .maybeSingle();

  const remaining = sub?.ai_credits_remaining ?? 0;
  await admin
    .from("subscriptions")
    .update({ ai_credits_remaining: remaining + 1 })
    .eq("user_id", userId)
    .eq("ai_credits_remaining", remaining);
}

/** Chat completions via Netlify AI Gateway (OpenAI-compatible). */
export async function callAiGateway(
  system: string,
  userMessage: string,
  options?: { maxTokens?: number },
): Promise<string> {
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
      max_tokens: options?.maxTokens ?? 800,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "AI gateway unavailable");
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "No response generated.";
}
