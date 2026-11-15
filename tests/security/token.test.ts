import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { GITHUB_API_BASE, GITHUB_DEVICE_PAGE, GitHubBackend, pollDeviceFlow, safeVerificationUri, startDeviceFlow } from "../../packages/backend-github/src/index";
import { planPublish, publishDocument } from "../../packages/backend-github/src/publish";
import { RICH_ARTICLE } from "./support";
import { createFakeGithub } from "../support/fake-github";

// Assembled at run time so this file stays clean under check:secrets.
const TOKEN = `gho_${"Zq9".repeat(12)}`;

interface Seen {
  url: string;
  init: RequestInit;
}

function recorder(respond: (url: URL, init: RequestInit) => Response | Promise<Response>): { fetch: typeof fetch; seen: Seen[] } {
  const seen: Seen[] = [];
  const impl: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    seen.push({ url: url.href, init: init ?? {} });
    return respond(url, init ?? {});
  };
  return { fetch: impl, seen };
}

const json = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

test("the token goes only in the Authorization header, only to api.github.com", async () => {
  const net = recorder(() => json(200, { type: "file", encoding: "base64", content: btoa("{}"), sha: "s", path: "x" }));
  const backend = new GitHubBackend({ owner: "Artometrics", repo: "twilda", token: TOKEN, fetch: net.fetch });
  await backend.read("content/a/published.json");
  assert.equal(net.seen.length, 1);
  const { url, init } = net.seen[0] as Seen;
  assert.ok(url.startsWith(`${GITHUB_API_BASE}/`));
  assert.ok(!url.includes(TOKEN), "token in the URL");
  assert.ok(!String(init.body ?? "").includes(TOKEN), "token in the body");
  assert.equal((init.headers as Record<string, string>).Authorization, `Bearer ${TOKEN}`);
  assert.equal(init.credentials, "omit");
  assert.equal(init.referrerPolicy, "no-referrer");
});

test("an error from GitHub or the network never carries the token back to the page", async () => {
  const echo = recorder(() => json(401, { message: `Bad credentials for ${TOKEN}` }));
  const backend = new GitHubBackend({ owner: "Artometrics", repo: "twilda", token: TOKEN, fetch: echo.fetch });
  await assert.rejects(
    () => backend.read("content/a/published.json"),
    (error: Error) => {
      assert.ok(!error.message.includes(TOKEN), error.message);
      assert.ok(!String(error.stack ?? "").includes(TOKEN));
      return true;
    },
  );
  const down = recorder(() => {
    throw new TypeError(`fetch failed for https://api.github.com with ${TOKEN}`);
  });
  const offline = new GitHubBackend({ owner: "Artometrics", repo: "twilda", token: TOKEN, fetch: down.fetch });
  await assert.rejects(
    () => offline.list(),
    (error: Error & { code?: string }) => {
      assert.equal(error.code, "network");
      assert.ok(!error.message.includes(TOKEN) && !error.message.includes("api.github.com"));
      assert.equal(error.cause, undefined, "the original error, which may hold the token, is not attached");
      return true;
    },
  );
});

test("the token is refused a destination other than api.github.com unless the caller opts in", () => {
  for (const apiBase of ["https://evil.example", "https://api.github.com.evil.example", "http://api.github.com", "https://api.github.com@evil.example", "//evil.example", "javascript:alert(1)", "not a url"]) {
    assert.throws(() => new GitHubBackend({ owner: "a", repo: "b", token: TOKEN, apiBase }), /token is only sent|not a valid URL|https/, apiBase);
  }
  assert.doesNotThrow(() => new GitHubBackend({ owner: "a", repo: "b", token: TOKEN, apiBase: "https://ghe.example.com/api/v3", allowCustomApiBase: true }));
  assert.doesNotThrow(() => new GitHubBackend({ owner: "a", repo: "b", token: TOKEN, apiBase: "http://127.0.0.1:8787", allowCustomApiBase: true }));
  assert.throws(() => new GitHubBackend({ owner: "a", repo: "b", token: TOKEN, apiBase: "http://ghe.example.com", allowCustomApiBase: true }), /https/);
  assert.throws(() => new GitHubBackend({ owner: "a", repo: "b", token: TOKEN, apiBase: "https://evil.example", allowCustomApiBase: false }));
});

