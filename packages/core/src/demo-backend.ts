import { TwildaError } from "./errors";
import { BASE_BRANCH, DRAFT_BRANCH_PREFIX, assertSafePath, documentPath } from "./paths";
import { contentDigest, parseDocument } from "./serialize";
import type { TwildaDocument } from "./schema";
import type {
  BranchRef,
  DraftRecord,
  OpenPullRequestInput,
  PullRequestRef,
  RevertInput,
  StorageBackend,
  StorageEntry,
  StorageListItem,
} from "./storage";

/** Browser-local git stand-in. Real branch copies and pull-request merges. Not GitHub. */

export interface DemoFile {
  text: string;
  updatedAt: string;
}

export interface DemoBranch {
  name: string;
  headSha: string;
  /** Full tree at this branch. */
  files: Record<string, DemoFile>;
  /** Tree at branch creation. Merge applies only the diff against this. */
  baseFiles: Record<string, DemoFile>;
}

export interface DemoPullRequest {
  number: number;
  url: string;
  title: string;
  head: string;
  base: string;
  state: "open" | "merged" | "closed";
  body: string;
}

export interface DemoState {
  baseBranch: string;
  branches: Record<string, DemoBranch>;
  pullRequests: DemoPullRequest[];
  nextPr: number;
  sha: number;
}

export interface DemoSeedInput {
  published: TwildaDocument[];
  drafts: TwildaDocument[];
  files?: Record<string, string>;
  now?: string;
}

function cloneState(state: DemoState): DemoState {
  return structuredClone(state);
}

export function createEmptyDemoState(): DemoState {
  return {
    baseBranch: BASE_BRANCH,
    branches: {
      [BASE_BRANCH]: { name: BASE_BRANCH, headSha: "1", files: {}, baseFiles: {} },
    },
    pullRequests: [],
    nextPr: 1,
    sha: 1,
  };
}

export function seedDemoState(input: DemoSeedInput): DemoState {
  const now = input.now ?? "2026-04-08T00:00:00.000Z";
  const state = createEmptyDemoState();
  const main = state.branches[BASE_BRANCH];
  if (!main) throw new TwildaError("Demo seed is missing main.", "seed");
  for (const doc of input.published) {
    const text = `${JSON.stringify(doc, null, 2)}\n`;
    parseDocument(text);
    main.files[documentPath(doc.kind, doc.slug)] = { text, updatedAt: doc.updatedAt };
  }
  for (const [path, text] of Object.entries(input.files ?? {})) {
    assertSafePath(path);
    main.files[path] = { text, updatedAt: now };
  }
  for (const doc of input.drafts) {
    const name = `${DRAFT_BRANCH_PREFIX}${doc.id}`;
    state.sha += 1;
    const baseFiles = structuredClone(main.files);
    state.branches[name] = {
      name,
      headSha: String(state.sha),
      files: structuredClone(baseFiles),
      baseFiles,
    };
    const text = `${JSON.stringify(doc, null, 2)}\n`;
    parseDocument(text);
    state.branches[name].files[documentPath(doc.kind, doc.slug)] = { text, updatedAt: doc.updatedAt };
  }
  return state;
}

export class DemoBackend implements StorageBackend {
  readonly id = "demo" as const;
  readonly ref: string;

  constructor(
    private state: DemoState,
    ref = BASE_BRANCH,
    private persist?: (state: DemoState) => Promise<void> | void,
  ) {
    this.ref = ref;
  }

  snapshot(): DemoState {
    return cloneState(this.state);
  }

  replaceState(state: DemoState): void {
    this.state = state;
  }

  at(ref: string): DemoBackend {
    if (!this.state.branches[ref]) throw new TwildaError(`No branch "${ref}".`, "not-found");
    return new DemoBackend(this.state, ref, this.persist);
  }

  private branch(): DemoBranch {
    const branch = this.state.branches[this.ref];
    if (!branch) throw new TwildaError(`No branch "${this.ref}".`, "not-found");
    return branch;
  }

  private async touch(): Promise<void> {
    await this.persist?.(this.state);
  }

  private bump(branch: DemoBranch, when: string): void {
    this.state.sha += 1;
    branch.headSha = String(this.state.sha);
    void when;
  }

