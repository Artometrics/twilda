import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import {
  createChapter,
  createCodexEntry,
  createScene,
  deleteNovel,
  getNovelFull,
  updateNovelMetadata,
  updateSceneContent,
  type DbNovelFull,
} from "@/lib/novels/service";
import {
  createStoryboardPanel,
  listStoryboardPanels,
  type StoryboardPanel,
} from "@/lib/novels/storyboard";
import { Button, Field, Screen } from "@/components/ui";
import { colors, space, typography } from "@/constants/theme";
import type { CodexEntry } from "@/apps/novelcrafter/data";

type Mode = "plan" | "write" | "board" | "settings" | "codex";

const MODES: { id: Mode; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "write", label: "Write" },
  { id: "board", label: "Board" },
  { id: "codex", label: "Codex" },
  { id: "settings", label: "Settings" },
];

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function toHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export default function NovelWorkspace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [novel, setNovel] = useState<DbNovelFull | null>(null);
  const [mode, setMode] = useState<Mode>("write");
  const [loading, setLoading] = useState(true);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [sceneText, setSceneText] = useState("");
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!user || !id) return;
    const data = await getNovelFull(getSupabase(), user.id, id);
    setNovel(data);
    const firstScene = data?.chapters[0]?.scenes[0];
    if (firstScene) {
      setActiveSceneId(firstScene.id);
      setSceneText(stripHtml(firstScene.content || ""));
    }
    if (data) {
      const board = await listStoryboardPanels(
        getSupabase(),
        user.id,
        id,
        data.active_draft_id,
      );
      setPanels(board);
    }
  }, [user, id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        if (active) Alert.alert("Workspace error", e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const activeScene = useMemo(() => {
    if (!novel || !activeSceneId) return null;
    for (const ch of novel.chapters) {
      const scene = ch.scenes.find((s) => s.id === activeSceneId);
      if (scene) return { chapter: ch, scene };
    }
    return null;
  }, [novel, activeSceneId]);

  function selectScene(sceneId: string, content: string) {
    setActiveSceneId(sceneId);
    setSceneText(stripHtml(content || ""));
    setMode("write");
  }

  function onSceneChange(text: string) {
    setSceneText(text);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!user || !activeSceneId) return;
      try {
        await updateSceneContent(getSupabase(), user.id, activeSceneId, toHtml(text));
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 700);
  }

  async function onAddChapter() {
    if (!user || !id) return;
    await createChapter(getSupabase(), user.id, id);
    await load();
  }

  async function onAddScene(chapterId: string) {
    if (!user) return;
    const sceneId = await createScene(getSupabase(), user.id, chapterId);
    await load();
    setActiveSceneId(sceneId);
    setSceneText("");
    setMode("write");
  }

  async function onAddPanel() {
    if (!user || !id || !novel) return;
    await createStoryboardPanel(getSupabase(), user.id, id, novel.active_draft_id);
    const board = await listStoryboardPanels(
      getSupabase(),
      user.id,
      id,
      novel.active_draft_id,
    );
    setPanels(board);
  }

  async function onAddCodex() {
    if (!user || !id) return;
    await createCodexEntry(getSupabase(), user.id, id, {
      type: "character",
      name: "New character",
      summary: "",
      description: "",
    });
    await load();
  }

  async function onSaveSettings(patch: {
    title: string;
    author: string;
    synopsis: string;
    series_name: string;
  }) {
    if (!user || !id) return;
    await updateNovelMetadata(getSupabase(), user.id, id, {
      title: patch.title,
      author: patch.author,
      synopsis: patch.synopsis,
      series_name: patch.series_name.trim() || null,
    });
    await load();
    Alert.alert("Saved", "Novel settings updated.");
  }

  async function onDelete() {
    if (!user || !id) return;
    Alert.alert("Delete novel?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteNovel(getSupabase(), user.id, id);
          router.replace("/novels");
        },
      },
    ]);
  }

  if (loading || !novel) {
    return (
      <Screen style={{ alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ title: "Workspace" }} />
        <ActivityIndicator color={colors.accentDark} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: novel.title,
          headerRight: () => (
            <Text style={styles.saveHint}>
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
            </Text>
          ),
        }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.modeBar}
        contentContainerStyle={styles.modeBarContent}
      >
        {MODES.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => setMode(m.id)}
            style={[styles.modeChip, mode === m.id && styles.modeChipActive]}
          >
            <Text style={[styles.modeChipText, mode === m.id && styles.modeChipTextActive]}>
              {m.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {mode === "plan" && (
        <ScrollView contentContainerStyle={styles.pad}>
          {novel.chapters.map((ch) => (
            <View key={ch.id} style={styles.chapterBlock}>
              <Text style={styles.chapterTitle}>{ch.title}</Text>
              {ch.scenes.map((sc) => (
                <Pressable key={sc.id} onPress={() => selectScene(sc.id, sc.content)} style={styles.sceneRow}>
                  <Text style={styles.sceneTitle}>{sc.title || "Untitled scene"}</Text>
                  <Text style={styles.sceneWords}>
                    {stripHtml(sc.content || "").split(/\s+/).filter(Boolean).length} words
                  </Text>
                </Pressable>
              ))}
              <Button label="Add scene" variant="ghost" onPress={() => onAddScene(ch.id)} />
            </View>
          ))}
          <Button label="Add chapter" onPress={onAddChapter} />
        </ScrollView>
      )}

      {mode === "write" && (
        <View style={styles.writeWrap}>
          <Text style={styles.writeMeta}>
            {activeScene
              ? `${activeScene.chapter.title} · ${activeScene.scene.title || "Scene"}`
              : "Select a scene in Plan"}
          </Text>
          <TextInput
            style={styles.editor}
            multiline
            textAlignVertical="top"
            placeholder="Begin writing…"
            placeholderTextColor={colors.muted}
            value={sceneText}
            onChangeText={onSceneChange}
            editable={Boolean(activeSceneId)}
          />
        </View>
      )}

      {mode === "board" && (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.sectionIntro}>Storyboard panels for this draft.</Text>
          {panels.map((p) => (
            <View key={p.id} style={styles.panel}>
              <Text style={styles.panelCaption}>{p.caption || "Untitled panel"}</Text>
              {p.prompt ? <Text style={styles.panelPrompt}>{p.prompt}</Text> : null}
            </View>
          ))}
          <Button label="Add panel" onPress={onAddPanel} />
        </ScrollView>
      )}

      {mode === "codex" && (
        <ScrollView contentContainerStyle={styles.pad}>
          <CodexList entries={novel.codex} />
          <Button label="Add character" onPress={onAddCodex} />
        </ScrollView>
      )}

      {mode === "settings" && (
        <SettingsForm novel={novel} onSave={onSaveSettings} onDelete={onDelete} />
      )}
    </Screen>
  );
}

