import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Link, router } from "expo-router";
import { AuthGradient } from "@/components/AuthGradient";
import { useAuth } from "@/context/AuthContext";
import { signInWithGoogle } from "@/lib/auth/google";
import { Body, BrandMark, Button, Field } from "@/components/ui";
import { colors, space } from "@/constants/theme";

export default function LoginScreen() {
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/novels");
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
      router.replace("/novels");
    } catch (e) {
      Alert.alert("Google sign-in failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGradient>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandMark />
          <Body muted>Your personal novel workspace — Library, Journal, and Codex.</Body>

          {!configured ? (
            <Body>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env</Body>
          ) : (
            <View style={styles.form}>
              <Field
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
              />
              <Field
                secureTextEntry
                autoComplete="password"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
              />
              <Button label="Sign in" onPress={onSubmit} loading={loading} />
              <Button label="Continue with Google" onPress={onGoogle} variant="secondary" disabled={loading} />
              <Link href="/signup" style={styles.link}>
                Create an account
              </Link>
              <Link href="/forgot" style={styles.linkMuted}>
                Forgot password?
              </Link>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: space.xl,
    gap: space.md,
  },
  form: { gap: space.md, marginTop: space.lg },
  link: {
    color: colors.accentDark,
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    textAlign: "center",
  },
  linkMuted: {
    color: colors.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
