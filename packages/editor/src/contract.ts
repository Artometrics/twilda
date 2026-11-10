/**
 * Local stand-in for the StorageBackend Agent A is publishing on
 * `cursor/twilda-core-types`.
 *
 * When that package exists, replace this file with a re-export:
 *
 *   export type { StorageBackend, ... } from "@twilda/core";
 *
 * Method names match the contract called out for the desk: list, read,
 * write, delete, createBranch, openPullRequest, mergePullRequest, revert,
 * listDrafts. Shapes are deliberately small so a later adapter can map
 * them without rewriting the screen components.
 */

export interface StorageListEntry {
  path: string;
  updatedAt: string;
}

export interface StorageBranch {
  name: string;
}

export interface StoragePullRequest {
  number: number;
  url: string;
  title: string;
  head: string;
  base: string;
}

export interface StorageDraftRef {
  id: string;
  path: string;
  updatedAt: string;
}

export interface StorageBackend {
  list(prefix?: string): Promise<StorageListEntry[]>;
  read(path: string): Promise<string>;
  write(path: string, contents: string): Promise<void>;
  delete(path: string): Promise<void>;
  createBranch(input: { name: string; from?: string }): Promise<StorageBranch>;
  openPullRequest(input: {
    title: string;
    body?: string;
    head: string;
    base: string;
  }): Promise<StoragePullRequest>;
  mergePullRequest(input: { number: number }): Promise<{ merged: boolean }>;
  revert(input: { documentId: string }): Promise<void>;
  listDrafts(): Promise<StorageDraftRef[]>;
}
