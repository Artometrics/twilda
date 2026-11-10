import type { StorageBackend } from "../contract";
import type { Doc, DocSummary, MediaAsset } from "../model";
import { toSummary } from "../model";
import type { FailurePhase } from "../state/reducer";
import { MEDIA_INDEX, buildFaultPath, draftPath, previewPath, publishedPath } from "./paths";

export class CmsError extends Error {
  readonly phase: FailurePhase;

  constructor(phase: FailurePhase, message: string) {
    super(message);
    this.name = "CmsError";
    this.phase = phase;
  }
}

export interface OpenedDocument {
  draft: Doc;
  published: Doc | null;
  previewUrl: string | null;
}

export interface CmsClient {
  backend: StorageBackend;
  listDocuments(): Promise<DocSummary[]>;
  open(id: string): Promise<OpenedDocument>;
  save(doc: Doc): Promise<Doc>;
  publish(doc: Doc): Promise<Doc>;
  revert(id: string): Promise<Doc>;
  upload(asset: MediaAsset): Promise<MediaAsset>;
  removeMedia(path: string): Promise<void>;
  listMedia(): Promise<MediaAsset[]>;
}

export function createCms(
  backend: StorageBackend,
  now: () => string = () => new Date().toISOString(),
): CmsClient {
  return {
    backend,
    listDocuments: () => listDocuments(backend),
    open: (id) => openDocument(backend, id),
    save: (doc) => saveDraft(backend, doc, now),
    publish: (doc) => publishDocument(backend, doc, now),
    revert: (id) => revertDocument(backend, id),
    upload: (asset) => uploadMedia(backend, asset),
    removeMedia: (path) => removeMedia(backend, path),
    listMedia: () => listMedia(backend),
  };
}

async function listDocuments(backend: StorageBackend): Promise<DocSummary[]> {
  const drafts = await backend.listDrafts();
  const summaries: DocSummary[] = [];
  for (const item of drafts) {
    const draft = parseDoc(await backend.read(item.path), "load");
    const publishedRaw = await readOptional(backend, publishedPath(draft.id));
    const published = publishedRaw ? parseDoc(publishedRaw, "load") : null;
    summaries.push(toSummary(draft, published));
  }
  summaries.sort((a, b) => a.title.localeCompare(b.title));
  return summaries;
}

async function openDocument(backend: StorageBackend, id: string): Promise<OpenedDocument> {
  const raw = await readRequired(backend, draftPath(id), "load");
  const draft = parseDoc(raw, "load");
  const publishedRaw = await readOptional(backend, publishedPath(id));
  const preview = await readOptional(backend, previewPath(id));
  return {
    draft,
    published: publishedRaw ? parseDoc(publishedRaw, "load") : null,
    previewUrl: preview?.trim() ? preview.trim() : null,
  };
}

async function saveDraft(backend: StorageBackend, doc: Doc, now: () => string): Promise<Doc> {
  const stamped = stamp(doc, now);
  try {
    await backend.write(draftPath(doc.id), serialize(stamped));
  } catch (error) {
    throw new CmsError("save", text(error, "The draft could not be written."));
  }
  return stamped;
}

/**
 * Publish is three visible steps so a failure can say which one stopped.
 * Save writes draft.json. Build checks the draft. Publish writes published.json.
 * Branch and pull-request methods stay on the backend for Agent C's git
 * pipeline; this desk does not open a pull request itself.
 */
async function publishDocument(backend: StorageBackend, doc: Doc, now: () => string): Promise<Doc> {
  const stamped = await saveDraft(backend, doc, now);
  try {
    await runBuild(backend, stamped.id);
  } catch (error) {
    if (error instanceof CmsError) throw error;
    throw new CmsError("build", text(error, "The build failed."));
  }
  try {
    await backend.write(publishedPath(stamped.id), serialize(stamped));
  } catch (error) {
    throw new CmsError(
      "publish",
      text(error, "The draft was saved, but the published file was not written."),
    );
  }
  return stamped;
}

async function runBuild(backend: StorageBackend, id: string): Promise<void> {
  let raw: string;
  try {
    raw = await backend.read(draftPath(id));
  } catch (error) {
    throw new CmsError("build", text(error, "Build failed: the draft could not be read."));
  }
  let doc: Doc;
  try {
    doc = parseDoc(raw, "build");
  } catch (error) {
    if (error instanceof CmsError) throw error;
    throw new CmsError("build", "Build failed: the draft is not valid JSON.");
  }
  if (!doc.title.trim()) throw new CmsError("build", "Build failed: a title is required.");
  if (doc.kind === "article" && doc.blocks.length === 0) {
    throw new CmsError("build", "Build failed: an article needs at least one block.");
  }
  if (doc.kind === "page" && doc.sections.length === 0) {
    throw new CmsError("build", "Build failed: a page needs at least one section.");
  }
  const fault = await readOptional(backend, buildFaultPath(id));
  if (fault?.trim()) throw new CmsError("build", fault.trim());
}

async function revertDocument(backend: StorageBackend, id: string): Promise<Doc> {
  try {
    await backend.revert({ documentId: id });
  } catch (error) {
    throw new CmsError("revert", text(error, "The draft could not be restored."));
  }
  return parseDoc(await readRequired(backend, draftPath(id), "revert"), "revert");
}

async function listMedia(backend: StorageBackend): Promise<MediaAsset[]> {
  const raw = await readOptional(backend, MEDIA_INDEX);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MediaAsset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function uploadMedia(backend: StorageBackend, asset: MediaAsset): Promise<MediaAsset> {
  try {
    await backend.write(asset.path, asset.dataUrl);
    const current = await listMedia(backend);
    const next = [...current.filter((item) => item.path !== asset.path), asset];
    await backend.write(MEDIA_INDEX, JSON.stringify(next));
    return asset;
  } catch (error) {
    throw new CmsError("upload", text(error, "The file could not be stored."));
  }
}

async function removeMedia(backend: StorageBackend, path: string): Promise<void> {
  await backend.delete(path);
  const next = (await listMedia(backend)).filter((item) => item.path !== path);
  await backend.write(MEDIA_INDEX, JSON.stringify(next));
}

function stamp(doc: Doc, now: () => string): Doc {
  return { ...doc, updatedAt: now() };
}

function serialize(doc: Doc): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function parseDoc(raw: string, phase: FailurePhase): Doc {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new CmsError(phase, "The file is not valid JSON.");
  }
  if (!value || typeof value !== "object") throw new CmsError(phase, "The file is not a document.");
  const doc = value as Partial<Doc>;
  if (doc.kind !== "article" && doc.kind !== "page") {
    throw new CmsError(phase, "The file is not a Twilda document.");
  }
  if (typeof doc.id !== "string" || typeof doc.title !== "string") {
    throw new CmsError(phase, "The document is missing an id or a title.");
  }
  return doc as Doc;
}

async function readOptional(backend: StorageBackend, path: string): Promise<string | null> {
  try {
    return await backend.read(path);
  } catch {
    return null;
  }
}

async function readRequired(backend: StorageBackend, path: string, phase: FailurePhase): Promise<string> {
  try {
    return await backend.read(path);
  } catch (error) {
    throw new CmsError(phase, text(error, `Could not read ${path}.`));
  }
}

function text(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
