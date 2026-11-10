import { TwildaError } from "./errors";

/** Contract v1 path helpers. File text is JSON from the Zod document schema. */

export const BASE_BRANCH = "main";
export const DRAFT_BRANCH_PREFIX = "twilda/draft/";
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

export function articlePath(slug: string): string {
  assertDocumentId(slug);
  return `content/articles/${slug}.json`;
}

export function pagePath(slug: string): string {
  assertDocumentId(slug);
  return `content/pages/${slug}.json`;
}

export function documentPath(kind: "article" | "page", slug: string): string {
  return kind === "article" ? articlePath(slug) : pagePath(slug);
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
