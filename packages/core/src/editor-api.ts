import type { TwildaDocument } from "./schema";
import type { PullRequestRef } from "./storage";

/** Contract v1. The phone editor calls this. Backends stay behind StorageBackend. */

export interface DocumentSummary {
  id: string;
  kind: "article" | "page";
  title: string;
  slug: string;
  updatedAt: string;
  branch: string;
  hasUnpublishedChanges: boolean;
}

export interface HistoryEntry {
  path: string;
  at: string;
  message: string;
  /** Previous published document JSON. Empty string means the file did not exist. */
  text: string;
}

export interface MediaUpload {
  documentId: string;
  filename: string;
  mediaType: string;
  bytesBase64: string;
}

export interface TwildaEditorApi {
  listDocuments(): Promise<DocumentSummary[]>;
  readDocument(id: string, source: "draft" | "published"): Promise<TwildaDocument>;
  saveDraft(doc: TwildaDocument): Promise<TwildaDocument>;
  publish(id: string): Promise<{ document: TwildaDocument; pullRequest: PullRequestRef }>;
  rollback(id: string): Promise<TwildaDocument>;
  listHistory(id: string): Promise<HistoryEntry[]>;
  uploadMedia(input: MediaUpload): Promise<{ src: string; path: string }>;
  previewHtml(id: string, source: "draft" | "published"): Promise<string>;
  /** Demo backend only. Other backends throw code `reset-unsupported`. */
  resetSample(): Promise<void>;
}
