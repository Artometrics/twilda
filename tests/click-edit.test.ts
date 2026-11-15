import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { documentSchema, type TwildaDocument } from "@twilda/core";
import { GitHubBackend } from "../packages/backend-github/src/index";
import { applyEdit, changedRefs, fieldLabel, getAtPath, normalizeText } from "@twilda/core/edit";
import { clearLocalDraft, draftKey, loadLocalDraft, saveLocalDraft, type StorageLike } from "../click-edit/client/draft-store";
import { beginDeviceFlow, describeAuthError, fieldDeskFiles, publishToGithub } from "../click-edit/client/publish";
import { readConfig } from "../click-edit/client/config";
import { renderDocument } from "@twilda/core";

function load(id: string): TwildaDocument {
  return documentSchema.parse(JSON.parse(readFileSync(`content/${id}/draft.json`, "utf8")));
}

const home = load("home");

function memoryStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

function refsIn(html: string): { ref: string; type: string; alt?: string }[] {
  const out = [];
  for (const tag of html.matchAll(/<[a-z0-9]+\s[^>]*data-twilda-ref="([^"]+)"[^>]*>/g)) {
    const type = /data-twilda-type="([^"]+)"/.exec(tag[0])?.[1] ?? "";
    const alt = /data-twilda-alt-ref="([^"]+)"/.exec(tag[0])?.[1];
    out.push({ ref: tag[1]!, type, alt });
  }
  return out;
}

describe("data-twilda-ref annotation", () => {
  it("is off by default, so production HTML has no editing hooks", () => {
    for (const id of ["home", "lumen-rail"]) {
      const html = renderDocument(load(id));
      assert.equal(html.includes("data-twilda"), false, id);
    }
  });

  it("only adds attributes: stripping them gives the production HTML byte for byte", () => {
    const strip = (html: string) => html.replace(/ data-twilda-(?:ref|type|alt-ref)="[^"]*"/g, "");
    for (const id of ["home", "lumen-rail"]) {
      const doc = load(id);
      assert.equal(strip(renderDocument(doc, { annotate: true })), renderDocument(doc), id);
    }
  });

  it("points every ref at a real string in the document", () => {
    const refs = refsIn(renderDocument(home, { annotate: true }));
    assert.ok(refs.length > 40);
    for (const { ref, type, alt } of refs) {
      assert.equal(typeof getAtPath(home, ref), "string", ref);
      if (type === "image") assert.equal(typeof getAtPath(home, alt ?? ""), "string", `${ref} alt`);
    }
    assert.equal(new Set(refs.map((entry) => entry.ref)).size, refs.length, "refs are unique");
  });

  it("covers every visible text field of the home page", () => {
    const refs = new Set(refsIn(renderDocument(home, { annotate: true })).map((entry) => entry.ref));
    const hidden = new Set(["id", "type", "kind", "slug", "status", "updatedAt", "href"]);
    const missing: string[] = [];
    const walk = (node: unknown, prefix: string) => {
      if (typeof node === "string") {
        const last = prefix.split(".").at(-1) ?? "";
        if (!hidden.has(last) && last !== "imageAlt" && !refs.has(prefix)) missing.push(prefix);
        return;
      }
      if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node)) walk(value, prefix ? `${prefix}.${key}` : key);
      }
    };
    walk(home, "");
    assert.deepEqual(missing, []);
  });

  it("never puts author text into attribute names or values it adds", () => {
    const doc = documentSchema.parse({
      ...home,
      title: `"><img src=x onerror=alert(1)>`,
      sections: home.kind === "page" ? home.sections : [],
    });
    const html = renderDocument(doc, { annotate: true });
    assert.equal(html.includes("<img src=x"), false);
    assert.ok(html.includes("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"));
  });
});

