import fs from "node:fs";
import path from "node:path";
import { DemoBackend, createEmptyDemoState, type DemoState } from "../../core/src/demo-backend";
import type {
  BranchRef,
  DraftRecord,
  OpenPullRequestInput,
  PullRequestRef,
  RevertInput,
  StorageBackend,
  StorageEntry,
  StorageListItem,
} from "../../core/src/storage";

/**
 * Local filesystem backend. Branch snapshots and pull requests live in
 * `.twilda/state.json`. Each branch tree is also written as ordinary files
 * under `tree/<branch>/` so a checkout can be inspected without the editor.
 * This is not GitHub.
 */
export class FsBackend implements StorageBackend {
  readonly id = "fs" as const;
  private inner: DemoBackend;

  private constructor(
    private readonly root: string,
    inner: DemoBackend,
  ) {
    this.inner = inner;
  }

  static open(root: string): FsBackend {
    const statePath = path.join(root, ".twilda", "state.json");
    let state = createEmptyDemoState();
    if (fs.existsSync(statePath)) {
      state = JSON.parse(fs.readFileSync(statePath, "utf8")) as DemoState;
    }
    const backend = new FsBackend(root, new DemoBackend(state));
    const persist = () => {
      backend.materialize();
    };
    backend.inner = new DemoBackend(state, state.baseBranch, persist);
    backend.materialize();
    return backend;
  }

  get ref(): string {
    return this.inner.ref;
  }

  private materialize(): void {
    const state = this.inner.snapshot();
    const metaDir = path.join(this.root, ".twilda");
    fs.mkdirSync(metaDir, { recursive: true });
    fs.writeFileSync(path.join(metaDir, "state.json"), `${JSON.stringify(state)}\n`);
    const treeRoot = path.join(this.root, "tree");
    fs.rmSync(treeRoot, { recursive: true, force: true });
    for (const branch of Object.values(state.branches)) {
      const dir = path.join(treeRoot, encodeURIComponent(branch.name));
      for (const [filePath, file] of Object.entries(branch.files)) {
        const absolute = path.join(dir, filePath);
        fs.mkdirSync(path.dirname(absolute), { recursive: true });
        fs.writeFileSync(absolute, file.text);
      }
    }
  }

  at(ref: string): FsBackend {
    const next = new FsBackend(this.root, this.inner.at(ref));
    return next;
  }

  list(prefix?: string): Promise<StorageListItem[]> {
    return this.inner.list(prefix);
  }
  read(filePath: string): Promise<StorageEntry> {
    return this.inner.read(filePath);
  }
  async write(filePath: string, text: string): Promise<StorageEntry> {
    return this.inner.write(filePath, text);
  }
  async delete(filePath: string): Promise<void> {
    await this.inner.delete(filePath);
  }
  createBranch(name: string, fromRef?: string): Promise<BranchRef> {
    return this.inner.createBranch(name, fromRef);
  }
  openPullRequest(input: OpenPullRequestInput): Promise<PullRequestRef> {
    return this.inner.openPullRequest(input);
  }
  mergePullRequest(number: number): Promise<PullRequestRef> {
    return this.inner.mergePullRequest(number);
  }
  revert(input: RevertInput): Promise<{ commitSha: string }> {
    return this.inner.revert(input);
  }
  listDrafts(): Promise<DraftRecord[]> {
    return this.inner.listDrafts();
  }
}