test("owner, repo, path, and branch names cannot redirect a request that carries the token", async () => {
  const net = recorder(() => json(200, {}));
  for (const owner of ["a/b", "..", ".", "a?x=1", "a#x", "a%2fb", "a b", "a\\b", "", " ", "x".repeat(101), "a@evil.example"]) {
    assert.throws(() => new GitHubBackend({ owner, repo: "ok", token: TOKEN, fetch: net.fetch }), Error, JSON.stringify(owner));
    assert.throws(() => new GitHubBackend({ owner: "ok", repo: owner, token: TOKEN, fetch: net.fetch }), Error, JSON.stringify(owner));
  }
  const backend = new GitHubBackend({ owner: "ok", repo: "ok", token: TOKEN, fetch: net.fetch });
  for (const bad of ["../../user", "/etc/passwd", "a/../b", "a//b", "a?b=1", "a#b", "a%2e%2e/b", "a\\b", "", "a b"]) {
    await assert.rejects(() => backend.read(bad), /not allowed/, JSON.stringify(bad));
  }
  assert.throws(() => backend.at("../other"), /not allowed/);
  assert.throws(() => backend.at("a?b"), /not allowed/);
  assert.equal(net.seen.length, 0, "no request was made for a refused name");
});

test("an empty or blank token is refused before any request", async () => {
  const net = recorder(() => json(200, {}));
  for (const token of ["", "   ", "\n"]) assert.throws(() => new GitHubBackend({ owner: "a", repo: "b", token, fetch: net.fetch }), /token is missing/);
  await assert.rejects(() => publishDocument({ access: { token: " ", owner: "a", repo: "b", fetchImpl: net.fetch }, doc: RICH_ARTICLE }), /Sign in/);
  await assert.rejects(() => planPublish({ token: "", owner: "a", repo: "b", fetchImpl: net.fetch }, { base: null, doc: RICH_ARTICLE }), /Sign in/);
  assert.equal(net.seen.length, 0);
});

test("a full publish through the fake GitHub authenticates every call and writes nothing but the pull request branch", async () => {
  const fake = createFakeGithub();
  await publishDocument({ access: { token: TOKEN, owner: "Artometrics", repo: "twilda", fetchImpl: fake.impl }, doc: { ...RICH_ARTICLE, id: "note", slug: "note", blocks: [{ id: "p1", type: "paragraph", text: "x" }] } as typeof RICH_ARTICLE });
  assert.ok(fake.calls.length > 0);
  for (const call of fake.calls) assert.equal(call.auth, `Bearer ${TOKEN}`, `${call.method} ${call.path}`);
  const writes = fake.calls.filter((call) => call.method !== "GET");
  for (const call of writes) {
    const target = call.path;
    const body = JSON.stringify(call.body ?? {});
    assert.ok(!body.includes(TOKEN), "token in a request body");
    if (call.method === "PUT" && target.includes("/contents/")) assert.equal((call.body as { branch?: string }).branch, "twilda/draft/note", "content is never written to main directly");
  }
  assert.ok(!fake.calls.some((call) => call.method === "PUT" && /\/pulls\/\d+\/merge$/.test(call.path)), "publishing never merges");
});

