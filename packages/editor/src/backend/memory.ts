import type {
  StorageBackend,
  StorageBranch,
  StorageDraftRef,
  StorageListEntry,
  StoragePullRequest,
} from "../contract";
import { draftPath, publishedPath } from "./paths";

interface WriteFault {
  test: (path: string) => boolean;
  message: string;
}

/**
 * In-memory StorageBackend for the desk dev server and the tests.
 * Files are strings. Images are data URLs. Nothing touches git or the network.
 */
export class MemoryBackend implements StorageBackend {
  readonly files = new Map<string, { contents: string; updatedAt: string }>();
  readonly branches: StorageBranch[] = [{ name: "main" }];
  readonly pullRequests: StoragePullRequest[] = [];
  private writeFault: WriteFault | null = null;
  private revertFault: string | null = null;
  private now: () => string;

  constructor(now: () => string = () => new Date().toISOString()) {
    this.now = now;
  }

  failNextWrite(test: (path: string) => boolean, message: string): void {
    this.writeFault = { test, message };
  }

  failNextRevert(message: string): void {
    this.revertFault = message;
  }

  async list(prefix = ""): Promise<StorageListEntry[]> {
    const entries: StorageListEntry[] = [];
    for (const [path, file] of this.files) {
      if (path.startsWith(prefix)) entries.push({ path, updatedAt: file.updatedAt });
    }
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries;
  }

  async read(path: string): Promise<string> {
    const file = this.files.get(path);
    if (!file) throw new Error(`Not found: ${path}`);
    return file.contents;
  }

  async write(path: string, contents: string): Promise<void> {
    if (this.writeFault?.test(path)) {
      const message = this.writeFault.message;
      this.writeFault = null;
      throw new Error(message);
    }
    this.files.set(path, { contents, updatedAt: this.now() });
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }

  async createBranch(input: { name: string; from?: string }): Promise<StorageBranch> {
    const branch = { name: input.name };
    this.branches.push(branch);
    return branch;
  }

  async openPullRequest(input: {
    title: string;
    body?: string;
    head: string;
    base: string;
  }): Promise<StoragePullRequest> {
    const pull = {
      number: this.pullRequests.length + 1,
      url: `memory://pull/${this.pullRequests.length + 1}`,
      title: input.title,
      head: input.head,
      base: input.base,
    };
    this.pullRequests.push(pull);
    return pull;
  }

  async mergePullRequest(input: { number: number }): Promise<{ merged: boolean }> {
    const found = this.pullRequests.some((pull) => pull.number === input.number);
    if (!found) throw new Error(`No pull request ${input.number}.`);
    return { merged: true };
  }

  async revert(input: { documentId: string }): Promise<void> {
    if (this.revertFault) {
      const message = this.revertFault;
      this.revertFault = null;
      throw new Error(message);
    }
    const published = await this.read(publishedPath(input.documentId));
    await this.write(draftPath(input.documentId), published);
  }

  async listDrafts(): Promise<StorageDraftRef[]> {
    const drafts: StorageDraftRef[] = [];
    for (const [path, file] of this.files) {
      if (!path.endsWith("/draft.json")) continue;
      const doc = JSON.parse(file.contents) as { id?: string; updatedAt?: string };
      if (!doc.id) continue;
      drafts.push({ id: doc.id, path, updatedAt: doc.updatedAt ?? file.updatedAt });
    }
    drafts.sort((a, b) => a.id.localeCompare(b.id));
    return drafts;
  }
}
