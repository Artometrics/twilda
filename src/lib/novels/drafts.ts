import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CodexEntry, Chapter } from "@/apps/novelcrafter/data";

type Client = SupabaseClient<Database>;

export interface DbDraft {
  id: string;
  novel_id: string;
  name: string;
  slug: string;
  summary: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbDraftReference {
  id: string;
  novel_id: string;
  draft_id: string;
  source_draft_id: string;
  source_type: "codex" | "snippet" | "draft";
  source_id: string | null;
  note: string;
  created_at: string;
  /** Joined for display */
  source_draft_name?: string;
  source_label?: string;
  source_summary?: string;
}

export async function assertNovelOwner(
  supabase: Client,
  userId: string,
  novelId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("novels")
    .select("id")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function listDrafts(
  supabase: Client,
  userId: string,
  novelId: string,
): Promise<DbDraft[]> {
  if (!(await assertNovelOwner(supabase, userId, novelId))) {
    throw new Error("Unauthorized");
  }
  const { data, error } = await supabase
    .from("novel_drafts")
    .select("id, novel_id, name, slug, summary, sort_order, created_at, updated_at")
    .eq("novel_id", novelId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as DbDraft[];
}

export async function getActiveDraftId(
  supabase: Client,
  novelId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("novels")
    .select("active_draft_id")
    .eq("id", novelId)
    .maybeSingle();
  if (error) throw error;
  return data?.active_draft_id ?? null;
}

/** Ensure the novel has at least one draft; attach orphan content; set active. */
export async function ensureDefaultDraft(
  supabase: Client,
  userId: string,
  novelId: string,
): Promise<DbDraft> {
  if (!(await assertNovelOwner(supabase, userId, novelId))) {
    throw new Error("Unauthorized");
  }

  const drafts = await listDrafts(supabase, userId, novelId);
  if (drafts.length > 0) {
    const activeId = await getActiveDraftId(supabase, novelId);
    const active = drafts.find((d) => d.id === activeId) ?? drafts[0];
    if (!activeId || activeId !== active.id) {
      await supabase.from("novels").update({ active_draft_id: active.id }).eq("id", novelId);
    }
    await attachOrphanContent(supabase, novelId, active.id);
    return active;
  }

  const { data: draft, error } = await supabase
    .from("novel_drafts")
    .insert({
      novel_id: novelId,
      name: "Main",
      slug: "main",
      summary: "Primary draft",
      sort_order: 0,
    })
    .select("id, novel_id, name, slug, summary, sort_order, created_at, updated_at")
    .single();
  if (error) throw error;

  await supabase.from("novels").update({ active_draft_id: draft.id }).eq("id", novelId);
  await attachOrphanContent(supabase, novelId, draft.id);
  return draft as DbDraft;
}

async function attachOrphanContent(supabase: Client, novelId: string, draftId: string) {
  await supabase
    .from("chapters")
    .update({ draft_id: draftId })
    .eq("novel_id", novelId)
    .is("draft_id", null);
  await supabase
    .from("codex_entries")
    .update({ draft_id: draftId })
    .eq("novel_id", novelId)
    .is("draft_id", null);
  await supabase
    .from("snippets")
    .update({ draft_id: draftId })
    .eq("novel_id", novelId)
    .is("draft_id", null);
  await supabase
    .from("chat_threads")
    .update({ draft_id: draftId })
    .eq("novel_id", novelId)
    .is("draft_id", null);
}

export async function createDraft(
  supabase: Client,
  userId: string,
  novelId: string,
  input: { name: string; slug?: string; summary?: string; setActive?: boolean },
): Promise<DbDraft> {
  if (!(await assertNovelOwner(supabase, userId, novelId))) {
    throw new Error("Unauthorized");
  }

  const drafts = await listDrafts(supabase, userId, novelId);
  const baseSlug =
    input.slug?.trim() ||
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    "draft";
  let slug = baseSlug;
  let n = 2;
  while (drafts.some((d) => d.slug === slug)) {
    slug = `${baseSlug}-${n++}`;
  }

  const { data: draft, error } = await supabase
    .from("novel_drafts")
    .insert({
      novel_id: novelId,
      name: input.name.trim() || "New draft",
      slug,
      summary: input.summary?.trim() ?? "",
      sort_order: drafts.length,
    })
    .select("id, novel_id, name, slug, summary, sort_order, created_at, updated_at")
    .single();
  if (error) throw error;

  // Starter empty chapter so Plan/Write aren't blank
  const { data: chapter, error: chErr } = await supabase
    .from("chapters")
    .insert({
      novel_id: novelId,
      draft_id: draft.id,
      sort_order: 0,
      title: "Chapter I",
    })
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

  if (input.setActive !== false) {
    await setActiveDraft(supabase, userId, novelId, draft.id);
  }

  return draft as DbDraft;
}

export async function setActiveDraft(
  supabase: Client,
  userId: string,
  novelId: string,
  draftId: string,
): Promise<void> {
  if (!(await assertNovelOwner(supabase, userId, novelId))) {
    throw new Error("Unauthorized");
  }
  const { data: draft, error } = await supabase
    .from("novel_drafts")
    .select("id")
    .eq("id", draftId)
    .eq("novel_id", novelId)
    .maybeSingle();
  if (error) throw error;
  if (!draft) throw new Error("Draft not found");

  const { error: upErr } = await supabase
    .from("novels")
    .update({ active_draft_id: draftId })
    .eq("id", novelId)
    .eq("user_id", userId);
  if (upErr) throw upErr;
}

export async function seedDraftContent(
  supabase: Client,
  novelId: string,
  draftId: string,
  content: {
    codex?: CodexEntry[];
    snippets?: { title: string; content: string }[];
    chapters?: Chapter[];
  },
) {
  if (content.codex?.length) {
    const rows = content.codex.map((e) => ({
      novel_id: novelId,
      draft_id: draftId,
      type: e.type,
      name: e.name,
      initials: e.initials,
      tags: e.tags,
      aliases: e.aliases ?? [],
      summary: e.summary,
      description: e.description,
      mentions: e.mentions ?? 0,
    }));
    const { error } = await supabase.from("codex_entries").insert(rows);
    if (error) throw error;
  }

  if (content.snippets?.length) {
    const rows = content.snippets.map((s) => ({
      novel_id: novelId,
      draft_id: draftId,
      title: s.title,
      content: s.content,
    }));
    const { error } = await supabase.from("snippets").insert(rows);
    if (error) throw error;
  }

  if (content.chapters?.length) {
    for (const [ci, chapter] of content.chapters.entries()) {
      const title = chapter.label ? `${chapter.title} — ${chapter.label}` : chapter.title;
      const { data: ch, error: chErr } = await supabase
        .from("chapters")
        .insert({ novel_id: novelId, draft_id: draftId, sort_order: ci, title })
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
  }
}

export async function listDraftReferences(
  supabase: Client,
  userId: string,
  novelId: string,
  draftId: string,
): Promise<DbDraftReference[]> {
  if (!(await assertNovelOwner(supabase, userId, novelId))) {
    throw new Error("Unauthorized");
  }

  const { data: refs, error } = await supabase
    .from("draft_references")
    .select("id, novel_id, draft_id, source_draft_id, source_type, source_id, note, created_at")
    .eq("novel_id", novelId)
    .eq("draft_id", draftId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const drafts = await listDrafts(supabase, userId, novelId);
  const draftMap = Object.fromEntries(drafts.map((d) => [d.id, d]));

  const enriched: DbDraftReference[] = [];
  for (const ref of refs ?? []) {
    const sourceDraft = draftMap[ref.source_draft_id];
    let source_label = sourceDraft?.name ?? "Unknown draft";
    let source_summary = sourceDraft?.summary ?? "";

    if (ref.source_type === "codex" && ref.source_id) {
      const { data: entry } = await supabase
        .from("codex_entries")
        .select("name, summary")
        .eq("id", ref.source_id)
        .maybeSingle();
      if (entry) {
        source_label = entry.name;
        source_summary = entry.summary;
      }
    } else if (ref.source_type === "snippet" && ref.source_id) {
      const { data: snip } = await supabase
        .from("snippets")
        .select("title, content")
        .eq("id", ref.source_id)
        .maybeSingle();
      if (snip) {
        source_label = snip.title || "Untitled snippet";
        source_summary = snip.content.slice(0, 160);
      }
    } else if (ref.source_type === "draft") {
      source_label = `Timeline: ${sourceDraft?.name ?? "Draft"}`;
    }

    enriched.push({
      ...(ref as DbDraftReference),
      source_draft_name: sourceDraft?.name,
      source_label,
      source_summary,
    });
  }

  return enriched;
}

export async function addDraftReference(
  supabase: Client,
  userId: string,
  novelId: string,
  input: {
    draft_id: string;
    source_draft_id: string;
    source_type: "codex" | "snippet" | "draft";
    source_id?: string | null;
    note?: string;
  },
): Promise<DbDraftReference> {
  if (!(await assertNovelOwner(supabase, userId, novelId))) {
    throw new Error("Unauthorized");
  }
  if (input.draft_id === input.source_draft_id && input.source_type === "draft") {
    throw new Error("A draft cannot reference itself");
  }

  const { data, error } = await supabase
    .from("draft_references")
    .insert({
      novel_id: novelId,
      draft_id: input.draft_id,
      source_draft_id: input.source_draft_id,
      source_type: input.source_type,
      // Postgres unique treats NULLs as distinct — mirror draft id for whole-timeline pins
      source_id:
        input.source_type === "draft"
          ? input.source_draft_id
          : (input.source_id ?? null),
      note: input.note ?? "",
    })
    .select("id, novel_id, draft_id, source_draft_id, source_type, source_id, note, created_at")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Already referenced in this draft");
    throw error;
  }
  return data as DbDraftReference;
}

export async function removeDraftReference(
  supabase: Client,
  userId: string,
  novelId: string,
  refId: string,
): Promise<void> {
  if (!(await assertNovelOwner(supabase, userId, novelId))) {
    throw new Error("Unauthorized");
  }
  const { error } = await supabase
    .from("draft_references")
    .delete()
    .eq("id", refId)
    .eq("novel_id", novelId);
  if (error) throw error;
}

/** Browse another draft's codex + snippets for the References picker. */
export async function browseDraftLibrary(
  supabase: Client,
  userId: string,
  novelId: string,
  sourceDraftId: string,
): Promise<{
  draft: DbDraft;
  codex: { id: string; name: string; type: string; summary: string }[];
  snippets: { id: string; title: string; content: string }[];
}> {
  if (!(await assertNovelOwner(supabase, userId, novelId))) {
    throw new Error("Unauthorized");
  }
  const { data: draft, error } = await supabase
    .from("novel_drafts")
    .select("id, novel_id, name, slug, summary, sort_order, created_at, updated_at")
    .eq("id", sourceDraftId)
    .eq("novel_id", novelId)
    .maybeSingle();
  if (error) throw error;
  if (!draft) throw new Error("Draft not found");

  const { data: codex, error: cxErr } = await supabase
    .from("codex_entries")
    .select("id, name, type, summary")
    .eq("novel_id", novelId)
    .eq("draft_id", sourceDraftId)
    .order("name");
  if (cxErr) throw cxErr;

  const { data: snippets, error: snErr } = await supabase
    .from("snippets")
    .select("id, title, content")
    .eq("novel_id", novelId)
    .eq("draft_id", sourceDraftId)
    .order("title");
  if (snErr) throw snErr;

  return {
    draft: draft as DbDraft,
    codex: codex ?? [],
    snippets: snippets ?? [],
  };
}