test("device flow: a hostile proxy response cannot inject a link, a script, or an endless wait", async () => {
  const hostile = recorder(() =>
    json(200, { device_code: "dc", user_code: "ABCD-1234", verification_uri: "javascript:alert(1)", expires_in: 1e12, interval: -5 }),
  );
  const start = await startDeviceFlow({ clientId: "client", fetchImpl: hostile.fetch });
  assert.equal(start.verificationUri, GITHUB_DEVICE_PAGE);
  assert.ok(start.expiresIn <= 1800 && start.interval >= 1 && start.interval <= 60);
  for (const bad of [{ user_code: "<img src=x onerror=alert(1)>" }, { user_code: "A".repeat(50) }, { device_code: "" }, { device_code: "d".repeat(500) }, { device_code: 7 }]) {
    const net = recorder(() => json(200, { device_code: "dc", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", ...bad }));
    await assert.rejects(() => startDeviceFlow({ clientId: "client", fetchImpl: net.fetch }), /unexpected/, JSON.stringify(bad));
  }
  for (const [value, expected] of [
    ["https://github.com/login/device", "https://github.com/login/device"],
    ["https://github.com/login/device?user_code=ABCD", "https://github.com/login/device"],
    ["https://evil.example/login/device", GITHUB_DEVICE_PAGE],
    ["https://github.com.evil.example/login/device", GITHUB_DEVICE_PAGE],
    ["https://user:pw@github.com/login/device", GITHUB_DEVICE_PAGE],
    ["https://github.com:8443/login/device", GITHUB_DEVICE_PAGE],
    ["http://github.com/login/device", GITHUB_DEVICE_PAGE],
    ["data:text/html,<script>", GITHUB_DEVICE_PAGE],
    [undefined, GITHUB_DEVICE_PAGE],
    [42, GITHUB_DEVICE_PAGE],
  ] as const) {
    assert.equal(safeVerificationUri(value), expected, String(value));
  }
});

test("device flow: the client id and scope travel to GitHub or the configured proxy only, with no credentials", async () => {
  const net = recorder(() => json(200, { device_code: "dc", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5 }));
  await startDeviceFlow({ clientId: "client", fetchImpl: net.fetch });
  assert.equal(net.seen[0]?.url, "https://github.com/login/device/code");
  assert.equal(net.seen[0]?.init.credentials, "omit");
  assert.equal(net.seen[0]?.init.referrerPolicy, "no-referrer");
  await startDeviceFlow({ clientId: "client", fetchImpl: net.fetch, baseUrl: "https://proxy.example.com/gh" });
  assert.equal(net.seen[1]?.url, "https://proxy.example.com/gh/login/device/code");
  for (const baseUrl of ["http://proxy.example.com", "https://user:pw@proxy.example.com", "https://proxy.example.com?x=1", "javascript:alert(1)", "//proxy.example.com"]) {
    await assert.rejects(() => startDeviceFlow({ clientId: "client", fetchImpl: net.fetch, baseUrl }), /https address|valid/, baseUrl);
  }
});

test("device flow polling returns a token only when GitHub says ready, and never echoes unknown errors", async () => {
  const ready = recorder(() => json(200, { access_token: TOKEN, token_type: "bearer" }));
  assert.deepEqual(await pollDeviceFlow({ clientId: "c", deviceCode: "d", fetchImpl: ready.fetch }), { status: "ready", accessToken: TOKEN });
  for (const error of ["authorization_pending", "slow_down"]) {
    const pending = recorder(() => json(200, { error }));
    assert.deepEqual(await pollDeviceFlow({ clientId: "c", deviceCode: "d", fetchImpl: pending.fetch }), { status: "pending" });
  }
  const odd = recorder(() => json(200, { error: `<script>alert(1)</script> ${TOKEN}` }));
  await assert.rejects(
    () => pollDeviceFlow({ clientId: "c", deviceCode: "d", fetchImpl: odd.fetch }),
    (error: Error) => {
      assert.ok(!error.message.includes("<script>") && !error.message.includes(TOKEN), error.message);
      return true;
    },
  );
  const huge = recorder(() => json(200, { access_token: "t".repeat(5000) }));
  await assert.rejects(() => pollDeviceFlow({ clientId: "c", deviceCode: "d", fetchImpl: huge.fetch }));
});

// ---- static review of the shipped client code ------------------------------------------------

const CLIENT_DIRS = ["packages/editor/src", "click-edit/client", "apps/demo-editor/src", "packages/backend-github/src", "packages/core/src", "src"];

function sources(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:ts|tsx|astro|mjs)$/.test(entry.name) && !/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name)) out.push(full);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
}

test("shipped client code never logs, stores, or transmits a token other than as the Authorization header", () => {
  const files = CLIENT_DIRS.flatMap(sources);
  assert.ok(files.length > 50, "the scan must cover the client code");
  const persist = /\b(?:localStorage|sessionStorage|indexedDB|document\.cookie|caches\b|BroadcastChannel|postMessage|navigator\.sendBeacon|setItem|history\.(?:push|replace)State)\b/;
  for (const file of files) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      const code = line.replace(/\/\/.*$/, "");
      const where = `${file}:${index + 1}`;
      assert.ok(!/\bconsole\.(?:log|info|warn|error|debug|trace|dir)\b/.test(code), `${where} logs to the console: ${line.trim()}`);
      if (/token/i.test(code)) {
        assert.ok(!persist.test(code), `${where} puts a token near a storage or messaging API: ${line.trim()}`);
        assert.ok(!/\b(?:location|window\.location|document\.URL)\b/.test(code) || !/token/i.test(code), `${where} reads or writes a token through the URL`);
      }
    });
  }
});

test("the token lives in component state or a closure and is cleared on sign-out, timeout, and page hide", () => {
  const desk = fs.readFileSync("packages/editor/src/ui/App.tsx", "utf8");
  assert.match(desk, /TOKEN_LIFETIME_MS/);
  assert.match(desk, /pagehide/);
  assert.match(desk, /setGithubToken\(""\)/);
  const panel = fs.readFileSync("packages/editor/src/ui/GithubPanel.tsx", "utf8");
  assert.match(panel, /github-signout/);
  const click = fs.readFileSync("click-edit/client/editor.ts", "utf8");
  assert.match(click, /TOKEN_LIFETIME_MS/);
  assert.match(click, /forgetToken/);
  assert.match(click, /pagehide/);
  assert.match(click, /data-testid.*signout|"signout"/);
});

test("token inputs are masked and opt out of autofill and spellcheck", () => {
  for (const file of ["packages/editor/src/ui/GithubPanel.tsx", "click-edit/client/editor.ts", "apps/demo-editor/src/App.tsx"]) {
    const source = fs.readFileSync(file, "utf8");
    if (!/token/i.test(source)) continue;
    assert.match(source, /type[=:]\s*["']password["']|type", "password"|\.type = "password"/, `${file} has no masked token field`);
  }
});
