import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

/** Current session user (client). */
export async function getSessionUser(): Promise<User | null> {
  const { data } = await getSupabase().auth.getUser();
  return data.user ?? null;
}
