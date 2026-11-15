import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createReceiver, MemoryStore, verifyRecord, hmacHex } from "../src/index";
import { GOOD, ORIGIN, SECRET, post, setup } from "./support";

describe("receiver: a good submission", () => {
  it("stores one signed record with only the validated fields", async () => {
    const { store, handle } = setup();
    const res = await handle(post(GOOD));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(res.headers.get("access-control-allow-origin"), ORIGIN);
    assert.equal(store.records.length, 1);
    const [row] = store.records;
    assert.equal(row?.form, "enquiry");
    assert.equal(row?.page, "https://example.com/contact");
    assert.deepEqual(row?.fields, { name: "Ada Lovelace", email: "ada@example.org", message: "Hello\nthere" });
    assert.equal(await verifyRecord(SECRET, row as never, row?.sig as string), true);
    assert.match(row?.id ?? "", /^[0-9a-f]{32}$/);
    assert.equal(Object.keys(row ?? {}).sort().join(), "fields,form,id,page,receivedAt,sig");
  });

  it("accepts JSON", async () => {
    const { store, handle } = setup();
    assert.equal((await handle(post(GOOD, { type: "application/json" }))).status, 200);
    assert.equal(store.records.length, 1);
  });

  it("answers a plain form post with a thank-you page, or a redirect to an allowed https page", async () => {
    const page = await setup().handle(post(GOOD, { accept: "text/html" }));
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Thank you/);
    assert.match(page.headers.get("content-security-policy") ?? "", /default-src 'none'/);
    const redirect = await setup({ redirectTo: "https://example.com/thanks" }).handle(post(GOOD, { accept: "text/html" }));
    assert.equal(redirect.status, 303);
    assert.equal(redirect.headers.get("location"), "https://example.com/thanks");
  });

  it("answers a preflight only for an allowed origin", async () => {
    const { handle } = setup();
    const ok = await handle(new Request("https://x.test/lead", { method: "OPTIONS", headers: { origin: ORIGIN } }));
    assert.equal(ok.status, 204);
    assert.equal(ok.headers.get("access-control-allow-origin"), ORIGIN);
    assert.equal(ok.headers.get("access-control-allow-methods"), "POST");
    const bad = await handle(new Request("https://x.test/lead", { method: "OPTIONS", headers: { origin: "https://evil.example" } }));
    assert.equal(bad.status, 403);
    assert.equal(bad.headers.get("access-control-allow-origin"), null);
  });
});

