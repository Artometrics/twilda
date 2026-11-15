import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KvStore, MemoryStore, FirestoreStore, createInbox, csvCell, escapeHtml, parseStored, signRecord, type KvLike, type StoredLead } from "../src/index";
import { readInbox, receiveLead } from "../src/firebase";
import cloudflare, { type Env } from "../src/cloudflare";
import { GOOD, ORIGIN, SECRET, post, setup } from "./support";

const PASSWORD = "correct horse battery staple";
const auth = (user = "owner", pass = PASSWORD) => `Basic ${btoa(`${user}:${pass}`)}`;
const get = (path: string, headers: Record<string, string> = {}) => new Request(`https://leads.example.workers.dev${path}`, { headers });

async function row(fields: Record<string, string>, at = 1): Promise<StoredLead> {
  const record = { id: `id${at}`, receivedAt: at, form: "enquiry", page: null, fields };
  return { ...record, sig: await signRecord(SECRET, record) };
}

describe("inbox", () => {
  it("needs Basic credentials, and says nothing about which part was wrong", async () => {
    const inbox = createInbox({ store: new MemoryStore(), signingSecret: SECRET, user: "owner", password: PASSWORD });
    for (const header of [undefined, "Basic !!!", auth("owner", "wrong"), auth("wrong"), "Bearer x", `Basic ${btoa("nocolon")}`]) {
      const res = await inbox(get("/inbox", header ? { authorization: header } : {}));
      assert.equal(res.status, 401, String(header));
      assert.match(res.headers.get("www-authenticate") ?? "", /^Basic/);
      assert.equal(await res.text(), "Sign in required");
    }
    assert.equal((await inbox(get("/inbox", { authorization: auth() }))).status, 200);
  });

  it("escapes every stored value, carries a no-script policy, and flags a record whose signature fails", async () => {
    const store = new MemoryStore();
    await store.append(await row({ name: "<script>alert(1)</script>", message: '"><img src=x onerror=alert(1)>' }));
    const forged = await row({ name: "Mallory" }, 2);
    await store.append({ ...forged, fields: { name: "Changed after signing" } });
    const inbox = createInbox({ store, signingSecret: SECRET, user: "owner", password: PASSWORD });
    const res = await inbox(get("/inbox", { authorization: auth() }));
    const html = await res.text();
    assert.doesNotMatch(html, /<script|<img|onerror=alert\(1\)>/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /SIGNATURE DOES NOT MATCH/);
    assert.match(html, /signature ok/);
    const csp = res.headers.get("content-security-policy") ?? "";
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /script-src 'none'/);
    assert.match(csp, /form-action 'none'/);
    assert.doesNotMatch(html, /<(?:form|script|img)\b|<[^>]*\s(?:style|on\w+)=/i);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.match(res.headers.get("x-robots-tag") ?? "", /noindex/);
  });

  it("serves the style sheet without credentials, never writes, and refuses other methods and paths", async () => {
    const store = new MemoryStore();
    const inbox = createInbox({ store, signingSecret: SECRET, user: "owner", password: PASSWORD });
    assert.equal((await inbox(get("/inbox.css"))).status, 200);
    assert.equal((await inbox(new Request("https://x.test/inbox", { method: "POST", headers: { authorization: auth() } }))).status, 405);
    assert.equal((await inbox(get("/elsewhere", { authorization: auth() }))).status, 404);
    assert.equal(store.records.length, 0);
  });

  it("exports CSV that a spreadsheet will not run as a formula", async () => {
    const store = new MemoryStore();
    await store.append(await row({ name: "=HYPERLINK(\"http://evil.example\",\"x\")", email: "+cmd@example.org", message: "@SUM(A1)\n-2+3", company: "\tTAB" }));
    const inbox = createInbox({ store, signingSecret: SECRET, user: "owner", password: PASSWORD });
    const res = await inbox(get("/inbox.csv", { authorization: auth() }));
    assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
    const csv = await res.text();
    for (const cell of csv.split(/\r\n/).slice(1).join("\n").match(/"(?:[^"]|"")*"/g) ?? []) {
      assert.doesNotMatch(cell, /^"[=+\-@\t\r]/, cell);
    }
    assert.equal(csvCell("=1+1"), `"'=1+1"`);
    assert.equal(csvCell('say "hi"'), `"say ""hi"""`);
    assert.equal(csvCell("plain"), `"plain"`);
  });

  it("escapes html", () => {
    assert.equal(escapeHtml(`<a href="x" b='y'>&`), "&lt;a href=&quot;x&quot; b=&#39;y&#39;&gt;&amp;");
  });

  it("refuses a weak password or secret", () => {
    const base = { store: new MemoryStore(), signingSecret: SECRET, user: "owner", password: PASSWORD };
    assert.throws(() => createInbox({ ...base, password: "short" }), /password/);
    assert.throws(() => createInbox({ ...base, signingSecret: "short" }), /signingSecret/);
  });
});

