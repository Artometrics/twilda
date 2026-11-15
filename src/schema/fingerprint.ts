import type { TwildaDocument } from "@twilda/core";

/** Compare document content without the save timestamp or draft/published flag. */
export function contentFingerprint(doc: TwildaDocument): string {
  const { updatedAt, status, ...rest } = doc;
  void updatedAt;
  void status;
  return JSON.stringify(rest);
}
