import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CodexEntry, CoverKind, Novel } from "@/apps/novelcrafter/data";
import { gatsbySeed } from "@/lib/novels/seed";

type Client = SupabaseClient<Database>;

export interface DbNovelSummary {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  cover_kind: CoverKind;
  series_name: string | null;
  updated_at: string;
  last_opened_at: string | null;
}

export interface DbScene {
  id: string;
  chapter_id: string;
  sort_order: number;
  title: string;
  content: string;
}

export interface DbChapter {
  id: string;
  novel_id: string;
  sort_order: number;
  title: string;
  scenes: DbScene[];
}

export interface DbNovelFull extends DbNovelSummary {
  chapters: DbChapter[];
  codex: CodexEntry[];
}

function mapCodexRow(row: Database["public"]["Tables"]["codex_entries"]["Row"]): CodexEntry {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    initials: row.initials,
    color: "from-accent-400 to-accent-600",
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    summary: row.summary,
    description: row.description,
    aliases: Array.isArray(row.aliases) ? (row.aliases as string[]) : undefined,
    mentions: row.mentions,
  };
}

export async function listNovels(supabase: Client, userId: string): Promise<DbNovelSummary[]> {
  const { data, error } = await supabase
    .from("novels")
    .select("id, title, author, synopsis, cover_kind, series_name, updated_at, last_opened_at")
    .eq("user_id", userId)
    .eq("is_template", false)
    .order("last_opened_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as DbNovelSummary[];
}

export async function getNovelFull(
  supabase: Client,
  userId: string,
  novelId: string,
): Promise<DbNovelFull | null> {
  const { data: novel, error } = await supabase
    .from("novels")
    .select("id, title, author, synopsis, cover_kind, series_name, updated_at, last_opened_at")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!novel) return null;

  const { data: chapters, error: chErr } = await supabase
    .from("chapters")
    .select("id, novel_id, sort_order, title")
    .eq("novel_id", novelId)
    .order("sort_order");

  if (chErr) throw chErr;

  const chapterIds = (chapters ?? []).map((c) => c.id);
  let scenes: DbScene[] = [];
  if (chapterIds.length > 0) {
    const { data: sceneRows, error: scErr } = await supabase
      .from("scenes")
      .select("id, chapter_id, sort_order, title, content")
      .in("chapter_id", chapterIds)
      .order("sort_order");
    if (scErr) throw scErr;
    scenes = (sceneRows ?? []) as DbScene[];
  }

  const { data: codexRows, error: cxErr } = await supabase
    .from("codex_entries")
    .select("*")
    .eq("novel_id", novelId)
    .order("name");
  if (cxErr) throw cxErr;

  const chaptersWithScenes: DbChapter[] = (chapters ?? []).map((ch) => ({
    ...ch,
    scenes: scenes.filter((s) => s.chapter_id === ch.id).sort((a, b) => a.sort_order - b.sort_order),
  }));

  await supabase
    .from("novels")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", novelId);

  return {
    ...(novel as DbNovelSummary),
    chapters: chaptersWithScenes,
    codex: (codexRows ?? []).map(mapCodexRow),
  };
}

export async function createNovel(
  supabase: Client,
  userId: string,
  input?: Partial<{ title: string; author: string; cover_kind: CoverKind }>,
): Promise<string> {
  const { data: novel, error } = await supabase
    .from("novels")
    .insert({
      user_id: userId,
      title: input?.title ?? "Untitled Novel",
      author: input?.author ?? "",
      cover_kind: input?.cover_kind ?? "cardinal",
      synopsis: "",
    })
    .select("id")
    .single();

  if (error) throw error;

  const { data: chapter, error: chErr } = await supabase
    .from("chapters")
    .insert({ novel_id: novel.id, sort_order: 0, title: "Chapter I" })
    .select("id")
    .single();
  if (chErr) throw chErr;

  const { error: scErr } = await supabase.from("scenes").insert({
    chapter_id: chapter.id,
    sort_order: 0,
    title: "Scene 1",
    content: "",
  });
  if (scErr) throw scErr;

  return novel.id;
}

