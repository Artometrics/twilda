import { TwildaError } from "../../core/src/errors";
import { mergeDocuments, mergeSites, type MergeChoice, type MergeConflict } from "../../core/src/merge";
import { inspectUpload } from "../../core/src/media-guard";
import { SITE_BRANCH, SITE_PATH, draftBranchName, draftPath, mediaRepoPath, publishedPath } from "../../core/src/paths";
import { documentSchema, type TwildaDocument } from "../../core/src/schema";
import { contentDigest, formatDocumentError, parseDocument, serializeDocument } from "../../core/src/serialize";
import { parseSite, serializeSite, type SiteSettings } from "../../core/src/site";
import { GitHubBackend } from "./index";

/**
 * The one publish path every editor shares: the phone desk and click-to-edit.
 *
 * Publishing is a pull request into `main`, never a push to it. Before it writes, it
 * looks at `main` again. If the document changed there since this device last saw it,
 * the draft is three-way merged (silently when nothing overlaps) or the conflicts are
 * handed back for a person to settle. The pull request branch is rebuilt from the tip
 * of `main`, so a stale branch can never drag old content into a merge.
 */

export interface RepoAccess {
  token: string;
  owner: string;
  repo: string;
  fetchImpl?: typeof fetch;
}

export type PublishPlan =
  | {
      /** `main` has not changed this document since the draft's base. Publish `doc` as it is. */
      status: "current";
      doc: TwildaDocument;
      /** Digest of main's copy at planning time; pass it to `publishDocument` as `expectedTheirs`. */
      theirsDigest: string | null;
    }
  | {
      /** `main` changed, nothing overlapped, and the changes were folded into `doc`. */
      status: "rebased";
      doc: TwildaDocument;
      theirs: TwildaDocument;
      theirsDigest: string | null;
    }
  | {
      status: "conflict";
      doc: TwildaDocument;
      theirs: TwildaDocument;
      conflicts: MergeConflict[];
      theirsDigest: string | null;
    };

function checkDocument(doc: TwildaDocument): TwildaDocument {
  const result = documentSchema.safeParse(doc);
  if (!result.success) throw new TwildaError(`This page is not ready to publish. ${formatDocumentError(result.error)}`, "invalid-document");
  return result.data;
}

function backendFor(access: RepoAccess): GitHubBackend {
  if (!access.token.trim()) {
    throw new TwildaError("Sign in to GitHub first. The token is never stored in the repo.", "github-auth");
  }
  return new GitHubBackend({ owner: access.owner, repo: access.repo, token: access.token, fetch: access.fetchImpl });
}

async function readDoc(view: GitHubBackend, path: string): Promise<TwildaDocument | null> {
  try {
    return parseDocument((await view.read(path)).text);
  } catch (error) {
    if (error instanceof TwildaError && error.code === "not-found") return null;
    throw error;
  }
}

/** The copy of a document `main` has now: its draft file if there is one, else its published file. */
export async function readMainDocument(access: RepoAccess, id: string): Promise<TwildaDocument | null> {
  const main = backendFor(access);
  return (await readDoc(main, draftPath(id))) ?? (await readDoc(main, publishedPath(id)));
}

/**
 * Compare `main` with the copy this draft started from (`base`) and fold the two together.
 * Call it again with `decisions` (conflict key to "ours" or "theirs") to settle conflicts.
 */
export async function planPublish(
  access: RepoAccess,
  input: {
    base: TwildaDocument | null;
    doc: TwildaDocument;
    decisions?: Record<string, MergeChoice>;
    /** Copies this device already sent in an earlier pull request. If `main` has one of them, `main` has nothing of anyone else's. */
    known?: Array<TwildaDocument | null | undefined>;
  },
): Promise<PublishPlan> {
  const theirs = await readMainDocument(access, input.doc.id);
  if (!theirs) return { status: "current", doc: input.doc, theirsDigest: null };
  const theirsDigest = contentDigest(theirs);
  if (input.known?.some((copy) => copy && contentDigest(copy) === theirsDigest)) return { status: "current", doc: input.doc, theirsDigest };
  if (input.base && contentDigest(input.base) === theirsDigest) return { status: "current", doc: input.doc, theirsDigest };
  if (contentDigest(input.doc) === theirsDigest) return { status: "current", doc: input.doc, theirsDigest };
  const merged = mergeDocuments(input.base, input.doc, theirs, input.decisions);
  if (merged.conflicts.length > 0) {
    return { status: "conflict", doc: merged.doc, theirs, conflicts: merged.conflicts, theirsDigest };
  }
  const result = documentSchema.safeParse(merged.doc);
  if (!result.success) {
    throw new TwildaError("The merged page is not valid. Open the conflicts and choose again.", "merge-invalid");
  }
  return { status: "rebased", doc: result.data, theirs, theirsDigest };
}

