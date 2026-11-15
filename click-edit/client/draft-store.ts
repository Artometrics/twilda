import { assertJsonBounds, documentSchema, type TwildaDocument } from "@twilda/core";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const draftKey = (id: string) => `twilda:click-edit:draft:${id}`;

/** Local draft state. It never leaves the device until the person opens a pull request. */
export function loadLocalDraft(storage: StorageLike, id: string): TwildaDocument | null {
  const raw = storage.getItem(draftKey(id));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    assertJsonBounds(value);
    const parsed = documentSchema.safeParse(value);
    return parsed.success && parsed.data.id === id ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveLocalDraft(storage: StorageLike, doc: TwildaDocument): { ok: true } | { ok: false; error: string } {
  try {
    storage.setItem(draftKey(doc.id), JSON.stringify(doc));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Storage is full or blocked." };
  }
}

export function clearLocalDraft(storage: StorageLike, id: string): void {
  storage.removeItem(draftKey(id));
}
