import type { ContentDocument } from "./sections";

/** Compare document content without the save timestamp. */
export function contentFingerprint(doc: ContentDocument): string {
  const { updatedAt, ...rest } = doc;
  void updatedAt;
  return JSON.stringify(rest);
}
