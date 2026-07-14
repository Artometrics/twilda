import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CodexEntry, CoverKind, Novel } from "@/apps/novelcrafter/data";
import { gatsbySeed } from "@/lib/novels/seed";
import { cardinalSeed, cardinalDraftMeta } from "@/lib/novels/cardinal-seed";
import {
  trinityV2Seed,
  trinityV2Snippets,
  trinityV2DraftMeta,
} from "@/lib/novels/trinity-seed";
import { trinityV1Seed, trinityV1Snippets, trinityV1DraftMeta } from "@/lib/novels/trinity-v1-seed";
import {
  addDraftReference,
  ensureDefaultDraft,
  getActiveDraftId,
  listDrafts,
  seedDraftContent,
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
      "id, title, author, synopsis, cover_kind, series_name, active_draft_id, updated_at, last_opened_at",
    )
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
  const coverKind = input?.cover_kind ?? "cardinal";

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

/** Seed both Trinity timelines (v1 metafiction + v2 series bible) when missing. */
export async function ensureTrinityDrafts(
  supabase: Client,
  userId: string,
  novelId: string,
): Promise<boolean> {
  const { data: novel, error } = await supabase
    .from("novels")
    .select("id, title, author, cover_kind, synopsis, series_name")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!novel) return false;
  if (!isTrinityNovel(novel.title, novel.cover_kind as CoverKind)) return false;

  let drafts = await listDrafts(supabase, userId, novelId);
  // First open after migration: wrap leftover content into Main
  if (drafts.length === 0) {
    await ensureDefaultDraft(supabase, userId, novelId);
    drafts = await listDrafts(supabase, userId, novelId);
  }

  let changed = false;
  let v1 = drafts.find((d) => d.slug === trinityV1DraftMeta.slug);
  let v2 = drafts.find((d) => d.slug === trinityV2DraftMeta.slug);

  if (!v1) {
    const { data: draft, error: dErr } = await supabase
      .from("novel_drafts")
      .insert({
        novel_id: novelId,
        name: trinityV1DraftMeta.name,
        slug: trinityV1DraftMeta.slug,
        summary: trinityV1DraftMeta.summary,
        sort_order: 0,
      })
      .select("id, novel_id, name, slug, summary, sort_order, created_at, updated_at")
      .single();
    if (dErr) throw dErr;
    v1 = draft as DbDraft;
    await seedDraftContent(supabase, novelId, v1.id, {
      codex: trinityV1Seed.codex,
      snippets: trinityV1Snippets,
      chapters: trinityV1Seed.chapters,
    });
    changed = true;
  }

  if (!v2) {
    const { data: draft, error: dErr } = await supabase
      .from("novel_drafts")
      .insert({
        novel_id: novelId,
        name: trinityV2DraftMeta.name,
        slug: trinityV2DraftMeta.slug,
        summary: trinityV2DraftMeta.summary,
        sort_order: 1,
      })
      .select("id, novel_id, name, slug, summary, sort_order, created_at, updated_at")
      .single();
    if (dErr) throw dErr;
    v2 = draft as DbDraft;
    await seedDraftContent(supabase, novelId, v2.id, {
      codex: trinityV2Seed.codex,
      snippets: trinityV2Snippets,
      chapters: trinityV2Seed.chapters,
    });
    changed = true;
  }

  // Prefer v2 as active; remove empty leftover Main if both timelines exist
  await setActiveDraft(supabase, userId, novelId, v2!.id);

  const main = drafts.find((d) => d.slug === "main");
  if (main && v1 && v2) {
    const { count } = await supabase
      .from("codex_entries")
      .select("id", { count: "exact", head: true })
      .eq("draft_id", main.id);
    const { count: chCount } = await supabase
      .from("chapters")
      .select("id", { count: "exact", head: true })
      .eq("draft_id", main.id);
    if ((count ?? 0) === 0 && (chCount ?? 0) <= 1) {
      await supabase.from("novel_drafts").delete().eq("id", main.id);
      changed = true;
    }
  }

  await supabase
    .from("novels")
    .update({
      synopsis: trinityV2Seed.synopsis,
      series_name: trinityV2Seed.series ?? "Trinity",
      author: trinityV2Seed.author || novel.author,
    })
    .eq("id", novelId)
    .eq("user_id", userId);

  // Cross-reference: v2 pins the v1 timeline for browsing
  if (v1 && v2) {
    try {
      await addDraftReference(supabase, userId, novelId, {
        draft_id: v2.id,
        source_draft_id: v1.id,
        source_type: "draft",
        note: "Earlier metafiction timeline — consult when crossing timelines.",
      });
      changed = true;
    } catch {
      /* already referenced */
    }
  }

  return changed;
}

