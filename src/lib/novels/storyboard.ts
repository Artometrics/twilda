import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
export type StoryboardPanel = Database["public"]["Tables"]["storyboard_panels"]["Row"] & {
  image_url?: string | null;
};

const BUCKET = "storyboard";
const SIGNED_URL_TTL = 60 * 60 * 6; // 6 hours

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

async function withSignedUrls(
  supabase: Client,
  panels: Database["public"]["Tables"]["storyboard_panels"]["Row"][],
): Promise<StoryboardPanel[]> {
  return Promise.all(
    panels.map(async (panel) => {
      if (!panel.image_path) return { ...panel, image_url: null };
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(panel.image_path, SIGNED_URL_TTL);
      if (error) return { ...panel, image_url: null };
      return { ...panel, image_url: data.signedUrl };
    }),
  );
}

export async function listStoryboardPanels(
  supabase: Client,
  userId: string,
  novelId: string,
  draftId?: string | null,
) {
  await assertNovelOwner(supabase, userId, novelId);
  let query = supabase
    .from("storyboard_panels")
    .select("*")
    .eq("novel_id", novelId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (draftId) query = query.eq("draft_id", draftId);
  else query = query.is("draft_id", null);

  const { data, error } = await query;
  if (error) throw error;
  return withSignedUrls(supabase, data ?? []);
}

export async function createStoryboardPanel(
  supabase: Client,
  userId: string,
  novelId: string,
  draftId?: string | null,
) {
  await assertNovelOwner(supabase, userId, novelId);

  let orderQuery = supabase
    .from("storyboard_panels")
    .select("sort_order")
    .eq("novel_id", novelId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (draftId) orderQuery = orderQuery.eq("draft_id", draftId);
  else orderQuery = orderQuery.is("draft_id", null);

  const { data: existing } = await orderQuery.maybeSingle();
  const sort_order = (existing?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("storyboard_panels")
    .insert({
      novel_id: novelId,
      draft_id: draftId || null,
      user_id: userId,
      sort_order,
      caption: "",
      prompt: "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return { ...data, image_url: null as string | null };
}

export async function updateStoryboardPanel(
  supabase: Client,
  userId: string,
  novelId: string,
  panelId: string,
  patch: { caption?: string; prompt?: string; sort_order?: number; image_path?: string | null },
) {
  await assertNovelOwner(supabase, userId, novelId);
  const update: Database["public"]["Tables"]["storyboard_panels"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (patch.caption !== undefined) update.caption = patch.caption;
  if (patch.prompt !== undefined) update.prompt = patch.prompt;
  if (patch.sort_order !== undefined) update.sort_order = patch.sort_order;
  if (patch.image_path !== undefined) update.image_path = patch.image_path;

  const { data, error } = await supabase
    .from("storyboard_panels")
    .update(update)
    .eq("id", panelId)
    .eq("novel_id", novelId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Panel not found");
  const [withUrl] = await withSignedUrls(supabase, [data]);
  return withUrl;
}

export async function deleteStoryboardPanel(
  supabase: Client,
  userId: string,
  novelId: string,
  panelId: string,
) {
  await assertNovelOwner(supabase, userId, novelId);
  const { data: existing, error: findErr } = await supabase
    .from("storyboard_panels")
    .select("id, image_path")
    .eq("id", panelId)
    .eq("novel_id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!existing) throw new Error("Panel not found");

  if (existing.image_path) {
    await supabase.storage.from(BUCKET).remove([existing.image_path]);
  }

  const { error } = await supabase
    .from("storyboard_panels")
    .delete()
    .eq("id", panelId)
    .eq("novel_id", novelId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function uploadStoryboardImage(
  supabase: Client,
  userId: string,
  novelId: string,
  panelId: string,
  file: File,
) {
  await assertNovelOwner(supabase, userId, novelId);

  const { data: panel, error: findErr } = await supabase
    .from("storyboard_panels")
    .select("id, image_path")
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
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be under 5 MB");
  }

  const ext =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg";
  const path = `${userId}/${novelId}/${panelId}.${ext}`;

  if (panel.image_path && panel.image_path !== path) {
    await supabase.storage.from(BUCKET).remove([panel.image_path]);
  }

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: mime,
    cacheControl: "3600",
  });
  if (upErr) throw upErr;

  return updateStoryboardPanel(supabase, userId, novelId, panelId, { image_path: path });
}

export async function reorderStoryboardPanel(
  supabase: Client,
  userId: string,
  novelId: string,
  panelId: string,
  direction: "up" | "down",
) {
  await assertNovelOwner(supabase, userId, novelId);

  const { data: current, error: findErr } = await supabase
    .from("storyboard_panels")
    .select("id, draft_id, sort_order")
    .eq("id", panelId)
    .eq("novel_id", novelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!current) throw new Error("Panel not found");

  const panels = await listStoryboardPanels(supabase, userId, novelId, current.draft_id);
  const index = panels.findIndex((p) => p.id === panelId);
  if (index < 0) throw new Error("Panel not found");
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= panels.length) return panels;

  const a = panels[index]!;
  const b = panels[swapWith]!;

  // Swap via temporary order to avoid unique collisions if any
  const temp = Math.max(a.sort_order, b.sort_order) + 1000;
  await updateStoryboardPanel(supabase, userId, novelId, a.id, { sort_order: temp });
  await updateStoryboardPanel(supabase, userId, novelId, b.id, { sort_order: a.sort_order });
  await updateStoryboardPanel(supabase, userId, novelId, a.id, { sort_order: b.sort_order });

  return listStoryboardPanels(supabase, userId, novelId, current.draft_id);
}

export function isStoryboardSetupError(message: string): boolean {
  return /storyboard_panels|storyboard|bucket|does not exist|schema cache|relation/i.test(message);
}