describe("applyEdit", () => {
  it("replaces one string and leaves the original document untouched", () => {
    const result = applyEdit(home, "sections.0.slides.1.title", "A new title");
    assert.equal(result.ok, true);
    if (!result.ok || result.doc.kind !== "page" || home.kind !== "page") throw new Error("expected a page");
    const before = home.sections[0];
    const after = result.doc.sections[0];
    if (before?.type !== "carousel" || after?.type !== "carousel") throw new Error("expected a carousel");
    assert.equal(after.slides[1]?.title, "A new title");
    assert.notEqual(before.slides[1]?.title, "A new title");
    assert.deepEqual(after.slides[0], before.slides[0]);
  });

  it("refuses values the schema refuses", () => {
    const empty = applyEdit(home, "title", "   ");
    assert.equal(empty.ok, false);
    const long = applyEdit(home, "kicker", "x".repeat(81));
    assert.equal(long.ok, false);
    const badImage = applyEdit(home, "sections.0.slides.0.image", "javascript:alert(1)");
    assert.equal(badImage.ok, false);
  });

  it("refuses paths that are not existing string fields", () => {
    for (const ref of ["sections", "sections.0", "nope", "sections.99.title", "__proto__.polluted", "a..b", "constructor.name"]) {
      assert.equal(applyEdit(home, ref, "x").ok, false, ref);
    }
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
  });

  it("does not let an edit change structure: id, kind and slug are only editable as strings that must stay valid", () => {
    assert.equal(applyEdit(home, "slug", "other").ok, false, "slug must match id");
    assert.equal(applyEdit(home, "kind", "article").ok, false);
  });

  it("normalises whitespace and labels fields", () => {
    assert.equal(normalizeText("  a\u00a0 b\n c  "), "a b c");
    assert.equal(fieldLabel("sections.0.slides.0.imageAlt"), "image alt");
    assert.equal(fieldLabel("dek"), "summary");
  });

  it("lists changed refs and ignores the publish stamp", () => {
    const edited = applyEdit(home, "title", "Other");
    if (!edited.ok) throw new Error("edit failed");
    assert.deepEqual(changedRefs(home, edited.doc), ["title"]);
    assert.deepEqual(changedRefs(home, { ...home, status: "published", updatedAt: "2030-01-01T00:00:00.000Z" }), []);
  });
});

describe("local draft state", () => {
  it("round-trips a validated draft", () => {
    const storage = memoryStorage();
    const edited = applyEdit(home, "title", "Local only");
    if (!edited.ok) throw new Error("edit failed");
    assert.deepEqual(saveLocalDraft(storage, edited.doc), { ok: true });
    assert.equal(loadLocalDraft(storage, "home")?.title, "Local only");
    clearLocalDraft(storage, "home");
    assert.equal(loadLocalDraft(storage, "home"), null);
  });

  it("ignores corrupt, invalid, or mismatched drafts", () => {
    const storage = memoryStorage();
    storage.setItem(draftKey("home"), "{not json");
    assert.equal(loadLocalDraft(storage, "home"), null);
    storage.setItem(draftKey("home"), JSON.stringify({ ...home, title: "" }));
    assert.equal(loadLocalDraft(storage, "home"), null);
    storage.setItem(draftKey("home"), JSON.stringify(load("lumen-rail")));
    assert.equal(loadLocalDraft(storage, "home"), null);
  });

  it("reports a full or blocked store instead of throwing", () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    assert.deepEqual(saveLocalDraft(storage, home), { ok: false, error: "QuotaExceededError" });
  });
});

interface Call {
  method: string;
  path: string;
  body?: Record<string, string>;
  auth: string | null;
}

function fakeGithub() {
  const calls: Call[] = [];
  const impl: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, string>) : undefined;
    calls.push({ method, path: url.pathname, body, auth: headers.get("authorization") });
    const json = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
    const repo = "/repos/Artometrics/twilda";
    if (url.pathname === `${repo}/git/ref/heads/twilda/draft/home`) return json(404, {});
    if (url.pathname === `${repo}/git/ref/heads/main`) return json(200, { object: { sha: "base" } });
    if (url.pathname === `${repo}/git/refs`) return json(201, { object: { sha: "base" } });
    if (url.pathname.startsWith(`${repo}/contents/`) && method === "GET") return json(404, {});
    if (url.pathname.startsWith(`${repo}/contents/`) && method === "PUT") return json(201, { commit: { sha: "c1" }, content: { path: "x" } });
    if (url.pathname === `${repo}/pulls` && method === "GET") return json(200, []);
    if (url.pathname === `${repo}/pulls` && method === "POST") {
      return json(201, { number: 9, html_url: "https://github.com/Artometrics/twilda/pull/9", title: body?.title, state: "open", head: { ref: body?.head }, base: { ref: "main" } });
    }
    return json(500, { message: `unmocked ${method} ${url.pathname}` });
  };
  return { calls, impl };
}

