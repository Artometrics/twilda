import { GitHubBackend, pollDeviceFlow, startDeviceFlow, type DeviceFlowStart } from "../../packages/backend-github/src/index";
import { draftBranchName } from "@twilda/core";
import { contentDigest, serializeDocument } from "@twilda/core";
import type { TwildaDocument } from "@twilda/core";
import { changedRefs } from "@twilda/core/edit";

export interface PublishInput {
  token: string;
  owner: string;
  repo: string;
  /** The document as built into this page (what `main` has). */
  base: TwildaDocument;
  /** The local draft being published. */
  doc: TwildaDocument;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface PublishResult {
  number: number;
  url: string;
  branch: string;
  files: string[];
}

/** Field Desk layout the static site reads: `content/<id>/draft.json` and `published.json`. */
export function fieldDeskFiles(id: string): { draft: string; published: string } {
  return { draft: `content/${id}/draft.json`, published: `content/${id}/published.json` };
}

/**
 * Same steps as the phone desk: branch `twilda/draft/<id>`, commit through the
 * GitHub Contents API with the user's runtime token, open a pull request into `main`.
 * Draft and published files are written separately, so merging is the publish decision.
 */
export async function publishToGithub(input: PublishInput): Promise<PublishResult> {
  if (!input.token.trim()) throw new Error("Sign in to GitHub first. The token is never stored in the repo.");
  const changed = changedRefs(input.base, input.doc);
  if (changed.length === 0 && contentDigest(input.base) === contentDigest(input.doc)) {
    throw new Error("No edits to publish.");
  }
  const stamp = (input.now ?? (() => new Date()))().toISOString();
  const draft = serializeDocument({ ...input.doc, status: "draft", updatedAt: stamp });
  const published = serializeDocument({ ...input.doc, status: "published", updatedAt: stamp });

  const backend = new GitHubBackend({
    owner: input.owner,
    repo: input.repo,
    token: input.token,
    fetch: input.fetchImpl,
  });
  const branch = draftBranchName(input.doc.id);
  const paths = fieldDeskFiles(input.doc.id);
  await backend.createBranch(branch);
  const onBranch = backend.at(branch);
  await onBranch.write(paths.draft, draft);
  await onBranch.write(paths.published, published);
  const list = changed.slice(0, 20).map((ref) => `- \`${ref}\``);
  if (changed.length > 20) list.push(`- and ${changed.length - 20} more`);
  const pr = await backend.openPullRequest({
    title: `Edit ${input.doc.title} from the page`,
    head: branch,
    base: "main",
    body: [
      "Opened from the Twilda click-to-edit prototype (Phase 0).",
      "",
      "Edited fields:",
      ...list,
      "",
      "Merging publishes these edits. Nothing is deployed by this pull request itself.",
    ].join("\n"),
  });
  return { number: pr.number, url: pr.url, branch, files: [paths.draft, paths.published] };
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