function CodexList({ entries }: { entries: CodexEntry[] }) {
  const groups: Record<string, CodexEntry[]> = {};
  for (const e of entries) {
    (groups[e.type] ??= []).push(e);
  }
  const order = ["character", "location", "lore", "other"] as const;
  return (
    <View style={{ gap: space.lg }}>
      {order.map((type) => {
        const list = groups[type];
        if (!list?.length) return null;
        return (
          <View key={type} style={{ gap: space.sm }}>
            <Text style={styles.sectionLabel}>{type}</Text>
            {list.map((e) => (
              <View key={e.id} style={styles.codexCard}>
                <Text style={styles.codexName}>{e.name}</Text>
                {e.summary ? <Text style={styles.codexSummary}>{e.summary}</Text> : null}
              </View>
            ))}
          </View>
        );
      })}
      {entries.length === 0 ? (
        <Text style={styles.sectionIntro}>No Codex entries yet.</Text>
      ) : null}
    </View>
  );
}

function SettingsForm({
  novel,
  onSave,
  onDelete,
}: {
  novel: DbNovelFull;
  onSave: (patch: { title: string; author: string; synopsis: string; series_name: string }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(novel.title);
  const [author, setAuthor] = useState(novel.author);
  const [synopsis, setSynopsis] = useState(novel.synopsis);
  const [series, setSeries] = useState(novel.series_name ?? "");

  useEffect(() => {
    setTitle(novel.title);
    setAuthor(novel.author);
    setSynopsis(novel.synopsis);
    setSeries(novel.series_name ?? "");
  }, [novel]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <View style={{ gap: space.md }}>
        <Field value={title} onChangeText={setTitle} placeholder="Title" />
        <Field value={author} onChangeText={setAuthor} placeholder="Author" />
        <Field value={series} onChangeText={setSeries} placeholder="Series" />
        <Field
          value={synopsis}
          onChangeText={setSynopsis}
          placeholder="Synopsis"
          multiline
          style={{ minHeight: 120, textAlignVertical: "top" }}
        />
        <Button
          label="Save settings"
          onPress={() => onSave({ title, author, synopsis, series_name: series })}
        />
        <Button label="Delete novel" variant="danger" onPress={onDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modeBar: { maxHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  modeBarContent: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.paperDeep,
  },
  modeChipActive: { backgroundColor: colors.accentDark },
  modeChipText: { fontFamily: typography.bodyMedium, color: colors.ink, fontSize: 14 },
  modeChipTextActive: { color: colors.white },
  pad: { padding: space.lg, gap: space.md, paddingBottom: 64 },
  chapterBlock: { gap: space.sm, marginBottom: space.md },
  chapterTitle: { fontFamily: typography.display, fontSize: 20, color: colors.ink },
  sceneRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
  },
  sceneTitle: { fontFamily: typography.bodyMedium, color: colors.ink, flex: 1 },
  sceneWords: { fontFamily: typography.body, color: colors.muted, fontSize: 13 },
  writeWrap: { flex: 1, padding: space.lg },
  writeMeta: {
    fontFamily: typography.bodyMedium,
    color: colors.muted,
    fontSize: 13,
    marginBottom: space.sm,
  },
  editor: {
    flex: 1,
    fontFamily: typography.display,
    fontSize: 18,
    lineHeight: 30,
    color: colors.ink,
    minHeight: 320,
  },
  sectionIntro: { fontFamily: typography.body, color: colors.muted, marginBottom: space.sm },
  sectionLabel: {
    fontFamily: typography.bodyBold,
    fontSize: 12,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  panel: {
    padding: space.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    marginBottom: space.sm,
    gap: 4,
  },
  panelCaption: { fontFamily: typography.bodyMedium, color: colors.ink },
  panelPrompt: { fontFamily: typography.body, color: colors.muted, fontSize: 14 },
  codexCard: {
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 4,
  },
  codexName: { fontFamily: typography.display, fontSize: 18, color: colors.ink },
  codexSummary: { fontFamily: typography.body, color: colors.muted, fontSize: 14 },
  saveHint: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.muted,
    marginRight: 8,
  },
});
