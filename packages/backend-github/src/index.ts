import { TwildaError } from "../../core/src/errors";
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
import { contentDigest, parseDocument } from "../../core/src/serialize";
import { BASE_BRANCH, DRAFT_BRANCH_PREFIX } from "../../core/src/paths";

/**
 * GitHub REST backend. No server of ours.
 * Pass a user token at runtime (fine-grained PAT or a device-flow access token).
 * Nothing here reads a token from the repository.
 * `revert` writes the given text with the Contents API. It is not the GitHub UI revert button.
 */

export interface GitHubBackendOptions {
  owner: string;
  repo: string;
  token: string;
  baseBranch?: string;
  apiBase?: string;
  fetch?: typeof fetch;
  ref?: string;
}

interface ContentsEntry {
  type: "file" | "dir";
  path: string;
  sha: string;
  content?: string;
  encoding?: string;
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export class GitHubBackend implements StorageBackend {
  readonly id = "github" as const;
  readonly ref: string;
  private readonly owner: string;
  private readonly repo: string;
  private readonly token: string;
  private readonly baseBranch: string;
  private readonly apiBase: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GitHubBackendOptions) {
    if (!options.token.trim()) throw new TwildaError("GitHub token is missing.", "github-auth");
    if (!options.owner.trim() || !options.repo.trim()) {
      throw new TwildaError("GitHub owner and repo are required.", "github-config");
    }
    this.owner = options.owner;
    this.repo = options.repo;
    this.token = options.token;
    this.baseBranch = options.baseBranch ?? BASE_BRANCH;
    this.apiBase = options.apiBase ?? "https://api.github.com";
    this.fetchImpl = options.fetch ?? fetch;
    this.ref = options.ref ?? this.baseBranch;
  }

  at(ref: string): GitHubBackend {
    return new GitHubBackend({
      owner: this.owner,
      repo: this.repo,
      token: this.token,
      baseBranch: this.baseBranch,
      apiBase: this.apiBase,
      fetch: this.fetchImpl,
      ref,
    });
  }

  async list(prefix = "content"): Promise<StorageListItem[]> {
    const files = await this.listRecursive(prefix);
    return files.sort((a, b) => a.path.localeCompare(b.path));
  }

  private async listRecursive(prefix: string): Promise<StorageListItem[]> {
    let payload: ContentsEntry[] | ContentsEntry;
    try {
      payload = await this.request<ContentsEntry[] | ContentsEntry>(
        "GET",
        `/repos/${this.owner}/${this.repo}/contents/${prefix}?ref=${encodeURIComponent(this.ref)}`,
      );
    } catch (error) {
      if (error instanceof TwildaError && error.code === "not-found") return [];
      throw error;
    }
    const entries = Array.isArray(payload) ? payload : [payload];
    const files: StorageListItem[] = [];
    for (const entry of entries) {
      if (entry.type === "file") files.push({ path: entry.path, updatedAt: "" });
      if (entry.type === "dir") files.push(...(await this.listRecursive(entry.path)));
    }
    return files;
  }

  async read(path: string): Promise<StorageEntry> {
    const payload = await this.request<ContentsEntry>(
      "GET",
      `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${encodeURIComponent(this.ref)}`,
    );
    if (payload.type !== "file" || payload.encoding !== "base64" || !payload.content) {
      throw new TwildaError(`${path} is not a file.`, "github");
    }
    const text = decodeBase64(payload.content);
    return { path, text, updatedAt: "", sha: payload.sha };
  }

  async write(path: string, text: string): Promise<StorageEntry> {
    let sha: string | undefined;
    try {
      sha = (await this.read(path)).sha;
    } catch (error) {
      if (!(error instanceof TwildaError) || error.code !== "not-found") throw error;
    }
    const payload = await this.request<{ commit: { sha: string }; content: { path: string } }>(
      "PUT",
      `/repos/${this.owner}/${this.repo}/contents/${path}`,
      {
        message: `Update ${path}`,
        content: encodeBase64(text),
        branch: this.ref,
        sha,
      },
    );
    return { path, text, updatedAt: "", sha: payload.commit.sha };
  }

  async delete(path: string): Promise<void> {
    const current = await this.read(path);
    await this.request("DELETE", `/repos/${this.owner}/${this.repo}/contents/${path}`, {
      message: `Delete ${path}`,
      sha: current.sha,
      branch: this.ref,
    });
  }

  async createBranch(name: string, fromRef = this.baseBranch): Promise<BranchRef> {
    try {
      const existing = await this.request<{ object: { sha: string } }>(
        "GET",
        `/repos/${this.owner}/${this.repo}/git/ref/heads/${name}`,
      );
      return { name, headSha: existing.object.sha };
    } catch (error) {
      if (!(error instanceof TwildaError) || error.code !== "not-found") throw error;
    }
    const base = await this.request<{ object: { sha: string } }>(
      "GET",
      `/repos/${this.owner}/${this.repo}/git/ref/heads/${fromRef}`,
    );
    const created = await this.request<{ object: { sha: string } }>("POST", `/repos/${this.owner}/${this.repo}/git/refs`, {
      ref: `refs/heads/${name}`,
      sha: base.object.sha,
    });
    return { name, headSha: created.object.sha };
  }

