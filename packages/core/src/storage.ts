/**
 * Contract v1 storage interface.
 * `demo`, `fs`, and `github` all implement this. Methods operate on `ref`.
 * `at(ref)` returns a view of another branch and does not change the caller.
 * `createBranch` is idempotent: an existing branch is returned as-is.
 * `revert` writes `text` to `path` on `branch` (empty text deletes the file)
 * in a new commit. It is a content restore, not GitHub's compare-view button.
 * Do not change these signatures without a note in the PR.
 */

export interface StorageListItem {
  path: string;
  updatedAt: string;
}

export interface StorageEntry {
  path: string;
  text: string;
  updatedAt: string;
  sha: string;
}

export interface BranchRef {
  name: string;
  headSha: string;
}

export interface PullRequestRef {
  number: number;
  url: string;
  title: string;
  head: string;
  base: string;
  state: "open" | "merged" | "closed";
}

export interface DraftRecord {
  id: string;
  kind: "article" | "page";
  title: string;
  slug: string;
  branch: string;
  updatedAt: string;
  hasUnpublishedChanges: boolean;
}

export interface OpenPullRequestInput {
  title: string;
  head: string;
  base: string;
  body?: string;
}

export interface RevertInput {
  branch: string;
  path: string;
  text: string;
  message: string;
}

export interface StorageBackend {
  readonly id: "demo" | "fs" | "github";
  readonly ref: string;
  list(prefix?: string): Promise<StorageListItem[]>;
  read(path: string): Promise<StorageEntry>;
  write(path: string, text: string): Promise<StorageEntry>;
  delete(path: string): Promise<void>;
  at(ref: string): StorageBackend;
  createBranch(name: string, fromRef?: string): Promise<BranchRef>;
  openPullRequest(input: OpenPullRequestInput): Promise<PullRequestRef>;
  mergePullRequest(number: number): Promise<PullRequestRef>;
  revert(input: RevertInput): Promise<{ commitSha: string }>;
  listDrafts(): Promise<DraftRecord[]>;
}
