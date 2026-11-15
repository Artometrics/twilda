import { mediaNames } from "../../../backend-github/src/publish";
import { parseSite, type SiteSettings, type TwildaDocument } from "@twilda/core";
import type { StorageBackend } from "../contract";
import type { Doc, MediaAsset } from "../model";
import { normalizeDoc } from "../doc";

/**
 * What this device last saw of `main`, per document, so a publish can tell "main moved" from
 * "only I edited". `base` is main's copy the last time a publish looked; `sent` are copies this
 * device already put in pull requests (if `main` has one of those, nobody else has touched it).
 * Kept beside the drafts on this device. It never reaches the repo.
 */
export interface SyncRecord {
  base: Doc | null;
  sent: Doc[];
}

export const syncPath = (id: string): string => `meta/sync/${id}.json`;
export const SITE_SYNC_PATH = "meta/sync/site.json";
const KEEP_SENT = 4;

export const emptySync = (): SyncRecord => ({ base: null, sent: [] });

export async function loadSync(backend: Pick<StorageBackend, "read">, id: string): Promise<SyncRecord> {
  let raw: string;
  try {
    raw = await backend.read(syncPath(id));
  } catch {
    return emptySync();
  }
  try {
    const value = JSON.parse(raw) as { base?: unknown; sent?: unknown[] };
    return {
      base: value.base ? normalizeDoc(value.base) : null,
      sent: Array.isArray(value.sent) ? value.sent.flatMap((item) => (item ? [normalizeDoc(item)] : [])) : [],
    };
  } catch {
    return emptySync();
  }
}

export async function saveSync(backend: Pick<StorageBackend, "write">, id: string, record: SyncRecord): Promise<void> {
  await backend.write(syncPath(id), JSON.stringify({ base: record.base, sent: record.sent.slice(-KEEP_SENT) }));
}

/** Record that a pull request carrying `sent` was opened, and what `main` held when it was. */
export function afterPublish(record: SyncRecord, sent: Doc, seen: Doc | null): SyncRecord {
  return { base: seen ?? record.base, sent: [...record.sent, sent].slice(-KEEP_SENT) };
}

/** Uploaded images the document prints and the repo does not have yet: file name to base64 bytes. */
export function mediaPayload(doc: Doc | TwildaDocument, assets: readonly MediaAsset[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of mediaNames(doc as TwildaDocument)) {
    const asset = assets.find((item) => item.name === name);
    const comma = asset?.dataUrl.indexOf(",") ?? -1;
    if (asset && asset.dataUrl.startsWith("data:image/") && comma > 0) out[name] = asset.dataUrl.slice(comma + 1);
  }
  return out;
}

export interface SiteSyncRecord {
  base: SiteSettings | null;
  sent: SiteSettings[];
}

export async function loadSiteSync(backend: Pick<StorageBackend, "read">): Promise<SiteSyncRecord> {
  try {
    const value = JSON.parse(await backend.read(SITE_SYNC_PATH)) as { base?: unknown; sent?: unknown[] };
    const parse = (item: unknown) => {
      try {
        return parseSite(JSON.stringify(item));
      } catch {
        return null;
      }
    };
    return {
      base: value.base ? parse(value.base) : null,
      sent: Array.isArray(value.sent) ? value.sent.flatMap((item) => parse(item) ?? []) : [],
    };
  } catch {
    return { base: null, sent: [] };
  }
}

export async function saveSiteSync(backend: Pick<StorageBackend, "write">, record: SiteSyncRecord): Promise<void> {
  await backend.write(SITE_SYNC_PATH, JSON.stringify({ base: record.base, sent: record.sent.slice(-KEEP_SENT) }));
}