/** @deprecated use ensureTrinityDrafts */
export async function seedTrinityIfEmpty(
  supabase: Client,
  userId: string,
  novelId: string,
): Promise<boolean> {
  return ensureTrinityDrafts(supabase, userId, novelId);
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

async function seedNovelShell(
  supabase: Client,
  userId: string,
  seed: Novel,
  draftMeta: { name: string; slug: string; summary: string },
  options?: { withCodex?: boolean; withChapters?: boolean },
): Promise<string> {
  const { data: novel, error } = await supabase
    .from("novels")
    .insert({
      user_id: userId,
      title: seed.title,
      author: seed.author,
      synopsis: seed.synopsis,
      cover_kind: seed.cover,
      series_name: seed.series ?? null,
      is_template: false,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { data: draft, error: dErr } = await supabase
    .from("novel_drafts")
    .insert({
      novel_id: novel.id,
      name: draftMeta.name,
      slug: draftMeta.slug,
      summary: draftMeta.summary,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (dErr) throw dErr;

  await supabase.from("novels").update({ active_draft_id: draft.id }).eq("id", novel.id);

  if (options?.withChapters !== false) {
    await seedDraftContent(supabase, novel.id, draft.id, {
      chapters: seed.chapters,
      codex: options?.withCodex === false ? [] : seed.codex,
    });
  }

  return novel.id;
}

/** Ensure Gatsby, Trinity (both drafts), and Cardinal exist in the library. */
export async function ensureStarterNovels(supabase: Client, userId: string) {
  const existing = await listNovels(supabase, userId);
  const covers = new Set(existing.map((n) => n.cover_kind));

  if (!covers.has("gatsby")) {
    await seedNovelShell(
      supabase,
      userId,
      gatsbySeed,
      { name: "Main", slug: "main", summary: "Gatsby demo manuscript" },
      { withCodex: true, withChapters: true },
    );
  }

  if (!covers.has("trinity")) {
    const { data: novel, error } = await supabase
      .from("novels")
      .insert({
        user_id: userId,
        title: trinityV2Seed.title,
        author: trinityV2Seed.author,
        synopsis: trinityV2Seed.synopsis,
        cover_kind: "trinity",
        series_name: trinityV2Seed.series ?? "Trinity",
        is_template: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    await ensureTrinityDrafts(supabase, userId, novel.id);
  } else {
    const trinity = existing.find((n) => n.cover_kind === "trinity");
    if (trinity) await ensureTrinityDrafts(supabase, userId, trinity.id);
  }

  if (!covers.has("cardinal")) {
    await seedNovelShell(supabase, userId, cardinalSeed, cardinalDraftMeta, {
      withCodex: false,
      withChapters: true,
    });
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

export async function listChatThreads(supabase: Client, userId: string, novelId: string) {
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
    .from("chat_threads")
    .select("id, title, updated_at")
    .eq("novel_id", novelId)
    .eq("draft_id", draftId)
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
    .insert({ novel_id: novelId, draft_id: draftId, title: "Chat" })
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

  await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
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
