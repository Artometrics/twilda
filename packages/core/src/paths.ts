import { TwildaError } from "./errors";

/** Contract v1 path helpers. File text is JSON from the Zod document schema. */

export const BASE_BRANCH = "main";
export const DRAFT_BRANCH_PREFIX = "twilda/draft/";
/** Branch a theme or masthead publish goes through. */
export const SITE_BRANCH = "twilda/site";
export const REVERT_BRANCH_PREFIX = "twilda/revert/";

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertDocumentId(id: string): void {
  if (!ID.test(id)) {
    throw new TwildaError("Document ids are lowercase words separated by hyphens.", "bad-id");
  }
}

export function assertSafePath(path: string): void {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new TwildaError("Path is not allowed.", "bad-path");
  }
}

export function draftBranchName(id: string): string {
  assertDocumentId(id);
  return `${DRAFT_BRANCH_PREFIX}${id}`;
}

/**
 * One storage model for every editor and the static build: a folder per document,
 * `content/<id>/draft.json` beside `content/<id>/published.json`. The site reads
 * published files only. A draft is never read by the build. Merging a pull request
 * that writes `published.json` is the publish decision.
 */
export const CONTENT_ROOT = "content";
/** Site settings (masthead, theme tokens): one file, stored in git like a document. */
export const SITE_PATH = "content/site.json";
/** Where repo images live. `public/media/<name>` is served as `/media/<name>`. */
export const MEDIA_DIR = "public/media";

export function documentDir(id: string): string {
  assertDocumentId(id);
  return `${CONTENT_ROOT}/${id}`;
}

export function draftPath(id: string): string {
  return `${documentDir(id)}/draft.json`;
}

export function publishedPath(id: string): string {
  return `${documentDir(id)}/published.json`;
}

/** `content/<id>/draft.json` or `published.json` to its document id, else null. */
export function documentIdFromPath(path: string): { id: string; file: "draft" | "published" } | null {
  const match = /^content\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(draft|published)\.json$/.exec(path);
  if (!match) return null;
  return { id: match[1] as string, file: match[2] as "draft" | "published" };
}

const MEDIA_FILE = /^[a-z0-9][a-z0-9-]{0,78}\.(?:svg|jpg|png|webp|gif)$/;

/** Repo path of an image file, e.g. `public/media/field-notes.jpg`. */
export function mediaRepoPath(name: string): string {
  if (!MEDIA_FILE.test(name)) throw new TwildaError("Media file name is not allowed.", "bad-path");
  return `${MEDIA_DIR}/${name}`;
}

export function historyDir(id: string): string {
  assertDocumentId(id);
  return `content/.twilda/history/${id}`;
}

export function historyPath(id: string, stamp: string): string {
  if (!/^[0-9T.Z-]+$/.test(stamp)) {
    throw new TwildaError("History stamp is not a safe file name.", "bad-path");
  }
  return `${historyDir(id)}/${stamp}.json`;
}

export function stampFromIso(iso: string): string {
  return iso.replace(/:/g, "-");
}

export function mediaRecordPath(name: string): string {
  if (!/^[a-z0-9][a-z0-9._-]{0,80}$/.test(name)) {
    throw new TwildaError("Media file name is not allowed.", "bad-path");
  }
  return `content/media/${name}.json`;
}
