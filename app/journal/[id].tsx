import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import {
  deleteJournalEntry,
  getJournalEntry,
  updateJournalEntry,
} from "@/lib/journal/service";
import { Button, Field, Screen } from "@/components/ui";
import { colors, space } from "@/constants/theme";

export default function JournalEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const entry = await getJournalEntry(getSupabase(), user.id, id);
        if (!entry) {
          Alert.alert("Not found", "This entry no longer exists.");
          router.back();
          return;
        }
        setTitle(entry.title);
        setBody(entry.body);
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, id]);

  function scheduleSave(nextTitle: string, nextBody: string) {
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!user || !id) return;
      try {
        await updateJournalEntry(getSupabase(), user.id, id, {
          title: nextTitle,
          body: nextBody,
        });
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 600);
  }

  async function onDelete() {
    if (!user || !id) return;
    Alert.alert("Delete entry?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteJournalEntry(getSupabase(), user.id, id);
          router.replace("/journal");
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen style={{ alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accentDark} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Stack.Screen
        options={{
          title: title || "Entry",
          headerRight: () => (
            <Button
              label={saveState === "saving" ? "…" : "Delete"}
              variant="ghost"
              onPress={onDelete}
            />
          ),
        }}
      />
      <Field
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          scheduleSave(t, body);
        }}
        placeholder="Title"
        style={styles.title}
      />
      <Field
        value={body}
        onChangeText={(t) => {
          setBody(t);
          scheduleSave(title, t);
        }}
        placeholder="Write freely…"
        multiline
        style={styles.body}
      />
      <View style={{ height: space.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg },
  title: {
    fontFamily: "Literata_600SemiBold",
    fontSize: 26,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
  },
  body: {
    flex: 1,
    minHeight: 360,
    marginTop: space.md,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    textAlignVertical: "top",
    fontSize: 17,
    lineHeight: 28,
  },
});
