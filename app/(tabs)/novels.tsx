import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import {
  createNovel,
  formatUpdated,
  listNovels,
  type DbNovelSummary,
} from "@/lib/novels/service";
import { CoverTile } from "@/components/CoverTile";
import { Body, BrandMark, Button, EmptyState, Screen } from "@/components/ui";
import { colors, space, typography } from "@/constants/theme";

export default function LibraryScreen() {
  const { user } = useAuth();
  const [novels, setNovels] = useState<DbNovelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    // Lazy-load starter manuscripts so auth routes stay light.
    const { ensureStarterNovels } = await import("@/lib/novels/starters");
    await ensureStarterNovels(supabase, user.id);
    const rows = await listNovels(supabase, user.id);
    setNovels(rows);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          setLoading(true);
          await load();
        } catch (e) {
          if (active) {
            Alert.alert("Library error", e instanceof Error ? e.message : "Failed to load");
          }
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function onCreate() {
    if (!user) return;
    try {
      const id = await createNovel(getSupabase(), user.id);
      router.push(`/novels/${id}`);
    } catch (e) {
      Alert.alert("Could not create novel", e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BrandMark size="sm" />
        <Body muted>Plan, write, and keep your Codex in one place.</Body>
        <Button label="New novel" onPress={onCreate} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accentDark} />
      ) : novels.length === 0 ? (
        <EmptyState title="No novels yet" body="Create a blank novel or open a starter when they seed." />
      ) : (
        <FlatList
          data={novels}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>
              {novels.length} {novels.length === 1 ? "novel" : "novels"}
            </Text>
          }
          renderItem={({ item }) => (
            <CoverTile
              title={item.title}
              author={item.author}
              coverKind={item.cover_kind}
              updated={formatUpdated(item.last_opened_at ?? item.updated_at)}
              onPress={() => router.push(`/novels/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  list: { padding: space.lg, paddingBottom: 48 },
  row: { justifyContent: "space-between" },
  sectionLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: colors.muted,
    marginBottom: space.md,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
