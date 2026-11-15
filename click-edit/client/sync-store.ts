import { documentSchema, type TwildaDocument } from "@twilda/core";
import type { StorageLike } from "./draft-store";

/**
 * What this device last saw of `main`, and the copies it already sent in pull requests, so the
 * next publish can tell "main moved" from "only I edited". Local to the browser. Never in the repo.
 */
export interface SyncRecord {
  base: TwildaDocument | null;
  sent: TwildaDocument[];
}

const KEEP_SENT = 4;
export const syncKey = (id: string) => `twilda:click-edit:sync:${id}`;
export const mediaKey = (name: string) => `twilda:click-edit:media:${name}`;

function parse(value: unknown, id: string): TwildaDocument | null {
  const result = documentSchema.safeParse(value);
  return result.success && result.data.id === id ? result.data : null;
}

export function loadSync(storage: StorageLike, id: string): SyncRecord {
  try {
    const raw = storage.getItem(syncKey(id));
    if (!raw) return { base: null, sent: [] };
    const value = JSON.parse(raw) as { base?: unknown; sent?: unknown };
    return {
      base: parse(value.base, id),
      sent: Array.isArray(value.sent) ? value.sent.flatMap((item) => parse(item, id) ?? []) : [],
    };
  } catch {
    return { base: null, sent: [] };
  }
}

export function saveSync(storage: StorageLike, id: string, record: SyncRecord): void {
  try {
    storage.setItem(syncKey(id), JSON.stringify({ base: record.base, sent: record.sent.slice(-KEEP_SENT) }));
  } catch {
    // Without a record the next publish is merely more cautious.
  }
}

/** Uploaded images, kept so a reload does not lose a photo that is not in the repo yet. */
export function saveUpload(storage: StorageLike, name: string, dataUrl: string): void {
  try {
    storage.setItem(mediaKey(name), dataUrl);
  } catch {
    // Too large for this browser's local storage: the photo stays for this visit only.
  }
}

export function loadUpload(storage: StorageLike, name: string): string | null {
  try {
    const value = storage.getItem(mediaKey(name));
    return value?.startsWith("data:image/jpeg;base64,") ? value : null;
  } catch {
    return null;
  }
}
