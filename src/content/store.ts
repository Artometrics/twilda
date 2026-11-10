import fs from "node:fs";
import path from "node:path";
import { ZodError } from "zod";
import { contentFingerprint } from "../schema/fingerprint";
import { documentSchema, type ContentDocument } from "../schema/sections";

const DOCUMENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentError";
  }
}

/**
 * Content lives at `<repo>/content`. Commands are run from the repository root,
 * so the root is cwd rather than this module's URL (Astro bundles that URL away).
 */
export const defaultContentRoot = path.resolve(process.cwd(), "content");

export interface DocumentSummary {
  id: string;
  title: string;
  kind: ContentDocument["kind"];
  slug: string;
  hasPublished: boolean;
  draftUpdatedAt: string;
  publishedUpdatedAt: string | null;
  unpublishedChanges: boolean;
}

function assertId(id: string): void {
  if (!DOCUMENT_ID.test(id)) {
    throw new ContentError("Document id must be lowercase words separated by hyphens.");
  }
}

export function documentDir(root: string, id: string): string {
  assertId(id);
  const rootResolved = path.resolve(root);
  const dir = path.resolve(rootResolved, id);
  if (dir !== rootResolved && !dir.startsWith(rootResolved + path.sep)) {
    throw new ContentError("Document path escapes the content directory.");
  }
  return dir;
}

function readJson(file: string): unknown {
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ContentError(`Invalid JSON in ${path.basename(file)}.`);
  }
}

function parseDocument(value: unknown, expectedId?: string): ContentDocument {
  let parsed: ContentDocument;
  try {
    parsed = documentSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      const detail = error.issues
        .map((issue) => `${issue.path.join(".") || "document"}: ${issue.message}`)
        .join("; ");
      throw new ContentError(detail);
    }
    throw error;
  }
  if (expectedId && parsed.id !== expectedId) {
    throw new ContentError(`Document id "${parsed.id}" does not match folder "${expectedId}".`);
  }
  return parsed;
}

function writeDocument(file: string, doc: ContentDocument): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

export function listDocumentIds(root: string = defaultContentRoot): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && DOCUMENT_ID.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

export function readDraft(id: string, root: string = defaultContentRoot): ContentDocument {
  const file = path.join(documentDir(root, id), "draft.json");
  const value = readJson(file);
  if (value === undefined) throw new ContentError(`No draft for "${id}".`);
  return parseDocument(value, id);
}

export function readPublished(id: string, root: string = defaultContentRoot): ContentDocument | null {
  const file = path.join(documentDir(root, id), "published.json");
  const value = readJson(file);
  if (value === undefined) return null;
  return parseDocument(value, id);
}

export function listPublished(root: string = defaultContentRoot): ContentDocument[] {
  return listDocumentIds(root)
    .map((id) => readPublished(id, root))
    .filter((doc): doc is ContentDocument => doc !== null);
}

function stamp(doc: ContentDocument): ContentDocument {
  return { ...doc, updatedAt: new Date().toISOString() };
}

export function saveDraft(doc: ContentDocument, root: string = defaultContentRoot): ContentDocument {
  const next = stamp(parseDocument(doc, doc.id));
  writeDocument(path.join(documentDir(root, next.id), "draft.json"), next);
  return next;
}

export function publishDocument(doc: ContentDocument, root: string = defaultContentRoot): {
  draft: ContentDocument;
  published: ContentDocument;
} {
  const draft = stamp(parseDocument(doc, doc.id));
  for (const other of listPublished(root)) {
    if (other.id !== draft.id && other.slug === draft.slug) {
      throw new ContentError(`Slug "${draft.slug}" is already used by "${other.id}".`);
    }
  }
  const dir = documentDir(root, draft.id);
  writeDocument(path.join(dir, "draft.json"), draft);
  const published = stamp(draft);
  writeDocument(path.join(dir, "published.json"), published);
  return { draft, published };
}

export function revertDraft(id: string, root: string = defaultContentRoot): {
  draft: ContentDocument;
  published: ContentDocument;
} {
  const published = readPublished(id, root);
  if (!published) throw new ContentError(`No published copy of "${id}" to revert to.`);
  const draft = stamp(published);
  writeDocument(path.join(documentDir(root, id), "draft.json"), draft);
  return { draft, published };
}

export function summarize(id: string, root: string = defaultContentRoot): DocumentSummary {
  const draft = readDraft(id, root);
  const published = readPublished(id, root);
  return {
    id: draft.id,
    title: draft.title,
    kind: draft.kind,
    slug: draft.slug,
    hasPublished: published !== null,
    draftUpdatedAt: draft.updatedAt,
    publishedUpdatedAt: published?.updatedAt ?? null,
    unpublishedChanges: published === null || contentFingerprint(draft) !== contentFingerprint(published),
  };
}

export function listSummaries(root: string = defaultContentRoot): DocumentSummary[] {
  return listDocumentIds(root).map((id) => summarize(id, root));
}