describe("stores", () => {
  const memoryKv = () => {
    const data = new Map<string, { value: string; ttl?: number }>();
    const kv: KvLike = {
      put: async (key, value, options) => void data.set(key, { value, ttl: options?.expirationTtl }),
      get: async (key) => data.get(key)?.value ?? null,
      list: async ({ prefix, limit }) => ({ keys: [...data.keys()].filter((key) => key.startsWith(prefix)).sort().slice(0, limit).map((name) => ({ name })) }),
    };
    return { kv, data };
  };

  it("KV: newest first, expires, never overwrites, and skips a damaged row", async () => {
    const { kv, data } = memoryKv();
    const store = new KvStore(kv, 30);
    await store.append(await row({ email: "a@example.org" }, 1000));
    await store.append(await row({ email: "b@example.org" }, 2000));
    data.set("lead:0000000000000:bad", { value: "{not json" });
    data.set("lead:0000000000001:shape", { value: JSON.stringify({ id: 1 }) });
    const listed = await store.list(10);
    assert.deepEqual(listed.map((r) => r.fields.email), ["b@example.org", "a@example.org"]);
    assert.ok([...data.values()].filter((entry) => entry.ttl).every((entry) => entry.ttl === 30 * 86_400));
  });

  it("parseStored refuses wrong shapes and non-string fields", () => {
    for (const bad of [null, 1, "x", {}, { id: "a", receivedAt: 1, form: "f", page: 3, fields: {}, sig: "s" }, { id: "a", receivedAt: 1, form: "f", page: null, fields: { a: 1 }, sig: "s" }, { id: "a", receivedAt: 1, form: "f", page: null, fields: [], sig: "s" }]) {
      assert.equal(parseStored(bad), null);
    }
  });

  it("Firestore adapter: creates (never sets) and reads newest first", async () => {
    const created: unknown[] = [];
    const db = {
      collection: () => ({
        doc: () => ({ create: async (data: unknown) => void created.push(data) }),
        orderBy: () => ({ limit: () => ({ get: async () => ({ docs: created.map((data) => ({ data: () => data })) }) }) }),
      }),
    };
    const store = new FirestoreStore(db);
    await store.append(await row({ email: "a@example.org" }));
    assert.equal((await store.list(5)).length, 1);
  });
});

describe("adapters", () => {
  const env = (): Env & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return {
      data,
      LEADS: {
        put: async (key, value) => void data.set(key, value),
        get: async (key) => data.get(key) ?? null,
        list: async ({ prefix, limit }) => ({ keys: [...data.keys()].filter((key) => key.startsWith(prefix)).sort().slice(0, limit).map((name) => ({ name })) }),
      },
      ALLOWED_ORIGINS: ORIGIN,
      SIGNING_SECRET: SECRET,
      INBOX_USER: "owner",
      INBOX_PASSWORD: PASSWORD,
    };
  };

  it("Cloudflare Worker: POST /lead stores, GET /inbox reads, anything else needs the password", async () => {
    const e = env();
    const body = post(GOOD, {});
    const res = await cloudflare.fetch(new Request("https://w.test/lead", { method: "POST", headers: body.headers, body: await body.text() }), e);
    assert.equal(res.status, 200);
    assert.equal(e.data.size, 1);
    assert.equal((await cloudflare.fetch(get("/inbox"), e)).status, 401);
    const page = await cloudflare.fetch(get("/inbox", { authorization: auth() }), e);
    assert.match(await page.text(), /Ada Lovelace/);
    assert.equal((await cloudflare.fetch(get("/"), e)).status, 404);
  });

  it("Firebase wrapper: runs the same receiver over an Express-style request", async () => {
    const { store } = setup();
    const handler = receiveLead({ allowedOrigins: [ORIGIN], signingSecret: SECRET, store });
    const sent: { status?: number; headers: Record<string, string>; body?: string } = { headers: {} };
    const res = {
      status(code: number) { sent.status = code; return res; },
      set(name: string, value: string) { sent.headers[name] = value; },
      send(body: string) { sent.body = body; },
      end() { sent.body = ""; },
    };
    await handler(
      { method: "POST", url: "/lead", headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, rawBody: new TextEncoder().encode(new URLSearchParams(GOOD).toString()) },
      res,
    );
    assert.equal(sent.status, 200);
    assert.equal(store.records.length, 1);
    const read = readInbox({ store, signingSecret: SECRET, user: "owner", password: PASSWORD });
    await read({ method: "GET", url: "/inbox", headers: { authorization: auth() } }, res);
    assert.equal(sent.status, 200);
    assert.match(sent.body ?? "", /Ada Lovelace/);
  });
});
