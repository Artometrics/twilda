import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { PLAN_NOVEL_LIMITS } from "@/lib/billing/plans";

type Client = SupabaseClient<Database>;

export async function assertCanCreateNovel(supabase: Client, userId: string): Promise<void> {
  const { data: subscription, error: subErr } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (subErr) throw subErr;

  const plan = subscription?.plan ?? "free";
  const limit = PLAN_NOVEL_LIMITS[plan];
  if (limit === null) return;

  const { count, error: countErr } = await supabase
    .from("novels")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_template", false);

  if (countErr) throw countErr;
  if ((count ?? 0) >= limit) {
    throw new Error(
      `Free plan allows up to ${limit} novels. Upgrade to Pro for unlimited projects.`,
    );
  }
}
