import { createSupabaseBrowserClient } from "@/lib/supabase/ssr";

/** Start Google OAuth via Supabase. Redirects the browser to Google. */
export async function signInWithGoogle(redirectPath = "/novels/"): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const next = redirectPath.startsWith("/") ? redirectPath : "/novels/";
  const redirectTo = `${window.location.origin}/auth/callback/?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) throw error;
}
