import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import {
  createJournalEntry,
  formatJournalDate,
  listJournalEntries,
  type JournalEntry,
} from "@/lib/journal/service";
import { Body, Button, EmptyState, Screen } from "@/components/ui";
import { colors, space, typography } from "@/constants/theme";

export default function JournalScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<
    Pick<JournalEntry, "id" | "title" | "body" | "created_at" | "updated_at">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setEntries(await listJournalEntries(getSupabase(), user.id));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          setLoading(true);
          await load();
        } catch (e) {
          if (active) Alert.alert("Journal error", e instanceof Error ? e.message : "Failed to load");
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  async function onCreate() {
    if (!user) return;
    try {
      const entry = await createJournalEntry(getSupabase(), user.id);
      router.push(`/journal/${entry.id}`);
    } catch (e) {
      Alert.alert("Could not create entry", e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Body muted>Private notes — only you can see these.</Body>
        <Button label="New entry" onPress={onCreate} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accentDark} />
      ) : entries.length === 0 ? (
        <EmptyState title="No entries yet" body="Start a journal page for research, mood, or drafts." />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await load();
                } finally {
                  setRefreshing(false);
                }
              }}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/journal/${item.id}`)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.title}>{item.title || "Untitled"}</Text>
              <Text style={styles.date}>{formatJournalDate(item.updated_at)}</Text>
              {item.body ? (
                <Text style={styles.preview} numberOfLines={2}>
                  {item.body.replace(/<[^>]+>/g, "")}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: space.lg,
    gap: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  list: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  row: {
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 4,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 20,
    color: colors.ink,
  },
  date: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.muted,
  },
  preview: {
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.ink,
    marginTop: 4,
  },
});
