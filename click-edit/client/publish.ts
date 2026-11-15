import { pollDeviceFlow, startDeviceFlow, type DeviceFlowStart } from "../../packages/backend-github/src/index";
import { planPublish, publishDocument, type PublishPlan } from "../../packages/backend-github/src/publish";
import { contentDigest, draftPath, publishedPath } from "@twilda/core";
import type { MergeChoice, MergeConflict, SiteSettings, TwildaDocument } from "@twilda/core";
import { changedRefs } from "@twilda/core/edit";

export interface PublishInput {
  token: string;
  owner: string;
  repo: string;
  /** The document as the page was built (what `main` had when this draft started). */
  base: TwildaDocument;
  /** The local draft being published. */
  doc: TwildaDocument;
  /** Uploaded images not yet in the repo: file name to base64 bytes. */
  media?: Record<string, string>;
  /** Theme or masthead changes to commit in the same pull request. */
  site?: SiteSettings;
  /** Conflict choices from an earlier attempt. */
  decisions?: Record<string, MergeChoice>;
  /** Copies this device already sent, so they are not mistaken for someone else's edit. */
  known?: TwildaDocument[];
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface PublishResult {
  number: number;
  url: string;
  branch: string;
  files: string[];
  /** True when `main` had moved and the draft was merged with it before publishing. */
  rebased: boolean;
  doc: TwildaDocument;
  /** `main`'s copy at the time when it differed from the base, else null. */
  seen: TwildaDocument | null;
}

/** `main` moved and the same fields were edited on both sides. Settle each, then publish again with `decisions`. */
export class PublishConflict extends Error {
  readonly conflicts: MergeConflict[];
  readonly doc: TwildaDocument;
  readonly theirs: TwildaDocument;
  constructor(plan: Extract<PublishPlan, { status: "conflict" }>) {
    super(`main changed ${plan.conflicts.length} field${plan.conflicts.length === 1 ? "" : "s"} you also edited.`);
    this.name = "PublishConflict";
    this.conflicts = plan.conflicts;
    this.doc = plan.doc;
    this.theirs = plan.theirs;
  }
}

/** The layout the static site reads: `content/<id>/draft.json` and `published.json`. */
export function fieldDeskFiles(id: string): { draft: string; published: string } {
  return { draft: draftPath(id), published: publishedPath(id) };
}

/**
 * Same steps as the phone desk, through the same module: check whether `main` moved, merge
 * if it did, branch `twilda/draft/<id>` rebuilt from `main`, commit with the user's runtime
 * token, open a pull request into `main`. Draft and published files are written separately,
 * so merging is the publish decision.
 */
export async function publishToGithub(input: PublishInput): Promise<PublishResult> {
  if (!input.token.trim()) throw new Error("Sign in to GitHub first. The token is never stored in the repo.");
  const changed = changedRefs(input.base, input.doc);
  const hasMedia = Object.keys(input.media ?? {}).length > 0;
  if (changed.length === 0 && contentDigest(input.base) === contentDigest(input.doc) && !input.site && !hasMedia) {
    throw new Error("No edits to publish.");
  }
  const access = { token: input.token, owner: input.owner, repo: input.repo, fetchImpl: input.fetchImpl };
  const plan = await planPublish(access, { base: input.base, doc: input.doc, decisions: input.decisions, known: input.known });
  if (plan.status === "conflict") throw new PublishConflict(plan);
  const result = await publishDocument({
    access,
    doc: plan.doc,
    expectedTheirs: plan.theirsDigest,
    media: input.media,
    site: input.site,
    changed,
    title: `Edit ${input.doc.title} from the page`,
    note: "Opened from the Twilda click-to-edit editor.",
    now: input.now,
  });
  return { number: result.number, url: result.url, branch: result.branch, files: result.files, rebased: plan.status === "rebased", doc: result.doc, seen: plan.status === "current" ? null : plan.theirs };
}

export function describeAuthError(error: unknown, proxy: string): string {
  if (error instanceof TypeError) {
    return proxy
      ? "Could not reach the device-flow proxy. Check PUBLIC_TWILDA_DEVICE_FLOW_PROXY, or paste a token instead."
      : "GitHub blocks browser calls to its device-flow endpoint (no CORS headers). Set PUBLIC_TWILDA_DEVICE_FLOW_PROXY, or paste a token instead.";
  }
  return error instanceof Error ? error.message : "GitHub sign-in failed.";
}

export function beginDeviceFlow(input: {
  clientId: string;
  proxy: string;
  fetchImpl?: typeof fetch;
}): Promise<DeviceFlowStart> {
  return startDeviceFlow({ clientId: input.clientId, baseUrl: input.proxy || undefined, fetchImpl: input.fetchImpl });
}

export function checkDeviceFlow(input: {
  clientId: string;
  proxy: string;
  deviceCode: string;
  fetchImpl?: typeof fetch;
}): Promise<{ status: "pending" | "ready"; accessToken?: string }> {
  return pollDeviceFlow({
    clientId: input.clientId,
    deviceCode: input.deviceCode,
    baseUrl: input.proxy || undefined,
    fetchImpl: input.fetchImpl,
  });
}
