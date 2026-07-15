import type { User } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/ssr";
import { isSafeInternalPath } from "@/lib/auth/safe-path";

export { isSafeInternalPath };

export async function getSessionUser(cookies: AstroCookies, request?: Request): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseServerClient(cookies, request);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export function getRedirectParam(url: URL, fallback = "/novels/"): string {
  const redirect = url.searchParams.get("redirect");
  return isSafeInternalPath(redirect) ? redirect : fallback;
}

export function getSafeNextParam(url: URL, fallback = "/novels/"): string {
  const next = url.searchParams.get("next");
  return isSafeInternalPath(next) ? next : fallback;
}
