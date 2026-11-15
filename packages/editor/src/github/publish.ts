import { planPublish, publishDocument, publishSite, planSitePublish, type RepoAccess } from "../../../backend-github/src/publish";
import type { MergeChoice, MergeConflict, SiteSettings, TwildaDocument } from "@twilda/core";
import type { Doc } from "../model";

export interface GithubPublishInput {
  token: string;
  owner: string;
  repo: string;
  doc: Doc;
  /** The copy of this document on `main` the last time this device looked. Null if it never has. */
  base?: Doc | null;
  /** Copies this device already sent in earlier pull requests. */
  known?: Array<Doc | null | undefined>;
  /** Uploaded images not yet in the repo: file name to base64 bytes. */
  media?: Record<string, string>;
  /** Conflict choices from an earlier attempt, by conflict key. */
  decisions?: Record<string, MergeChoice>;
  fetchImpl?: typeof fetch;
}

export interface GithubPublishResult {
  number: number;
  url: string;
  /** True when `main` had moved and the draft was merged with it first. The merged copy is `doc`. */
  rebased: boolean;
  /** What was committed. Differs from the input when `main` was folded in or an image name was taken. */
  doc: Doc;
  /** `main`'s copy at the time, so the next publish knows what this device has seen. Null if `main` has none. */
  seen: Doc | null;
}

/** `main` moved and the same fields were edited on both sides. Settle each, then publish again with `decisions`. */
export class GithubConflict extends Error {
  readonly conflicts: MergeConflict[];
  readonly doc: Doc;
  readonly theirs: Doc;
  constructor(conflicts: MergeConflict[], doc: Doc, theirs: Doc) {
    super(`main changed ${conflicts.length} field${conflicts.length === 1 ? "" : "s"} you also edited.`);
    this.name = "GithubConflict";
    this.conflicts = conflicts;
    this.doc = doc;
    this.theirs = theirs;
  }
}

function access(input: { token: string; owner: string; repo: string; fetchImpl?: typeof fetch }): RepoAccess {
  if (!input.token.trim()) {
    throw new Error("GitHub publish needs a token. Paste one in the publish dialog. It is not stored.");
  }
  return { token: input.token, owner: input.owner, repo: input.repo, fetchImpl: input.fetchImpl };
}

/**
 * Open a pull request that carries the document and any uploaded images it prints.
 * Looks at `main` first: if the document changed there since this device last saw it, the
 * draft is merged (silently when nothing overlaps) or a `GithubConflict` is thrown for a person
 * to settle. The token is never read from the repository and is not stored.
 * Merging the pull request is the publish decision.
 */
export async function openGithubPullRequest(input: GithubPublishInput): Promise<GithubPublishResult> {
  const repo = access(input);
  const plan = await planPublish(repo, {
    base: (input.base ?? null) as TwildaDocument | null,
    doc: input.doc as TwildaDocument,
    decisions: input.decisions,
    known: input.known as Array<TwildaDocument | null | undefined>,
  });
  if (plan.status === "conflict") throw new GithubConflict(plan.conflicts, plan.doc as Doc, plan.theirs as Doc);
  const result = await publishDocument({
    access: repo,
    doc: plan.doc,
    expectedTheirs: plan.theirsDigest,
    media: input.media,
    title: `Publish ${input.doc.title}`,
    note: "Opened from the Twilda desk. Merging this pull request is the publish decision.",
  });
  return {
    number: result.number,
    url: result.url,
    rebased: plan.status === "rebased",
    doc: result.doc as Doc,
    seen: plan.status === "current" ? null : (plan.theirs as Doc),
  };
}

export interface GithubSiteInput {
  token: string;
  owner: string;
  repo: string;
  site: SiteSettings;
  base: SiteSettings | null;
  known?: Array<SiteSettings | null | undefined>;
  decisions?: Record<string, MergeChoice>;
  fetchImpl?: typeof fetch;
}

export class GithubSiteConflict extends Error {
  readonly conflicts: MergeConflict[];
  readonly site: SiteSettings;
  constructor(conflicts: MergeConflict[], site: SiteSettings) {
    super(`main changed ${conflicts.length} site setting${conflicts.length === 1 ? "" : "s"} you also changed.`);
    this.name = "GithubSiteConflict";
    this.conflicts = conflicts;
    this.site = site;
  }
}

/** Open a pull request that changes `content/site.json` only. Same moved-main check as a document. */
export async function openSitePullRequest(
  input: GithubSiteInput,
): Promise<{ number: number; url: string; rebased: boolean; site: SiteSettings; seen: SiteSettings | null }> {
  const repo = access(input);
  const plan = await planSitePublish(repo, { base: input.base, site: input.site, decisions: input.decisions, known: input.known });
  if (plan.status === "conflict") throw new GithubSiteConflict(plan.conflicts, plan.site);
  const pr = await publishSite({ access: repo, site: plan.site, expectedTheirs: plan.theirsDigest, note: "Opened from the Twilda desk." });
  return { number: pr.number, url: pr.url, rebased: plan.status === "rebased", site: plan.site, seen: plan.theirs };
}

/** A sign-in failure the person can act on. */
export function describeAuthError(error: unknown, proxy: string): string {
  if (error instanceof TypeError) {
    return proxy
      ? "Could not reach the device-flow proxy. Check PUBLIC_TWILDA_DEVICE_FLOW_PROXY, or paste a token instead."
      : "GitHub blocks browser calls to its device-flow endpoint. Paste a token instead.";
  }
  return error instanceof Error ? error.message : "GitHub sign-in failed.";
}