  async list(prefix?: string): Promise<StorageListItem[]> {
    const files = this.branch().files;
    return Object.entries(files)
      .filter(([path]) => (prefix ? path === prefix || path.startsWith(`${prefix}/`) : true))
      .map(([path, file]) => ({ path, updatedAt: file.updatedAt }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  async read(path: string): Promise<StorageEntry> {
    assertSafePath(path);
    const file = this.branch().files[path];
    if (!file) throw new TwildaError(`No file ${path} on ${this.ref}.`, "not-found");
    return { path, text: file.text, updatedAt: file.updatedAt, sha: this.branch().headSha };
  }

  async write(path: string, text: string): Promise<StorageEntry> {
    assertSafePath(path);
    const branch = this.branch();
    const updatedAt = new Date().toISOString();
    branch.files[path] = { text, updatedAt };
    this.bump(branch, updatedAt);
    await this.touch();
    return { path, text, updatedAt, sha: branch.headSha };
  }

  async delete(path: string): Promise<void> {
    assertSafePath(path);
    const branch = this.branch();
    if (!branch.files[path]) throw new TwildaError(`No file ${path} on ${this.ref}.`, "not-found");
    delete branch.files[path];
    this.bump(branch, new Date().toISOString());
    await this.touch();
  }

  async createBranch(name: string, fromRef = this.state.baseBranch): Promise<BranchRef> {
    if (!/^[a-zA-Z0-9._/-]+$/.test(name) || name.split("/").includes("..")) {
      throw new TwildaError("Branch name is not allowed.", "bad-branch");
    }
    const existing = this.state.branches[name];
    if (existing) return { name: existing.name, headSha: existing.headSha };
    const source = this.state.branches[fromRef];
    if (!source) throw new TwildaError(`No branch "${fromRef}".`, "not-found");
    this.state.sha += 1;
    const headSha = String(this.state.sha);
    const baseFiles = structuredClone(source.files);
    this.state.branches[name] = {
      name,
      headSha,
      files: structuredClone(baseFiles),
      baseFiles,
    };
    await this.touch();
    return { name, headSha };
  }

  async openPullRequest(input: OpenPullRequestInput): Promise<PullRequestRef> {
    if (!this.state.branches[input.head]) throw new TwildaError(`No branch "${input.head}".`, "not-found");
    if (!this.state.branches[input.base]) throw new TwildaError(`No branch "${input.base}".`, "not-found");
    const open = this.state.pullRequests.find(
      (pr) => pr.state === "open" && pr.head === input.head && pr.base === input.base,
    );
    if (open) return toRef(open);
    const pr: DemoPullRequest = {
      number: this.state.nextPr,
      url: `demo://pull/${this.state.nextPr}`,
      title: input.title,
      head: input.head,
      base: input.base,
      state: "open",
      body: input.body ?? "",
    };
    this.state.nextPr += 1;
    this.state.pullRequests.push(pr);
    await this.touch();
    return toRef(pr);
  }

  async mergePullRequest(number: number): Promise<PullRequestRef> {
    const pr = this.state.pullRequests.find((entry) => entry.number === number);
    if (!pr) throw new TwildaError(`No pull request ${number}.`, "not-found");
    if (pr.state !== "open") throw new TwildaError(`Pull request ${number} is ${pr.state}.`, "pr-closed");
    const head = this.state.branches[pr.head];
    const base = this.state.branches[pr.base];
    if (!head || !base) throw new TwildaError("Pull request branches are missing.", "not-found");
    applyDiff(base, head);
    head.baseFiles = structuredClone(head.files);
    this.state.sha += 1;
    base.headSha = String(this.state.sha);
    pr.state = "merged";
    await this.touch();
    return toRef(pr);
  }

  async revert(input: RevertInput): Promise<{ commitSha: string }> {
    const branch = this.state.branches[input.branch];
    if (!branch) throw new TwildaError(`No branch "${input.branch}".`, "not-found");
    assertSafePath(input.path);
    if (input.text === "") delete branch.files[input.path];
    else branch.files[input.path] = { text: input.text, updatedAt: new Date().toISOString() };
    this.state.sha += 1;
    branch.headSha = String(this.state.sha);
    await this.touch();
    return { commitSha: branch.headSha };
  }

  async listDrafts(): Promise<DraftRecord[]> {
    const main = this.state.branches[this.state.baseBranch];
    if (!main) return [];
    const records: DraftRecord[] = [];
    for (const branch of Object.values(this.state.branches)) {
      if (!branch.name.startsWith(DRAFT_BRANCH_PREFIX)) continue;
      const id = branch.name.slice(DRAFT_BRANCH_PREFIX.length);
      const match = Object.keys(branch.files).find(
        (path) => path === `content/articles/${id}.json` || path === `content/pages/${id}.json`,
      );
      if (!match) continue;
      const file = branch.files[match];
      if (!file) continue;
      let doc: TwildaDocument;
      try {
        doc = parseDocument(file.text);
      } catch {
        continue;
      }
      const published = main.files[match];
      let hasUnpublishedChanges = true;
      if (published) {
        try {
          hasUnpublishedChanges = contentDigest(parseDocument(published.text)) !== contentDigest(doc);
        } catch {
          hasUnpublishedChanges = true;
        }
      }
      records.push({
        id: doc.id,
        kind: doc.kind,
        title: doc.title,
        slug: doc.slug,
        branch: branch.name,
        updatedAt: file.updatedAt,
        hasUnpublishedChanges,
      });
    }
    return records.sort((a, b) => a.title.localeCompare(b.title));
  }
}

function applyDiff(base: DemoBranch, head: DemoBranch): void {
  const paths = new Set([...Object.keys(head.files), ...Object.keys(head.baseFiles)]);
  for (const path of paths) {
    const current = head.files[path];
    const original = head.baseFiles[path];
    if (JSON.stringify(current) === JSON.stringify(original)) continue;
    if (!current) delete base.files[path];
    else base.files[path] = structuredClone(current);
  }
}

function toRef(pr: DemoPullRequest): PullRequestRef {
  return {
    number: pr.number,
    url: pr.url,
    title: pr.title,
    head: pr.head,
    base: pr.base,
    state: pr.state,
  };
}
