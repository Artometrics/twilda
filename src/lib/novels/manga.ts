import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  trinityPilotMangaPages,
  type MangaPageSeed,
  type MangaResearchLink,
} from "@/lib/novels/trinity-pilot-manga";

type Client = SupabaseClient<Database>;

const BUCKET = "manga";
const SIGNED_URL_TTL = 60 * 60 * 6;

export type MangaResearchLinkRow = MangaResearchLink & {
  snippet_id?: string;
  codex_id?: string;
};

export type MangaPanel = Database["public"]["Tables"]["manga_panels"]["Row"] & {
  image_url?: string | null;
};

export type MangaPage = Database["public"]["Tables"]["manga_pages"]["Row"] & {
  page_image_url?: string | null;
  panels: MangaPanel[];
};

async function assertNovelOwner(supabase: Client, userId: string, novelId: string) {
  const { data, error } = await supabase
    .from("novels")
    .select("id")
    .eq("id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Novel not found");
}

function parseResearchLinks(value: Json): MangaResearchLinkRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MangaResearchLinkRow => {
    return Boolean(item && typeof item === "object" && "label" in item);
  }) as MangaResearchLinkRow[];
}

async function signedUrl(
  supabase: Client,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data.signedUrl;
}

function panelDisplayUrl(panel: MangaPanel): string | null {
  return panel.image_url || panel.source_url || null;
}

export function isMangaSetupError(message: string): boolean {
  return /manga_pages|manga_panels|manga|bucket|does not exist|schema cache|relation/i.test(
    message,
  );
}

