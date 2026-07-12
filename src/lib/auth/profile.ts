import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.display_name === "string" && meta.display_name);
  if (fromMeta) return fromMeta;
  const email = user.email ?? "";
  const local = email.split("@")[0]?.trim();
  return local || "Writer";
}

async function ensureUserSubscription(supabase: Client, userId: string): Promise<void> {
  const { data: subscription, error: readErr } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr) throw readErr;
  if (subscription) return;

  const { error: insertErr } = await supabase.from("subscriptions").insert({ user_id: userId });
  if (insertErr) throw insertErr;
}

/** Ensure profiles and subscriptions exist for OAuth / legacy users. */
export async function ensureUserProfile(supabase: Client, user: User): Promise<void> {
  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr) throw readErr;

  if (!profile) {
    const { error: insertErr } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: displayNameFromUser(user),
    });
    if (insertErr) throw insertErr;
  }

  await ensureUserSubscription(supabase, user.id);
}