describe("publish through the existing GitHub backend", () => {
  const stamp = () => new Date("2026-11-15T07:00:00.000Z");

  it("commits draft and published separately on twilda/draft/<id> and opens a PR into main", async () => {
    const edited = applyEdit(home, "title", "Field Desk, edited");
    if (!edited.ok) throw new Error("edit failed");
    const fake = fakeGithub();
    const result = await publishToGithub({
      token: "gho_runtime",
      owner: "Artometrics",
      repo: "twilda",
      base: home,
      doc: edited.doc,
      fetchImpl: fake.impl,
      now: stamp,
    });
    assert.equal(result.number, 9);
    assert.equal(result.branch, "twilda/draft/home");
    assert.deepEqual(result.files, [fieldDeskFiles("home").draft, fieldDeskFiles("home").published]);

    const puts = fake.calls.filter((call) => call.method === "PUT");
    assert.deepEqual(puts.map((call) => call.path.split("/contents/")[1]), ["content/home/draft.json", "content/home/published.json"]);
    assert.ok(puts.every((call) => call.body?.branch === "twilda/draft/home"));
    assert.ok(fake.calls.every((call) => call.auth === "Bearer gho_runtime"));
    const [draft, published] = puts.map((call) => JSON.parse(Buffer.from(call.body?.content ?? "", "base64").toString("utf8")));
    assert.equal(draft.status, "draft");
    assert.equal(published.status, "published");
    assert.equal(published.title, "Field Desk, edited");
    assert.equal(published.updatedAt, "2026-11-15T07:00:00.000Z");
    assert.doesNotThrow(() => documentSchema.parse(published));
    const pr = fake.calls.find((call) => call.method === "POST" && call.path.endsWith("/pulls"));
    assert.equal(pr?.body?.base, "main");
    assert.match(pr?.body?.body ?? "", /`title`/);
  });

  it("refuses without a token or without edits, and never calls GitHub", async () => {
    const edited = applyEdit(home, "title", "Changed");
    if (!edited.ok) throw new Error("edit failed");
    const fake = fakeGithub();
    await assert.rejects(publishToGithub({ token: " ", owner: "a", repo: "b", base: home, doc: edited.doc, fetchImpl: fake.impl }), /Sign in/);
    await assert.rejects(publishToGithub({ token: "t", owner: "a", repo: "b", base: home, doc: home, fetchImpl: fake.impl }), /No edits/);
    assert.equal(fake.calls.length, 0);
  });

  it("does not throw Illegal invocation when it falls back to the global fetch", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = function (this: unknown, ..._args: Parameters<typeof fetch>) {
      if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(new Response(JSON.stringify({ object: { sha: "s" } }), { status: 200 }));
    } as typeof fetch;
    try {
      const backend = new GitHubBackend({ owner: "a", repo: "b", token: "t" });
      const branch = await backend.createBranch("twilda/draft/home");
      assert.equal(branch.headSha, "s");
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("device flow in the browser", () => {
  it("goes through the proxy base when one is configured", async () => {
    const seen: string[] = [];
    const impl: typeof fetch = async (input) => {
      seen.push(String(input));
      return new Response(JSON.stringify({ device_code: "d", user_code: "U", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5 }), { status: 200 });
    };
    await beginDeviceFlow({ clientId: "cid", proxy: "https://proxy.example/", fetchImpl: impl });
    await beginDeviceFlow({ clientId: "cid", proxy: "", fetchImpl: impl });
    assert.deepEqual(seen, ["https://proxy.example/login/device/code", "https://github.com/login/device/code"]);
  });

  it("turns a blocked cross-origin call into advice instead of a raw TypeError", () => {
    assert.match(describeAuthError(new TypeError("Failed to fetch"), ""), /CORS/);
    assert.match(describeAuthError(new TypeError("Failed to fetch"), "https://p.example"), /proxy/);
    assert.equal(describeAuthError(new Error("expired_token"), ""), "expired_token");
  });

  it("reads the public client id and falls back to the Artometrics repo", () => {
    assert.deepEqual(readConfig({}), { clientId: "", owner: "Artometrics", repo: "twilda", deviceFlowProxy: "" });
    assert.equal(readConfig({ PUBLIC_TWILDA_GITHUB_CLIENT_ID: " Iv1.abc " }).clientId, "Iv1.abc");
  });
});
