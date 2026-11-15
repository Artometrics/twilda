import { GitHubBackend } from "../../../backend-github/src/index";
import { documentPath, draftBranchName } from "../../../core/src/paths";
import { serializeDocument } from "../../../core/src/serialize";
import type { Doc } from "../model";

export interface GithubPublishInput {
  clientId: string;
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
 * Refuses to call GitHub unless a client id and a runtime token are both set.
 * The token is never read from the repository.
 */
export async function openGithubPullRequest(input: GithubPublishInput): Promise<GithubPublishResult> {
  if (!input.clientId.trim()) {
    throw new Error("GitHub publish is off until PUBLIC_TWILDA_GITHUB_CLIENT_ID is set.");
  }
  if (!input.token.trim()) {
    throw new Error("GitHub publish needs a token from device sign-in. It is not stored in the repo.");
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
  const text = serializeDocument(published);
  await backend.at(branch).write(filePath, text);
  const pr = await backend.openPullRequest({
    title: `Publish ${input.doc.title}`,
    head: branch,
    base: "main",
    body: "Opened from the Twilda phone desk.",
  });
  return { number: pr.number, url: pr.url };
}