export interface PublishInput {
  access: RepoAccess;
  doc: TwildaDocument;
  /** Digest `planPublish` saw on `main`. If `main` has moved again since, nothing is written. */
  expectedTheirs?: string | null;
  /** Uploaded images not yet in the repo: file name (`field-notes.jpg`) to base64 bytes. */
  media?: Record<string, string>;
  /** A theme or masthead change to commit in the same pull request. */
  site?: SiteSettings;
  /** Refs the person edited, for the pull request body. */
  changed?: string[];
  title?: string;
  note?: string;
  now?: () => Date;
}

export interface PublishResult {
  number: number;
  url: string;
  branch: string;
  files: string[];
  media: string[];
  /** Final document that was committed. Upload names may differ from the draft's if a file name was taken on `main`. */
  doc: TwildaDocument;
}

const MEDIA_SRC = /^\/media\/([a-z0-9][a-z0-9-]{0,78}\.(?:svg|jpg|png|webp|gif))$/;

/** Every `/media/<name>` string the document prints. */
export function mediaNames(doc: TwildaDocument): string[] {
  const found = new Set<string>();
  const walk = (value: unknown) => {
    if (typeof value === "string") {
      const match = MEDIA_SRC.exec(value);
      if (match) found.add(match[1] as string);
    } else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(doc);
  return [...found];
}

function replaceMedia(doc: TwildaDocument, from: string, to: string): TwildaDocument {
  const walk = (value: unknown): unknown => {
    if (value === `/media/${from}`) return `/media/${to}`;
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, walk(child)]));
    return value;
  };
  return walk(doc) as TwildaDocument;
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The sha git (and the GitHub Contents API) gives a file's bytes. */
export async function gitBlobSha(bytes: Uint8Array): Promise<string> {
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const all = new Uint8Array(header.length + bytes.length);
  all.set(header, 0);
  all.set(bytes, header.length);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", all));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const MAX_MEDIA_BYTES = 1_000_000;

/**
 * Open a pull request that carries the document (as `draft.json` and `published.json`),
 * every uploaded image the document still prints, and optionally the site settings.
 * Merging it is the publish decision. Nothing here deploys anything.
 */
export async function publishDocument(input: PublishInput): Promise<PublishResult> {
  const main = backendFor(input.access);
  let doc = checkDocument(input.doc);

  if (input.expectedTheirs !== undefined) {
    const now = await readMainDocument(input.access, doc.id);
    const digest = now ? contentDigest(now) : null;
    if (digest !== input.expectedTheirs) {
      throw new TwildaError("main changed while you were publishing. Review the changes and publish again.", "main-moved");
    }
  }

  const stamp = (input.now ?? (() => new Date()))().toISOString();
  const uploads: Array<{ name: string; bytes: Uint8Array; base64: string }> = [];
  for (const name of mediaNames(doc)) {
    const base64 = input.media?.[name];
    if (!base64) continue;
    // Base64 is 4 characters per 3 bytes: refuse before decoding something enormous.
    if (base64.length > Math.ceil((MAX_MEDIA_BYTES * 4) / 3) + 8) throw new TwildaError(`${name} is too large to commit.`, "media-too-large");
    let bytes: Uint8Array;
    try {
      bytes = fromBase64(base64);
    } catch {
      throw new TwildaError(`${name} is not valid image data.`, "media-rejected");
    }
    if (bytes.length > MAX_MEDIA_BYTES) throw new TwildaError(`${name} is too large to commit (${bytes.length} bytes).`, "media-too-large");
    const problem = inspectUpload(name, bytes);
    if (problem) throw new TwildaError(problem, "media-rejected");
    let finalName = name;
    const blob = await gitBlobSha(bytes);
    for (let n = 2; n < 100; n += 1) {
      const existing = await main.fileSha(mediaRepoPath(finalName));
      if (existing === null || existing === blob) break;
      finalName = `${name.replace(/\.([a-z]+)$/, "")}-${n}.${name.split(".").pop()}`;
    }
    if (finalName !== name) doc = replaceMedia(doc, name, finalName);
    uploads.push({ name: finalName, bytes, base64 });
  }
  doc = checkDocument(doc);

  const branch = draftBranchName(doc.id);
  await main.resetBranch(branch);
  const onBranch = main.at(branch);
  const files: string[] = [];
  const mediaFiles: string[] = [];
  for (const upload of uploads) {
    const path = mediaRepoPath(upload.name);
    if ((await main.fileSha(path)) === (await gitBlobSha(upload.bytes))) continue;
    await onBranch.writeBinary(path, upload.base64, `Add image ${upload.name}`);
    mediaFiles.push(path);
  }
  await onBranch.write(draftPath(doc.id), serializeDocument({ ...doc, status: "draft", updatedAt: stamp }), `Save draft of ${doc.title}`);
  await onBranch.write(publishedPath(doc.id), serializeDocument({ ...doc, status: "published", updatedAt: stamp }), `Publish ${doc.title}`);
  files.push(draftPath(doc.id), publishedPath(doc.id));
  if (input.site) {
    await onBranch.write(SITE_PATH, serializeSite(input.site), "Update site settings");
    files.push(SITE_PATH);
  }
  files.push(...mediaFiles);

  const list = (input.changed ?? []).slice(0, 20).map((ref) => `- \`${ref}\``);
  if ((input.changed ?? []).length > 20) list.push(`- and ${(input.changed ?? []).length - 20} more`);
  const body = [
    input.note ?? "Opened from the Twilda editor. Merging this pull request is the publish decision.",
    "",
    ...(list.length ? ["Edited fields:", ...list, ""] : []),
    ...(mediaFiles.length ? ["Images added:", ...mediaFiles.map((path) => `- \`${path}\``), ""] : []),
    ...(input.site ? ["Site settings (masthead or theme) changed in this pull request.", ""] : []),
    "Nothing is deployed by this pull request itself.",
  ].join("\n");
  const pr = await main.openPullRequest({
    title: input.title ?? `Publish ${doc.title}`,
    head: branch,
    base: "main",
    body,
  });
  return { number: pr.number, url: pr.url, branch, files, media: mediaFiles, doc };
}

// ---- site settings -------------------------------------------------------------------------

export type SitePlan =
  | { status: "current"; site: SiteSettings; theirs: SiteSettings | null; theirsDigest: string | null }
  | { status: "rebased"; site: SiteSettings; theirs: SiteSettings; theirsDigest: string | null }
  | { status: "conflict"; site: SiteSettings; theirs: SiteSettings; conflicts: MergeConflict[]; theirsDigest: string | null };

export async function readMainSite(access: RepoAccess): Promise<SiteSettings | null> {
  try {
    return parseSite((await backendFor(access).read(SITE_PATH)).text);
  } catch (error) {
    if (error instanceof TwildaError && error.code === "not-found") return null;
    throw error;
  }
}

export async function planSitePublish(
  access: RepoAccess,
  input: {
    base: SiteSettings | null;
    site: SiteSettings;
    decisions?: Record<string, MergeChoice>;
    known?: Array<SiteSettings | null | undefined>;
  },
): Promise<SitePlan> {
  const theirs = await readMainSite(access);
  if (!theirs) return { status: "current", site: input.site, theirs: null, theirsDigest: null };
  const theirsDigest = serializeSite(theirs);
  const same = (copy: SiteSettings | null | undefined) => copy && serializeSite(copy) === theirsDigest;
  if (input.known?.some(same) || same(input.base) || same(input.site)) {
    return { status: "current", site: input.site, theirs, theirsDigest };
  }
  const merged = mergeSites(input.base, input.site, theirs, input.decisions);
  if (merged.conflicts.length > 0) return { status: "conflict", site: merged.site, theirs, conflicts: merged.conflicts, theirsDigest };
  return { status: "rebased", site: parseSite(serializeSite(merged.site)), theirs, theirsDigest };
}

export interface PublishSiteInput {
  access: RepoAccess;
  site: SiteSettings;
  expectedTheirs?: string | null;
  note?: string;
}

/** Open a pull request that changes `content/site.json` only: the masthead and theme tokens. */
export async function publishSite(input: PublishSiteInput): Promise<{ number: number; url: string; branch: string; files: string[] }> {
  const main = backendFor(input.access);
  if (input.expectedTheirs !== undefined) {
    const now = await readMainSite(input.access);
    if ((now ? serializeSite(now) : null) !== input.expectedTheirs) {
      throw new TwildaError("main changed the site settings while you were publishing. Review and publish again.", "main-moved");
    }
  }
  const text = serializeSite(input.site);
  await main.resetBranch(SITE_BRANCH);
  await main.at(SITE_BRANCH).write(SITE_PATH, text, "Update site settings");
  const pr = await main.openPullRequest({
    title: "Update site theme and masthead",
    head: SITE_BRANCH,
    base: "main",
    body: [input.note ?? "Opened from the Twilda editor.", "", `Changes \`${SITE_PATH}\` only. Merging it changes the masthead and theme on every page. Nothing is deployed by this pull request itself.`].join("\n"),
  });
  return { number: pr.number, url: pr.url, branch: SITE_BRANCH, files: [SITE_PATH] };
}