describe("receiver: abuse", () => {
  it("refuses an origin that is not listed, a missing origin, and near-miss origins, and never echoes them", async () => {
    const { store, handle } = setup();
    for (const origin of ["https://evil.example", "http://example.com", "https://example.com.evil.example", "https://EXAMPLE.com", "null", "*"]) {
      const res = await handle(post(GOOD, { origin }));
      assert.equal(res.status, 403, origin);
      assert.equal(res.headers.get("access-control-allow-origin"), null, origin);
    }
    assert.equal((await handle(post(GOOD, { origin: null }))).status, 403);
    assert.equal(store.records.length, 0);
    const lax = setup({ allowMissingOrigin: true });
    assert.equal((await lax.handle(post(GOOD, { origin: null }))).status, 200);
  });

  it("refuses other methods and content types", async () => {
    const { handle } = setup();
    assert.equal((await handle(new Request("https://x.test/lead", { method: "GET", headers: { origin: ORIGIN } }))).status, 405);
    assert.equal((await handle(post("a=b", { type: "text/plain" }))).status, 415);
    assert.equal((await handle(post("--x", { type: "multipart/form-data; boundary=x" }))).status, 415);
  });

  it("refuses an oversized body by header and by stream, without storing", async () => {
    const { store, handle } = setup();
    const big = { ...GOOD, message: "x".repeat(40_000) };
    assert.equal((await handle(post(big))).status, 413);
    const sneaky = post(big, { headers: { "content-length": "10" } });
    assert.equal((await handle(sneaky)).status, 413);
    assert.equal(store.records.length, 0);
  });

  it("refuses a message over its field limit and a payload over the total", async () => {
    const { handle } = setup();
    assert.equal((await handle(post({ ...GOOD, message: "y".repeat(2001) }))).status, 400);
    const many = { ...GOOD, name: "n".repeat(100), company: "c".repeat(100), text: "t".repeat(200), text_2: "t".repeat(200), text_3: "t".repeat(200), message: "m".repeat(2000), message_2: "m".repeat(2000), message_3: "m".repeat(2000), phone: "123456789" };
    const res = await handle(post(many));
    assert.equal(res.status, 400);
    assert.match(JSON.stringify(await res.json()), /too much text/);
  });

  it("refuses header injection in email and one-line fields, raw and percent-encoded", async () => {
    const { store, handle } = setup();
    for (const email of ["a@example.org\r\nBcc: x@evil.example", "a@example.org\nBcc:x@evil.example", "a@example.org%0d%0aBcc:x@evil.example", "a@example.org,b@evil.example", "a@example.org;b@evil.example", "<a@example.org>", "a@example.org\u2028x"]) {
      assert.equal((await handle(post({ ...GOOD, email }))).status, 400, JSON.stringify(email));
    }
    for (const name of ["Ada\r\nSubject: spam", "Ada\nBcc: x@evil.example", "Ada%0aBcc: x@evil.example", "Ada\u0000"]) {
      assert.equal((await handle(post({ ...GOOD, name }))).status, 400, JSON.stringify(name));
    }
    assert.equal(store.records.length, 0);
  });

  it("refuses unknown, prototype, duplicate and non-string fields", async () => {
    const { store, handle } = setup();
    assert.equal((await handle(post({ ...GOOD, admin: "yes" }))).status, 400);
    assert.equal((await handle(post("__proto__=x&_form=enquiry&email=a%40example.org"))).status, 400);
    assert.equal((await handle(post("constructor=x&_form=enquiry&email=a%40example.org"))).status, 400);
    assert.equal((await handle(post("email=a%40example.org&email=b%40example.org&_form=enquiry"))).status, 400);
    const json = { type: "application/json" };
    for (const body of ['{"_form":"enquiry","email":["a@example.org"]}', '{"_form":"enquiry","email":{"x":1}}', '{"__proto__":{"polluted":"1"},"_form":"enquiry","email":"a@example.org"}', "[]", "null", "not json"]) {
      assert.equal((await handle(post(body, json))).status, 400, body);
    }
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.equal(store.records.length, 0);
  });

  it("requires a form id and an email or phone", async () => {
    const { handle } = setup();
    assert.equal((await handle(post({ ...GOOD, _form: "" }))).status, 400);
    assert.equal((await handle(post({ ...GOOD, _form: "Bad Id<script>" }))).status, 400);
    assert.equal((await handle(post({ _form: "enquiry", name: "Ada" }))).status, 400);
  });

  it("stores markup as inert text and refuses an invalid page address", async () => {
    const { store, handle } = setup();
    const payload = "<img src=x onerror=alert(1)>";
    assert.equal((await handle(post({ ...GOOD, name: payload, _page: "javascript:alert(1)" }))).status, 200);
    assert.equal(store.records[0]?.fields.name, payload);
    assert.equal(store.records[0]?.page, null);
    for (const page of ["http://example.com/", "https://user:pw@example.com/", "https://example.com/a b", "data:text/html,x"]) {
      await handle(post({ ...GOOD, _page: page }));
    }
    assert.ok(store.records.every((row) => row.page === null));
  });

  it("drops a honeypot hit silently and refuses a too-fast one", async () => {
    const { store, handle } = setup();
    const spam = await handle(post({ ...GOOD, _hp: "http://spam.example" }));
    assert.equal(spam.status, 200);
    assert.deepEqual(await spam.json(), { ok: true });
    assert.equal(store.records.length, 0);
    assert.equal((await handle(post({ ...GOOD, _elapsed_ms: "200" }))).status, 400);
    assert.equal(store.records.length, 0);
    assert.equal((await handle(post({ ...GOOD, _elapsed_ms: "1500" }))).status, 200);
  });

  it("takes the site's fixed hidden fields only when they are listed", async () => {
    assert.equal((await setup().handle(post({ ...GOOD, source: "ads" }))).status, 400);
    const { store, handle } = setup({ extraFields: ["source"] });
    assert.equal((await handle(post({ ...GOOD, source: "ads" }))).status, 200);
    assert.equal(store.records[0]?.fields.source, "ads");
    assert.equal((await handle(post({ ...GOOD, source: "a\r\nb" }))).status, 400);
  });

  it("checks the optional inbound HMAC in constant form and refuses a wrong or missing one", async () => {
    const inboundSecret = "i".repeat(40);
    const { store, handle } = setup({ inboundSecret });
    const body = new URLSearchParams(GOOD).toString();
    assert.equal((await handle(post(body))).status, 401);
    assert.equal((await handle(post(body, { headers: { "x-twilda-signature": `sha256=${"0".repeat(64)}` } }))).status, 401);
    const sig = await hmacHex(inboundSecret, body);
    assert.equal((await handle(post(body, { headers: { "x-twilda-signature": `sha256=${sig}` } }))).status, 200);
    assert.equal((await handle(post(body + "&x=1", { headers: { "x-twilda-signature": `sha256=${sig}` } }))).status, 401);
    assert.equal(store.records.length, 1);
  });

  it("reports a store failure as 502 without detail", async () => {
    const broken = { append: async () => { throw new Error("secret detail"); }, list: async () => [] };
    const res = await createReceiver({ allowedOrigins: [ORIGIN], signingSecret: SECRET, store: broken })(post(GOOD));
    assert.equal(res.status, 502);
    assert.doesNotMatch(await res.text(), /secret detail/);
  });
});

describe("receiver: configuration", () => {
  it("refuses unsafe configuration at start", () => {
    const store = new MemoryStore();
    const base = { allowedOrigins: [ORIGIN], signingSecret: SECRET, store };
    assert.throws(() => createReceiver({ ...base, signingSecret: "short" }), /signingSecret/);
    assert.throws(() => createReceiver({ ...base, allowedOrigins: [] }), /allowedOrigins/);
    for (const origin of ["*", "https://*.example.com", "http://example.com", "https://example.com/path", "example.com"]) {
      assert.throws(() => createReceiver({ ...base, allowedOrigins: [origin] }), /allowedOrigins/, origin);
    }
    assert.throws(() => createReceiver({ ...base, redirectTo: "https://evil.example/x" }), /redirectTo/);
    assert.throws(() => createReceiver({ ...base, redirectTo: "http://example.com/x" }), /redirectTo/);
    assert.throws(() => createReceiver({ ...base, inboundSecret: "short" }), /inboundSecret/);
  });
});
