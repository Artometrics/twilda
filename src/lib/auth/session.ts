import type { User } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/ssr";

export async function getSessionUser(cookies: AstroCookies): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseServerClient(cookies);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export function getRedirectParam(url: URL): string {
  const redirect = url.searchParams.get("redirect");
  if (!redirect || !redirect.startsWith("/")) return "/novels/";
  return redirect;
}