  async openPullRequest(input: OpenPullRequestInput): Promise<PullRequestRef> {
    const headParam = `${this.owner}:${input.head}`;
    const existing = await this.request<Array<{ number: number; html_url: string; title: string; state: string; head: { ref: string }; base: { ref: string } }>>(
      "GET",
      `/repos/${this.owner}/${this.repo}/pulls?head=${encodeURIComponent(headParam)}&base=${encodeURIComponent(input.base)}&state=open`,
    );
    const found = existing[0];
    if (found) return toPr(found);
    const created = await this.request<{ number: number; html_url: string; title: string; state: string; head: { ref: string }; base: { ref: string } }>(
      "POST",
      `/repos/${this.owner}/${this.repo}/pulls`,
      { title: input.title, head: input.head, base: input.base, body: input.body ?? "" },
    );
    return toPr(created);
  }

  async mergePullRequest(number: number): Promise<PullRequestRef> {
    await this.request("PUT", `/repos/${this.owner}/${this.repo}/pulls/${number}/merge`, { merge_method: "merge" });
    const pr = await this.request<{ number: number; html_url: string; title: string; state: string; head: { ref: string }; base: { ref: string } }>(
      "GET",
      `/repos/${this.owner}/${this.repo}/pulls/${number}`,
    );
    return toPr(pr);
  }

  async revert(input: RevertInput): Promise<{ commitSha: string }> {
    const view = input.branch === this.ref ? this : this.at(input.branch);
    if (input.text === "") {
      await view.delete(input.path);
      const ref = await this.request<{ object: { sha: string } }>(
        "GET",
        `/repos/${this.owner}/${this.repo}/git/ref/heads/${input.branch}`,
      );
      return { commitSha: ref.object.sha };
    }
    const written = await view.write(input.path, input.text);
    return { commitSha: written.sha };
  }

  async listDrafts(): Promise<DraftRecord[]> {
    const refs = await this.request<Array<{ ref: string }>>(
      "GET",
      `/repos/${this.owner}/${this.repo}/git/matching-refs/heads/${DRAFT_BRANCH_PREFIX}`,
    );
    const records: DraftRecord[] = [];
    for (const entry of refs) {
      const name = entry.ref.replace("refs/heads/", "");
      if (!name.startsWith(DRAFT_BRANCH_PREFIX)) continue;
      const id = name.slice(DRAFT_BRANCH_PREFIX.length);
      const view = this.at(name);
      const main = this.at(this.baseBranch);
      for (const filePath of [`content/articles/${id}.json`, `content/pages/${id}.json`]) {
        try {
          const file = await view.read(filePath);
          const doc = parseDocument(file.text);
          let hasUnpublishedChanges = true;
          try {
            const published = parseDocument((await main.read(filePath)).text);
            hasUnpublishedChanges = contentDigest(published) !== contentDigest(doc);
          } catch (error) {
            if (!(error instanceof TwildaError) || error.code !== "not-found") throw error;
          }
          records.push({
            id: doc.id,
            kind: doc.kind,
            title: doc.title,
            slug: doc.slug,
            branch: name,
            updatedAt: doc.updatedAt,
            hasUnpublishedChanges,
          });
        } catch (error) {
          if (!(error instanceof TwildaError) || error.code !== "not-found") throw error;
        }
      }
    }
    return records.sort((a, b) => a.title.localeCompare(b.title));
  }

  private async request<T>(method: string, pathname: string, body?: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.apiBase}${pathname}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "twilda",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 404) throw new TwildaError(`GitHub could not find ${pathname}.`, "not-found");
    if (!response.ok) {
      let detail = "";
      try {
        const payload = (await response.json()) as { message?: string };
        detail = payload.message ?? "";
      } catch {
        detail = "";
      }
      throw new TwildaError(`GitHub ${method} failed (${response.status}). ${detail}`.trim(), "github");
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}

function toPr(pr: {
  number: number;
  html_url: string;
  title: string;
  state: string;
  merged?: boolean;
  head: { ref: string };
  base: { ref: string };
}): PullRequestRef {
  const state: PullRequestRef["state"] = pr.merged ? "merged" : pr.state === "open" ? "open" : "closed";
  return {
    number: pr.number,
    url: pr.html_url,
    title: pr.title,
    head: pr.head.ref,
    base: pr.base.ref,
    state,
  };
}

export interface DeviceFlowStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

/** Device flow needs a GitHub OAuth App client id that Kyle creates. This repo does not contain one. */
export async function startDeviceFlow(input: { clientId: string; fetchImpl?: typeof fetch; scope?: string }): Promise<DeviceFlowStart> {
  if (!input.clientId.trim()) {
    throw new TwildaError("Set a GitHub OAuth app client id before starting device sign-in. Do not commit it.", "github-config");
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl("https://github.com/login/device/code", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: input.clientId, scope: input.scope ?? "repo" }),
  });
  if (!response.ok) throw new TwildaError(`GitHub device flow failed (${response.status}).`, "github-auth");
  const payload = (await response.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  };
  return {
    deviceCode: payload.device_code,
    userCode: payload.user_code,
    verificationUri: payload.verification_uri,
    expiresIn: payload.expires_in,
    interval: payload.interval,
  };
}

export async function pollDeviceFlow(input: {
  clientId: string;
  deviceCode: string;
  fetchImpl?: typeof fetch;
}): Promise<{ status: "pending" | "ready"; accessToken?: string }> {
  if (!input.clientId.trim()) throw new TwildaError("GitHub client id is missing.", "github-config");
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: input.clientId,
      device_code: input.deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  if (!response.ok) throw new TwildaError(`GitHub token poll failed (${response.status}).`, "github-auth");
  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (payload.access_token) return { status: "ready", accessToken: payload.access_token };
  if (payload.error === "authorization_pending" || payload.error === "slow_down") return { status: "pending" };
  throw new TwildaError(payload.error ?? "GitHub device flow failed.", "github-auth");
}
