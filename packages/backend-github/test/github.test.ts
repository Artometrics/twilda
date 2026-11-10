import assert from "node:assert/strict";
import test from "node:test";
import { TwildaError } from "../../core/src/errors";
import { serializeDocument } from "../../core/src/serialize";
import { sampleArticles } from "../../core/src/sample";
import { GitHubBackend, pollDeviceFlow, startDeviceFlow } from "../src/index";

interface FakeFile {
  text: string;
  sha: string;
}

function encode(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

function createFake() {
  const branches = new Map<string, Map<string, FakeFile>>([
    ["main", new Map([["content/articles/franchise.json", { text: serializeDocument(sampleArticles.franchise), sha: "sha-main" }]])],
  ]);
  const branchSha = new Map<string, string>([["main", "commit-main"]]);
  const pulls: Array<{ number: number; title: string; head: string; base: string; state: "open" | "closed"; merged: boolean }> = [];
  let prNumber = 1;
  let sawAuth = false;

  function tree(ref: string): Map<string, FakeFile> {
    const found = branches.get(ref);
    if (!found) throw new TwildaError(`missing ${ref}`, "not-found");
    return found;
  }

  function list(ref: string, prefix: string) {
    const files = tree(ref);
    if (files.has(prefix)) {
      const file = files.get(prefix);
      if (!file) return [];
      return [{ type: "file", path: prefix, sha: file.sha, encoding: "base64", content: encode(file.text) }];
    }
    const children = new Map<string, { type: string; path: string; sha: string }>();
    const dir = prefix.endsWith("/") ? prefix : `${prefix}/`;
    for (const filePath of files.keys()) {
      if (!filePath.startsWith(dir)) continue;
      const rest = filePath.slice(dir.length);
      const [name, ...more] = rest.split("/");
      if (!name) continue;
      if (more.length === 0) {
        const file = files.get(filePath);
        children.set(name, { type: "file", path: filePath, sha: file?.sha ?? "x" });
      } else {
        children.set(name, { type: "dir", path: `${dir}${name}`, sha: "dir" });
      }
    }
    return [...children.values()];
  }

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    if (headers.get("authorization")?.startsWith("Bearer ")) sawAuth = true;
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    const path = url.pathname;

    const json = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

    if (path === "/repos/acme/news/contents/content" || path.startsWith("/repos/acme/news/contents/")) {
      const ref = url.searchParams.get("ref") ?? String(body.branch ?? "main");
      const filePath = decodeURIComponent(path.replace("/repos/acme/news/contents/", ""));
      if (method === "GET") {
        if (!branches.has(ref)) return json({ message: "missing" }, 404);
        if (tree(ref).has(filePath)) {
          const file = tree(ref).get(filePath);
          return json({ type: "file", path: filePath, sha: file?.sha, encoding: "base64", content: encode(file?.text ?? "") });
        }
        const entries = list(ref, filePath);
        if (entries.length === 0) return json({ message: "missing" }, 404);
        return json(entries);
      }
      if (method === "PUT") {
        const text = Buffer.from(String(body.content), "base64").toString("utf8");
        const files = tree(ref);
        files.set(filePath, { text, sha: `sha-${filePath}-${files.size}` });
        branchSha.set(ref, `commit-${filePath}`);
        return json({ commit: { sha: branchSha.get(ref) }, content: { path: filePath } });
      }
      if (method === "DELETE") {
        tree(ref).delete(filePath);
        return json({ commit: { sha: "deleted" } });
      }
    }

    const refMatch = path.match(/^\/repos\/acme\/news\/git\/ref\/heads\/(.+)$/);
    if (method === "GET" && refMatch) {
      const name = decodeURIComponent(refMatch[1]);
      if (!branchSha.has(name)) return json({ message: "missing" }, 404);
      return json({ object: { sha: branchSha.get(name) } });
    }
    if (method === "POST" && path === "/repos/acme/news/git/refs") {
      const name = String(body.ref).replace("refs/heads/", "");
      const source = [...branchSha.keys()].find((branch) => branchSha.get(branch) === body.sha) ?? "main";
      branches.set(name, new Map(tree(source)));
      branchSha.set(name, `commit-${name}`);
      return json({ object: { sha: branchSha.get(name) } });
    }
    if (method === "GET" && path === "/repos/acme/news/git/matching-refs/heads/twilda/draft/") {
      return json(
        [...branchSha.keys()]
          .filter((name) => name.startsWith("twilda/draft/"))
          .map((name) => ({ ref: `refs/heads/${name}`, object: { sha: branchSha.get(name) } })),
      );
    }
    if (path === "/repos/acme/news/pulls" && method === "GET") {
      const head = decodeURIComponent(url.searchParams.get("head") ?? "").split(":")[1];
      return json(
        pulls
          .filter((pr) => pr.state === "open" && pr.head === head)
          .map((pr) => ({ number: pr.number, html_url: `https://github.com/acme/news/pull/${pr.number}`, title: pr.title, state: pr.state, merged: pr.merged, head: { ref: pr.head }, base: { ref: pr.base } })),
      );
    }
    if (path === "/repos/acme/news/pulls" && method === "POST") {
      const pr = { number: prNumber++, title: String(body.title), head: String(body.head), base: String(body.base), state: "open" as const, merged: false };
      pulls.push(pr);
      return json({ number: pr.number, html_url: `https://github.com/acme/news/pull/${pr.number}`, title: pr.title, state: pr.state, merged: false, head: { ref: pr.head }, base: { ref: pr.base } });
    }
    const merge = path.match(/^\/repos\/acme\/news\/pulls\/(\d+)\/merge$/);
    if (method === "PUT" && merge) {
      const pr = pulls.find((item) => item.number === Number(merge[1]));
      if (!pr) return json({ message: "missing" }, 404);
      const head = tree(pr.head);
      const base = tree(pr.base);
      for (const [file, value] of head) base.set(file, { ...value });
      pr.state = "closed";
      pr.merged = true;
      return json({ merged: true, sha: "merge" });
    }
    const pull = path.match(/^\/repos\/acme\/news\/pulls\/(\d+)$/);
    if (method === "GET" && pull) {
      const pr = pulls.find((item) => item.number === Number(pull[1]));
      if (!pr) return json({ message: "missing" }, 404);
      return json({ number: pr.number, html_url: `https://github.com/acme/news/pull/${pr.number}`, title: pr.title, state: pr.merged ? "closed" : pr.state, merged: pr.merged, head: { ref: pr.head }, base: { ref: pr.base } });
    }
    return json({ message: `unhandled ${method} ${path}` }, 500);
  };

  return { fetchImpl, branches, sawAuth: () => sawAuth };
}

