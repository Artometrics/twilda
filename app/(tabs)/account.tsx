import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import { Body, BrandMark, Button, Field, Screen } from "@/components/ui";
import { colors, space } from "@/constants/theme";

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [penName, setPenName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await getSupabase()
        .from("profiles")
        .select("display_name, pen_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setPenName(data.pen_name ?? "");
      }
    })();
  }, [user]);

  async function onSave() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await getSupabase()
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          pen_name: penName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
      Alert.alert("Saved", "Profile updated.");
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function onSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <Screen style={styles.screen}>
      <BrandMark size="sm" />
      <Body muted>{user?.email}</Body>

      <View style={styles.form}>
        <Field placeholder="Display name" value={displayName} onChangeText={setDisplayName} />
        <Field placeholder="Pen name" value={penName} onChangeText={setPenName} />
        <Button label="Save profile" onPress={onSave} loading={saving} />
        <Button label="Sign out" onPress={onSignOut} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: space.lg,
    gap: space.md,
  },
  form: {
    marginTop: space.md,
    gap: space.md,
    maxWidth: 480,
    width: "100%",
  },
});