export async function listMangaPages(
  supabase: Client,
  userId: string,
  novelId: string,
  draftId?: string | null,
): Promise<MangaPage[]> {
  await assertNovelOwner(supabase, userId, novelId);

  let pageQuery = supabase
    .from("manga_pages")
    .select("*")
    .eq("novel_id", novelId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("page_number", { ascending: true });

  if (draftId) pageQuery = pageQuery.eq("draft_id", draftId);
  else pageQuery = pageQuery.is("draft_id", null);

  const { data: pages, error } = await pageQuery;
  if (error) throw error;
  if (!pages?.length) return [];

  const pageIds = pages.map((p) => p.id);
  const { data: panels, error: pErr } = await supabase
    .from("manga_panels")
    .select("*")
    .in("page_id", pageIds)
    .eq("user_id", userId)
    .order("slot", { ascending: true });
  if (pErr) throw pErr;

  const panelsWithUrls: MangaPanel[] = await Promise.all(
    (panels ?? []).map(async (panel) => {
      const image_url = (await signedUrl(supabase, panel.image_path)) || panel.source_url;
      return { ...panel, image_url };
    }),
  );

  const byPage = new Map<string, MangaPanel[]>();
  for (const panel of panelsWithUrls) {
    const list = byPage.get(panel.page_id) ?? [];
    list.push(panel);
    byPage.set(panel.page_id, list);
  }

  return Promise.all(
    pages.map(async (page) => ({
      ...page,
      page_image_url: await signedUrl(supabase, page.page_image_path),
      panels: byPage.get(page.id) ?? [],
    })),
  );
}

export async function getMangaPage(
  supabase: Client,
  userId: string,
  novelId: string,
  pageId: string,
): Promise<MangaPage | null> {
  const pages = await listMangaPages(supabase, userId, novelId);
  return pages.find((p) => p.id === pageId) ?? null;
}

export async function updateMangaPage(
  supabase: Client,
  userId: string,
  novelId: string,
  pageId: string,
  patch: {
    title?: string;
    summary?: string;
    script_notes?: string;
    page_image_path?: string | null;
  },
) {
  await assertNovelOwner(supabase, userId, novelId);
  const update: Database["public"]["Tables"]["manga_pages"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.summary !== undefined) update.summary = patch.summary;
  if (patch.script_notes !== undefined) update.script_notes = patch.script_notes;
  if (patch.page_image_path !== undefined) update.page_image_path = patch.page_image_path;

  const { data, error } = await supabase
    .from("manga_pages")
    .update(update)
    .eq("id", pageId)
    .eq("novel_id", novelId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Page not found");
  return data;
}

export async function updateMangaPanel(
  supabase: Client,
  userId: string,
  novelId: string,
  panelId: string,
  patch: {
    caption?: string;
    dialogue?: string;
    sfx?: string;
    notes?: string;
    prompt?: string;
    negative_notes?: string;
    image_path?: string | null;
    source_url?: string | null;
    higgsfield_job_id?: string | null;
    research_links?: MangaResearchLinkRow[];
  },
) {
  await assertNovelOwner(supabase, userId, novelId);
  const update: Database["public"]["Tables"]["manga_panels"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (patch.caption !== undefined) update.caption = patch.caption;
  if (patch.dialogue !== undefined) update.dialogue = patch.dialogue;
  if (patch.sfx !== undefined) update.sfx = patch.sfx;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.prompt !== undefined) update.prompt = patch.prompt;
  if (patch.negative_notes !== undefined) update.negative_notes = patch.negative_notes;
  if (patch.image_path !== undefined) update.image_path = patch.image_path;
  if (patch.source_url !== undefined) update.source_url = patch.source_url;
  if (patch.higgsfield_job_id !== undefined) update.higgsfield_job_id = patch.higgsfield_job_id;
  if (patch.research_links !== undefined) update.research_links = patch.research_links as Json;

  const { data, error } = await supabase
    .from("manga_panels")
    .update(update)
    .eq("id", panelId)
    .eq("novel_id", novelId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Panel not found");
  const image_url = (await signedUrl(supabase, data.image_path)) || data.source_url;
  return { ...data, image_url };
}

export async function uploadMangaPanelImage(
  supabase: Client,
  userId: string,
  novelId: string,
  panelId: string,
  file: File,
) {
  await assertNovelOwner(supabase, userId, novelId);

  const { data: panel, error: findErr } = await supabase
    .from("manga_panels")
    .select("id, image_path, page_id")
    .eq("id", panelId)
    .eq("novel_id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!panel) throw new Error("Panel not found");

  const mime = file.type || "image/jpeg";
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image must be under 10 MB");
  }

  const ext =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg";
  const path = `${userId}/${novelId}/panels/${panelId}.${ext}`;

  if (panel.image_path && panel.image_path !== path) {
    await supabase.storage.from(BUCKET).remove([panel.image_path]);
  }

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: mime,
    cacheControl: "3600",
  });
  if (upErr) throw upErr;

  return updateMangaPanel(supabase, userId, novelId, panelId, { image_path: path });
}

async function loadImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Composite six panel images into a 2×3 page PNG and store it. */
export async function compositeMangaPage(
  supabase: Client,
  userId: string,
  novelId: string,
  pageId: string,
): Promise<MangaPage> {
  const sharp = (await import("sharp")).default;
  const pages = await listMangaPages(supabase, userId, novelId);
  const page = pages.find((p) => p.id === pageId);
  if (!page) throw new Error("Page not found");
  if (page.panels.length < 6) throw new Error("Page needs 6 panels");

  const cellW = 600;
  const cellH = 800;
  const gutter = 16;
  const pad = 24;
  const captionH = 48;
  const cols = 2;
  const rows = 3;
  const width = pad * 2 + cols * cellW + gutter;
  const height = pad * 2 + rows * (cellH + captionH) + gutter * (rows - 1);

  const composites: { input: Buffer; top: number; left: number }[] = [];

  for (let i = 0; i < 6; i++) {
    const panel = page.panels.find((p) => p.slot === i + 1) ?? page.panels[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = pad + col * (cellW + gutter);
    const top = pad + row * (cellH + captionH + gutter);
    const src = panelDisplayUrl(panel);
    if (!src) {
      throw new Error(`Panel ${panel.slot} has no image`);
    }
    const raw = await loadImageBuffer(src);
    const cell = await sharp(raw)
      .resize(cellW, cellH, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    composites.push({ input: cell, left, top });

    const label = [panel.caption, panel.dialogue].filter(Boolean).join(" — ").slice(0, 80);
    if (label) {
      const svg = Buffer.from(`
        <svg width="${cellW}" height="${captionH}">
          <rect width="100%" height="100%" fill="#f7f4ef"/>
          <text x="8" y="30" font-family="Georgia, serif" font-size="18" fill="#1a1a1a">${escapeXml(label)}</text>
        </svg>`);
      composites.push({
        input: await sharp(svg).png().toBuffer(),
        left,
        top: top + cellH,
      });
    }
  }

  const pagePng = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 247, g: 244, b: 239 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  const path = `${userId}/${novelId}/pages/${pageId}.png`;
  if (page.page_image_path && page.page_image_path !== path) {
    await supabase.storage.from(BUCKET).remove([page.page_image_path]);
  }
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, pagePng, {
    upsert: true,
    contentType: "image/png",
    cacheControl: "3600",
  });
  if (upErr) throw upErr;

  await updateMangaPage(supabase, userId, novelId, pageId, { page_image_path: path });
  const refreshed = await listMangaPages(supabase, userId, novelId, page.draft_id);
  const out = refreshed.find((p) => p.id === pageId);
  if (!out) throw new Error("Page not found after composite");
  return out;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function exportMangaZip(
  supabase: Client,
  userId: string,
  novelId: string,
  draftId?: string | null,
  opts?: { sequence?: number; format?: "zip" | "cbz" },
): Promise<{ bytes: Buffer; filename: string; contentType: string }> {
  const JSZip = (await import("jszip")).default;
  const pages = await listMangaPages(supabase, userId, novelId, draftId);
  const filtered = opts?.sequence
    ? pages.filter((p) => p.sequence === opts.sequence)
    : pages;

  const zip = new JSZip();
  const manifest = {
    novel_id: novelId,
    draft_id: draftId ?? null,
    sequence: opts?.sequence ?? null,
    pages: [] as {
      scene_key: string;
      title: string;
      page_number: number;
      file: string;
    }[],
  };

  let n = 0;
  for (const page of filtered) {
    let buf: Buffer | null = null;
    if (page.page_image_url) {
      buf = await loadImageBuffer(page.page_image_url);
    } else if (page.panels.every((p) => panelDisplayUrl(p))) {
      const composited = await compositeMangaPage(supabase, userId, novelId, page.id);
      if (composited.page_image_url) {
        buf = await loadImageBuffer(composited.page_image_url);
      }
    }
    if (!buf) continue;
    n += 1;
    const file = `${String(n).padStart(3, "0")}_${page.scene_key}.png`;
    zip.file(file, buf);
    manifest.pages.push({
      scene_key: page.scene_key,
      title: page.title,
      page_number: page.page_number,
      file,
    });
  }

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  const bytes = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  const isCbz = opts?.format === "cbz";
  return {
    bytes,
    filename: isCbz ? "trinity-manga.cbz" : "trinity-manga.zip",
    contentType: isCbz ? "application/vnd.comicbook+zip" : "application/zip",
  };
}

export async function exportMangaPdf(
  supabase: Client,
  userId: string,
  novelId: string,
  draftId?: string | null,
  sequence?: number,
): Promise<{ bytes: Buffer; filename: string }> {
  const { PDFDocument } = await import("pdf-lib");
  const pages = await listMangaPages(supabase, userId, novelId, draftId);
  const filtered = sequence ? pages.filter((p) => p.sequence === sequence) : pages;
  const pdf = await PDFDocument.create();

  for (const page of filtered) {
    let url = page.page_image_url;
    if (!url && page.panels.every((p) => panelDisplayUrl(p))) {
      const composited = await compositeMangaPage(supabase, userId, novelId, page.id);
      url = composited.page_image_url ?? null;
    }
    if (!url) continue;
    const buf = await loadImageBuffer(url);
    const png = await pdf.embedPng(buf);
    const pdfPage = pdf.addPage([png.width, png.height]);
    pdfPage.drawImage(png, { x: 0, y: 0, width: png.width, height: png.height });
  }

  const bytes = Buffer.from(await pdf.save());
  return { bytes, filename: "trinity-manga.pdf" };
}

/** Wipe and reseed manga pages for a draft from pilot seeds. */
export async function seedMangaFromPilot(
  supabase: Client,
  userId: string,
  novelId: string,
  draftId: string,
  seeds: MangaPageSeed[] = trinityPilotMangaPages,
) {
  await assertNovelOwner(supabase, userId, novelId);

  // Cascades to panels
  await supabase.from("manga_pages").delete().eq("draft_id", draftId).eq("user_id", userId);

  for (const [index, seed] of seeds.entries()) {
    const { data: page, error: pageErr } = await supabase
      .from("manga_pages")
      .insert({
        novel_id: novelId,
        draft_id: draftId,
        user_id: userId,
        scene_key: seed.scene_key,
        sequence: seed.sequence,
        page_number: seed.page_number,
        title: seed.title,
        summary: seed.summary,
        script_notes: seed.script_notes,
        layout: "grid_2x3",
        sort_order: index,
      })
      .select("id")
      .single();
    if (pageErr) throw pageErr;

    const panelRows = seed.panels.map((p) => ({
      page_id: page.id,
      novel_id: novelId,
      user_id: userId,
      slot: p.slot,
      sort_order: p.slot - 1,
      caption: p.caption,
      dialogue: p.dialogue,
      sfx: p.sfx,
      notes: p.notes,
      prompt: p.prompt,
      negative_notes: p.negative_notes ?? "",
      source_url: p.source_url ?? null,
      higgsfield_job_id: p.higgsfield_job_id ?? null,
      research_links: (p.research_links ?? []) as Json,
    }));

    const { error: panelErr } = await supabase.from("manga_panels").insert(panelRows);
    if (panelErr) throw panelErr;
  }
}

/** Ensure manga pages exist for draft; seed if empty. */
export async function ensureMangaSeeded(
  supabase: Client,
  userId: string,
  novelId: string,
  draftId: string,
) {
  const { count, error } = await supabase
    .from("manga_pages")
    .select("id", { count: "exact", head: true })
    .eq("draft_id", draftId)
    .eq("user_id", userId);
  if (error) {
    if (isMangaSetupError(error.message)) throw error;
    throw error;
  }
  if ((count ?? 0) === 0) {
    await seedMangaFromPilot(supabase, userId, novelId, draftId);
    return true;
  }
  return false;
}

export { parseResearchLinks, panelDisplayUrl };
