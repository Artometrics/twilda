import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CoverKind, Novel } from "@/apps/novelcrafter/data";
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
  listDrafts,
  seedDraftContent,
  setActiveDraft,
  type DbDraft,
} from "@/lib/novels/drafts";

type Client = SupabaseClient<Database>;

async function listNovelCovers(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("novels")
    .select("id, cover_kind")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
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
      is_template: true,
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
  const existing = await listNovelCovers(supabase, userId);
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
        is_template: true,
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
