import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { getSupabase } from "@/lib/supabase/client";
import { ensureUserProfile } from "@/lib/auth/profile";
import { isSafeInternalPath } from "@/lib/auth/safe-path";
import { colors } from "@/constants/theme";

/** OAuth / magic-link callback — exchanges `code` for a session. */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; next?: string }>();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabase();
        if (params.code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            String(params.code),
          );
          if (exchangeError) throw exchangeError;
          if (data.user) await ensureUserProfile(supabase, data.user);
        }
        if (!cancelled) setDone(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Auth failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.code]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <Text style={{ color: colors.danger, fontFamily: "DMSans_400Regular" }}>{error}</Text>
      </View>
    );
  }

  if (!done) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.accentDark} />
      </View>
    );
  }

  const next =
    typeof params.next === "string" && isSafeInternalPath(params.next) ? params.next : "/novels";

  return <Redirect href={next as "/novels"} />;
}
