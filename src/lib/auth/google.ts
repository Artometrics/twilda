import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";
import { getSupabase } from "@/lib/supabase/client";
import { isSafeInternalPath } from "@/lib/auth/safe-path";
import { getSiteUrl } from "@/lib/supabase/env";

WebBrowser.maybeCompleteAuthSession();

function oauthRedirectTo(nextPath: string): string {
  const next = isSafeInternalPath(nextPath) ? nextPath : "/novels";
  if (Platform.OS === "web") {
    return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
  }
  return makeRedirectUri({
    scheme: "twilda",
    path: "auth/callback",
    queryParams: { next },
  });
}

/** Start Google OAuth via Supabase (opens system browser / web redirect). */
export async function signInWithGoogle(redirectPath = "/novels"): Promise<void> {
  const supabase = getSupabase();
  const redirectTo = oauthRedirectTo(redirectPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== "web",
    },
  });

  if (error) throw error;

  if (Platform.OS === "web") {
    return;
  }

  if (!data.url) throw new Error("No OAuth URL returned");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !result.url) return;

  const url = Linking.parse(result.url);
  const code = typeof url.queryParams?.code === "string" ? url.queryParams.code : null;
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }
}
