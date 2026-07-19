import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Link, router } from "expo-router";
import { AuthGradient } from "@/components/AuthGradient";
import { useAuth } from "@/context/AuthContext";
import { Body, BrandMark, Button, Field } from "@/components/ui";
import { colors, space } from "@/constants/theme";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      Alert.alert("Check your email", "Confirm your address if required, then sign in.");
      router.replace("/login");
    } catch (e) {
      Alert.alert("Sign up failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGradient>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandMark />
          <Body muted>Create your Twilda workspace.</Body>
          <View style={styles.form}>
            <Field
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              secureTextEntry
              placeholder="Password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
            />
            <Button label="Create account" onPress={onSubmit} loading={loading} />
            <Link href="/login" style={styles.link}>
              Already have an account?
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
