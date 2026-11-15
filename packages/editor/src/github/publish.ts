import { GitHubBackend } from "../../../backend-github/src/index";
import { documentPath, draftBranchName, serializeDocument } from "@twilda/core";
import type { Doc } from "../model";

export interface GithubPublishInput {
  token: string;
  owner: string;
  repo: string;
  doc: Doc;
  fetchImpl?: typeof fetch;
}

export interface GithubPublishResult {
  number: number;
  url: string;
}

/**
 * Open a pull request that adds the document at the contract path.
 * Refuses to call GitHub without a runtime token. The token is never read from
 * the repository and is not stored: the caller holds it in memory.
 * Merging the pull request is the publish decision.
 */
export async function openGithubPullRequest(input: GithubPublishInput): Promise<GithubPublishResult> {
  if (!input.token.trim()) {
    throw new Error("GitHub publish needs a token. Paste one in the publish dialog. It is not stored.");
  }
  const backend = new GitHubBackend({
    owner: input.owner,
    repo: input.repo,
    token: input.token,
    fetch: input.fetchImpl,
  });
  const branch = draftBranchName(input.doc.id);
  await backend.createBranch(branch);
  const filePath = documentPath(input.doc.kind, input.doc.slug);
  const published = { ...input.doc, status: "published" as const };
  await backend.at(branch).write(filePath, serializeDocument(published));
  const pr = await backend.openPullRequest({
    title: `Publish ${input.doc.title}`,
    head: branch,
    base: "main",
    body: "Opened from the Twilda desk. Merging this pull request is the publish decision.",
  });
  return { number: pr.number, url: pr.url };
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
