import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import { AuthGradient } from "@/components/AuthGradient";
import { getSupabase } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/supabase/env";
import { Body, BrandMark, Button, Field } from "@/components/ui";
import { colors, space } from "@/constants/theme";

export default function ForgotScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${getSiteUrl()}/login`,
      });
      if (error) throw error;
      Alert.alert("Email sent", "Check your inbox for a reset link.");
    } catch (e) {
      Alert.alert("Reset failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGradient>
      <ScrollView contentContainerStyle={styles.content}>
        <BrandMark />
        <Body muted>We’ll email you a link to reset your password.</Body>
        <View style={styles.form}>
          <Field
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
          />
          <Button label="Send reset link" onPress={onSubmit} loading={loading} />
          <Link href="/login" style={styles.link}>
            Back to sign in
          </Link>
        </View>
      </ScrollView>
    </AuthGradient>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", padding: space.xl, gap: space.md },
  form: { gap: space.md, marginTop: space.lg },
  link: {
    color: colors.accentDark,
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    textAlign: "center",
  },
});
