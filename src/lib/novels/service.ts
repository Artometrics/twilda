import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CodexEntry, CoverKind, Novel } from "@/apps/novelcrafter/data";
import {
  ensureDefaultDraft,
  getActiveDraftId,
  listDrafts,
  setActiveDraft,
  type DbDraft,
} from "@/lib/novels/drafts";

type Client = SupabaseClient<Database>;

export interface DbNovelSummary {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  cover_kind: CoverKind;
  series_name: string | null;
  is_template: boolean;
  active_draft_id: string | null;
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
  draft_id: string | null;
  sort_order: number;
  title: string;
  scenes: DbScene[];
}

export interface DbNovelFull extends DbNovelSummary {
  chapters: DbChapter[];
  codex: CodexEntry[];
  active_draft: DbDraft | null;
  drafts: DbDraft[];
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
    .select(
      "id, title, author, synopsis, cover_kind, series_name, is_template, active_draft_id, updated_at, last_opened_at",
    )
    .eq("user_id", userId)
    .order("last_opened_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as DbNovelSummary[];
}

/**
 * Classic starter badge: prefer `is_template`.
 * Starters are seeded with cover_kind in (gatsby, trinity, cardinal) and is_template=true —
 * cover_kind alone cannot be used because user novels also use those covers.
 */
export function isClassicTemplate(novel: {
  is_template?: boolean;
  cover_kind?: CoverKind;
}): boolean {
  return novel.is_template === true;
}

export async function getNovelFull(
  supabase: Client,
  userId: string,
  novelId: string,
  draftId?: string | null,
): Promise<DbNovelFull | null> {
  const { data: novel, error } = await supabase
    .from("novels")
    .select(
      "id, title, author, synopsis, cover_kind, series_name, active_draft_id, updated_at, last_opened_at",
    )
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!novel) return null;

  const drafts = await listDrafts(supabase, userId, novelId);
  let active =
    (draftId ? drafts.find((d) => d.id === draftId) : null) ??
    drafts.find((d) => d.id === novel.active_draft_id) ??
    drafts[0] ??
    null;

  if (!active) {
    active = await ensureDefaultDraft(supabase, userId, novelId);
  } else if (draftId && draftId !== novel.active_draft_id) {
    await setActiveDraft(supabase, userId, novelId, active.id);
  } else if (!novel.active_draft_id) {
    await setActiveDraft(supabase, userId, novelId, active.id);
  }

  const { data: chapters, error: chErr } = await supabase
    .from("chapters")
    .select("id, novel_id, draft_id, sort_order, title")
    .eq("novel_id", novelId)
    .eq("draft_id", active.id)
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
    .eq("draft_id", active.id)
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
    active_draft_id: active.id,
    chapters: chaptersWithScenes,
    codex: (codexRows ?? []).map(mapCodexRow),
    active_draft: active,
    drafts: await listDrafts(supabase, userId, novelId),
  };
}

async function createBlankChapter(
  supabase: Client,
  novelId: string,
  draftId: string,
  title = "Chapter I",
) {
  const { data: chapter, error: chErr } = await supabase
    .from("chapters")
    .insert({ novel_id: novelId, draft_id: draftId, sort_order: 0, title })
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
  return chapter.id;
}

export async function createNovel(
  supabase: Client,
  userId: string,
  input?: Partial<{ title: string; author: string; cover_kind: CoverKind }>,
): Promise<string> {
  const title = input?.title ?? "Untitled Novel";
  const coverKind = input?.cover_kind ?? "plain";

  const { data: novel, error } = await supabase
    .from("novels")
    .insert({
      user_id: userId,
      title,
      author: input?.author ?? "",
      cover_kind: coverKind,
      synopsis: "",
    })
    .select("id")
    .single();

  if (error) throw error;

  if (isTrinityNovel(title, coverKind)) {
    const { ensureTrinityDrafts } = await import("@/lib/novels/starters");
    await ensureTrinityDrafts(supabase, userId, novel.id);
    return novel.id;
  }

  const draft = await ensureDefaultDraft(supabase, userId, novel.id);
  await createBlankChapter(supabase, novel.id, draft.id);
  return novel.id;
}

function isTrinityNovel(title: string, coverKind: CoverKind): boolean {
  return coverKind === "trinity" || title.toLowerCase().includes("trinity");
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

export async function deleteNovel(supabase: Client, userId: string, novelId: string) {
  const { error } = await supabase.from("novels").delete().eq("id", novelId).eq("user_id", userId);
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
    .select("id, active_draft_id")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!novel) throw new Error("Unauthorized");

  let draftId = novel.active_draft_id;
  if (!draftId) {
    draftId = (await ensureDefaultDraft(supabase, userId, novelId)).id;
  }

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
      draft_id: draftId,
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
  const draftId = (await getActiveDraftId(supabase, novelId)) ??
    (await ensureDefaultDraft(supabase, userId, novelId)).id;

  const { data: chapter, error: chErr } = await supabase
    .from("chapters")
    .select("id")
    .eq("novel_id", novelId)
    .eq("draft_id", draftId)
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
  if (novel.active_draft) {
    lines.push(`> Draft: ${novel.active_draft.name}`, "");
  }
  for (const ch of novel.chapters) {
    lines.push(`## ${ch.title}`, "");
    for (const sc of ch.scenes) {
      const text = sc.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text) lines.push(text, "");
    }
  }
  return lines.join("\n");
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
  const draftId = novel.active_draft?.id ?? (await ensureDefaultDraft(supabase, userId, novelId)).id;

  const sortOrder = novel.chapters.length;
  const { data, error } = await supabase
    .from("chapters")
    .insert({
      novel_id: novelId,
      draft_id: draftId,
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
    .select("id, active_draft_id")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!novel) throw new Error("Unauthorized");

  let draftId = novel.active_draft_id;
  if (!draftId) {
    draftId = (await ensureDefaultDraft(supabase, userId, novelId)).id;
  }

  const { data, error } = await supabase
    .from("snippets")
    .select("id, title, content, updated_at")
    .eq("novel_id", novelId)
    .eq("draft_id", draftId)
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
    .select("id, active_draft_id")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (nErr) throw nErr;
  if (!novel) throw new Error("Unauthorized");

  let draftId = novel.active_draft_id;
  if (!draftId) {
    draftId = (await ensureDefaultDraft(supabase, userId, novelId)).id;
  }

  const { data, error } = await supabase
    .from("snippets")
    .insert({
      novel_id: novelId,
      draft_id: draftId,
      title: input.title,
      content: input.content,
    })
    .select("id, title, content")
    .single();
  if (error) throw error;
  return data;
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

function htmlToPlain(html: string): string {
  return html
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export {
  ensureStarterNovels,
  ensureTrinityDrafts,
  seedTrinityIfEmpty,
} from "@/lib/novels/starters";