export async function updateNovelMetadata(
  supabase: Client,
  userId: string,
  novelId: string,
  patch: Partial<{ title: string; author: string; synopsis: string; series_name: string | null }>,
) {
  const { error } = await supabase
    .from("novels")
    .update(patch)
    .eq("id", novelId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateSceneContent(
  supabase: Client,
  userId: string,
  sceneId: string,
  content: string,
) {
  const { data: scene, error: findErr } = await supabase
    .from("scenes")
    .select("id, chapter_id")
    .eq("id", sceneId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!scene) throw new Error("Scene not found");

  const { data: chapter, error: chErr } = await supabase
    .from("chapters")
    .select("novel_id")
    .eq("id", scene.chapter_id)
    .maybeSingle();
  if (chErr) throw chErr;

  const { data: novel, error: nErr } = await supabase
    .from("novels")
    .select("id")
    .eq("id", chapter?.novel_id ?? "")
    .eq("user_id", userId)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!novel) throw new Error("Unauthorized");

  const { error } = await supabase.from("scenes").update({ content }).eq("id", sceneId);
  if (error) throw error;
}

export async function createCodexEntry(
  supabase: Client,
  userId: string,
  novelId: string,
  entry: {
    type: CodexEntry["type"];
    name: string;
    summary?: string;
    description?: string;
  },
) {
  const { data: novel, error: nErr } = await supabase
    .from("novels")
    .select("id")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!novel) throw new Error("Unauthorized");

  const initials =
    entry.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "??";

  const { data, error } = await supabase
    .from("codex_entries")
    .insert({
      novel_id: novelId,
      type: entry.type,
      name: entry.name,
      initials,
      summary: entry.summary ?? "",
      description: entry.description ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapCodexRow(data);
}

export async function importNovelFromText(
  supabase: Client,
  userId: string,
  title: string,
  text: string,
): Promise<string> {
  const novelId = await createNovel(supabase, userId, { title });

  const { data: chapter, error: chErr } = await supabase
    .from("chapters")
    .select("id")
    .eq("novel_id", novelId)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (chErr) throw chErr;
  if (!chapter) throw new Error("Chapter missing");

  const paragraphs = text.split(/\n{2,}/).filter(Boolean);
  const html = paragraphs.map((p) => `<p>${p.trim()}</p>`).join("");

  const { error } = await supabase
    .from("scenes")
    .update({ content: html || `<p>${text}</p>` })
    .eq("chapter_id", chapter.id)
    .eq("sort_order", 0);
  if (error) throw error;

  return novelId;
}

export async function exportNovelText(
  supabase: Client,
  userId: string,
  novelId: string,
): Promise<string> {
  const novel = await getNovelFull(supabase, userId, novelId);
  if (!novel) throw new Error("Novel not found");

  const lines = [`# ${novel.title}`, ""];
  for (const ch of novel.chapters) {
    lines.push(`## ${ch.title}`, "");
    for (const sc of ch.scenes) {
      const text = sc.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text) lines.push(text, "");
    }
  }
  return lines.join("\n");
}

/** Copy Gatsby demo into user library if they have no novels yet. */
export async function ensureStarterNovels(supabase: Client, userId: string) {
  const existing = await listNovels(supabase, userId);
  if (existing.length > 0) return;

  const { data: novel, error } = await supabase
    .from("novels")
    .insert({
      user_id: userId,
      title: gatsbySeed.title,
      author: gatsbySeed.author,
      synopsis: gatsbySeed.synopsis,
      cover_kind: gatsbySeed.cover,
      is_template: false,
    })
    .select("id")
    .single();
  if (error) throw error;

  for (const [ci, chapter] of gatsbySeed.chapters.entries()) {
    const { data: ch, error: chErr } = await supabase
      .from("chapters")
      .insert({ novel_id: novel.id, sort_order: ci, title: chapter.title })
      .select("id")
      .single();
    if (chErr) throw chErr;

    for (const [si, scene] of chapter.scenes.entries()) {
      const html = scene.text
        ? scene.text
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((p) => `<p>${p}</p>`)
            .join("")
        : "";
      const { error: scErr } = await supabase.from("scenes").insert({
        chapter_id: ch.id,
        sort_order: si,
        title: scene.title,
        content: html,
      });
      if (scErr) throw scErr;
    }
  }

  if (gatsbySeed.codex.length > 0) {
    const rows = gatsbySeed.codex.map((e) => ({
      novel_id: novel.id,
      type: e.type,
      name: e.name,
      initials: e.initials,
      tags: e.tags,
      aliases: e.aliases ?? [],
      summary: e.summary,
      description: e.description,
      mentions: e.mentions ?? 0,
    }));
    const { error: cxErr } = await supabase.from("codex_entries").insert(rows);
    if (cxErr) throw cxErr;
  }
}

export function formatUpdated(dateIso: string): string {
  const d = new Date(dateIso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function createChapter(
  supabase: Client,
  userId: string,
  novelId: string,
  title?: string,
): Promise<string> {
  const novel = await getNovelFull(supabase, userId, novelId);
  if (!novel) throw new Error("Novel not found");

  const sortOrder = novel.chapters.length;
  const { data, error } = await supabase
    .from("chapters")
    .insert({
      novel_id: novelId,
      sort_order: sortOrder,
      title: title ?? `Chapter ${sortOrder + 1}`,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: scErr } = await supabase.from("scenes").insert({
    chapter_id: data.id,
    sort_order: 0,
    title: "Scene 1",
    content: "",
  });
  if (scErr) throw scErr;

  return data.id;
}

export async function createScene(
  supabase: Client,
  userId: string,
  chapterId: string,
  title?: string,
): Promise<string> {
  const { data: chapter, error: chErr } = await supabase
    .from("chapters")
    .select("id, novel_id, sort_order")
    .eq("id", chapterId)
    .maybeSingle();
  if (chErr) throw chErr;
  if (!chapter) throw new Error("Chapter not found");

  const { data: novel, error: nErr } = await supabase
    .from("novels")
    .select("id")
    .eq("id", chapter.novel_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!novel) throw new Error("Unauthorized");

  const { count, error: countErr } = await supabase
    .from("scenes")
    .select("id", { count: "exact", head: true })
    .eq("chapter_id", chapterId);
  if (countErr) throw countErr;

  const sortOrder = count ?? 0;
  const { data, error } = await supabase
    .from("scenes")
    .insert({
      chapter_id: chapterId,
      sort_order: sortOrder,
      title: title ?? `Scene ${sortOrder + 1}`,
      content: "",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function listSnippets(supabase: Client, userId: string, novelId: string) {
  const { data: novel, error: nErr } = await supabase
    .from("novels")
    .select("id")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!novel) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("snippets")
    .select("id, title, content, updated_at")
    .eq("novel_id", novelId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSnippet(
  supabase: Client,
  userId: string,
  novelId: string,
  input: { title: string; content: string },
) {
  const { data: novel, error: nErr } = await supabase
    .from("novels")
    .select("id")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!novel) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("snippets")
    .insert({ novel_id: novelId, title: input.title, content: input.content })
    .select("id, title, content")
    .single();
  if (error) throw error;
  return data;
}

export async function listChatThreads(supabase: Client, userId: string, novelId: string) {
  const { data: novel, error: nErr } = await supabase
    .from("novels")
    .select("id")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!novel) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, title, updated_at")
    .eq("novel_id", novelId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateChatThread(
  supabase: Client,
  userId: string,
  novelId: string,
  threadId?: string,
) {
  const { data: novel, error: nErr } = await supabase
    .from("novels")
    .select("id")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!novel) throw new Error("Unauthorized");

  if (threadId) {
    const { data, error } = await supabase
      .from("chat_threads")
      .select("id, title")
      .eq("id", threadId)
      .eq("novel_id", novelId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const { data, error } = await supabase
    .from("chat_threads")
    .insert({ novel_id: novelId, title: "Chat" })
    .select("id, title")
    .single();
  if (error) throw error;
  return data;
}

export async function listChatMessages(supabase: Client, threadId: string) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function appendChatMessage(
  supabase: Client,
  threadId: string,
  role: "user" | "assistant",
  content: string,
) {
  const { error } = await supabase.from("chat_messages").insert({
    thread_id: threadId,
    role,
    content,
  });
  if (error) throw error;
  await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function dbNovelToLegacy(novel: DbNovelFull): Novel {
  return {
    id: novel.id,
    title: novel.title,
    author: novel.author,
    synopsis: novel.synopsis,
    cover: novel.cover_kind,
    series: novel.series_name ?? undefined,
    updated: formatUpdated(novel.updated_at),
    sortKey: Math.floor(new Date(novel.last_opened_at ?? novel.updated_at).getTime() / 1000),
    codex: novel.codex,
    chapters: novel.chapters.map((ch) => ({
      title: ch.title,
      scenes: ch.scenes.map((sc) => ({
        id: sc.id,
        title: sc.title,
        text: htmlToPlain(sc.content),
        content: sc.content,
      })),
    })),
  };
}