test("GitHub client creates a branch, writes, and merges against a fake API", async () => {
  const fake = createFake();
  const github = new GitHubBackend({ owner: "acme", repo: "news", token: "test-token", fetch: fake.fetchImpl });
  assert.equal(fake.sawAuth(), false);
  await github.list("content");
  assert.equal(fake.sawAuth(), true);
  const branch = await github.createBranch("twilda/draft/franchise");
  assert.equal(branch.name, "twilda/draft/franchise");
  await github.at(branch.name).write(
    "content/articles/franchise.json",
    serializeDocument(sampleArticles.franchise).replace("Merchandise Owns the Ledger", "Merchandise Owns the Ledger draft"),
  );
  const pr = await github.openPullRequest({ title: "Publish franchise", head: branch.name, base: "main" });
  const merged = await github.mergePullRequest(pr.number);
  assert.equal(merged.state, "merged");
  assert.match((await github.read("content/articles/franchise.json")).text, /Ledger draft/);
  const drafts = await github.listDrafts();
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0]?.hasUnpublishedChanges, false);
});

test("device flow refuses a missing client id and parses a mocked pending poll", async () => {
  await assert.rejects(() => startDeviceFlow({ clientId: "  " }), (error: unknown) => error instanceof TwildaError && error.code === "github-config");
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/device/code")) {
      return new Response(JSON.stringify({ device_code: "device", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 600, interval: 5 }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: "authorization_pending" }), { status: 200 });
  };
  const started = await startDeviceFlow({ clientId: "client-from-kyle", fetchImpl });
  assert.equal(started.userCode, "ABCD-1234");
  const polled = await pollDeviceFlow({ clientId: "client-from-kyle", deviceCode: started.deviceCode, fetchImpl });
  assert.equal(polled.status, "pending");
  assert.equal(polled.accessToken, undefined);
});

test("empty token is rejected before any request", () => {
  assert.throws(() => new GitHubBackend({ owner: "acme", repo: "news", token: " " }), (error: unknown) => error instanceof TwildaError && error.code === "github-auth");
});
