import type { ContentDocument } from "../src/schema/sections";
import type { DocumentSummary } from "../src/content/store";

export interface DocumentPayload {
  draft: ContentDocument;
  published: ContentDocument | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status}).`);
  }
  return body;
}

export function fetchDocuments(): Promise<{ documents: DocumentSummary[] }> {
  return request("/api/documents");
}

export function fetchDocument(id: string): Promise<DocumentPayload> {
  return request(`/api/documents/${id}`);
}

export function saveDraft(doc: ContentDocument): Promise<{ draft: ContentDocument }> {
  return request(`/api/documents/${doc.id}`, {
    method: "PUT",
    body: JSON.stringify(doc),
  });
}

export function publish(doc: ContentDocument): Promise<DocumentPayload> {
  return request(`/api/documents/${doc.id}/publish`, {
    method: "POST",
    body: JSON.stringify(doc),
  });
}

export function revert(id: string): Promise<DocumentPayload> {
  return request(`/api/documents/${id}/revert`, { method: "POST" });
}
