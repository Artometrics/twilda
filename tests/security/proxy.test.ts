import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createProxy } from "../../examples/device-flow-proxy/worker";

const ORIGIN = "https://twilda-desk.web.app";
const CLIENT = "Iv1.testclientid0001";
const ACCESS = `gho_${"Zq9".repeat(12)}`;

interface Upstream {
  url: string;
  init: RequestInit;
}

function setup(respond: () => Response | Promise<Response> = () => Response.json({ device_code: "d".repeat(40), user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5, secret_extra: "x" })) {
  const calls: Upstream[] = [];
  const proxy = createProxy({
    clientId: CLIENT,
    allowedOrigin: ORIGIN,
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return respond();
    }) as typeof fetch,
  });
  return { proxy, calls };
}

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://proxy.example.com${path}`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("start: forwards a fixed client id and scope to GitHub and returns only the known fields", async () => {
  const { proxy, calls } = setup();
  const response = await proxy(post("/login/device/code", { client_id: CLIENT, scope: "admin:org delete_repo" }));
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys((await response.json()) as object).sort(), ["device_code", "expires_in", "interval", "user_code", "verification_uri"]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://github.com/login/device/code");
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), { client_id: CLIENT, scope: "repo" }, "the caller cannot widen the scope");
});

test("poll: forwards the device code and grant type, returns the token once, and nothing else", async () => {
  const { proxy, calls } = setup(() => Response.json({ access_token: ACCESS, token_type: "bearer", scope: "repo", refresh_token: "r", debug: { a: 1 } }));
  const response = await proxy(post("/login/oauth/access_token", { device_code: "d".repeat(40), grant_type: "client_credentials", client_secret: "nope" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { access_token: ACCESS, token_type: "bearer", scope: "repo" });
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), {
    client_id: CLIENT,
    device_code: "d".repeat(40),
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  });
});

test("the upstream request carries no credentials, cookies, forwarded addresses, or caller headers", async () => {
  const { proxy, calls } = setup();
  await proxy(
    post("/login/device/code", {}, { Cookie: "session=abc", Authorization: "Bearer caller", "X-Forwarded-For": "203.0.113.9", "CF-Connecting-IP": "203.0.113.9", Referer: "https://twilda-desk.web.app/secret?token=1" }),
  );
  const headers = Object.fromEntries(Object.entries(calls[0]?.init.headers as Record<string, string>).map(([key, value]) => [key.toLowerCase(), value]));
  assert.deepEqual(Object.keys(headers).sort(), ["accept", "content-type", "user-agent"]);
  assert.equal(calls[0]?.init.redirect, "error");
  assert.equal(calls[0]?.init.credentials, undefined);
});

test("responses are never cacheable and CORS names one origin, never *", async () => {
  const { proxy } = setup();
  const ok = await proxy(post("/login/device/code", {}));
  assert.equal(ok.headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal(ok.headers.get("cache-control"), "no-store");
  assert.equal(ok.headers.get("vary"), "Origin");
  assert.equal(ok.headers.get("x-content-type-options"), "nosniff");
  assert.equal(ok.headers.get("referrer-policy"), "no-referrer");
  for (const request of [post("/login/device/code", {}, { Origin: "https://evil.example" }), new Request("https://proxy.example.com/nope", { method: "POST", headers: { Origin: ORIGIN } })]) {
    const refused = await proxy(request);
    assert.notEqual(refused.headers.get("access-control-allow-origin"), "*");
    assert.equal(refused.headers.get("access-control-allow-origin"), ORIGIN);
  }
});

test("only the desk origin may call, only POST, only the two paths", async () => {
  const { proxy, calls } = setup();
  for (const origin of ["https://evil.example", "https://twilda-desk.web.app.evil.example", "http://twilda-desk.web.app", "null", "", "*"]) {
    const headers: Record<string, string> = origin ? { Origin: origin } : {};
    const response = await proxy(new Request("https://proxy.example.com/login/device/code", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}" }));
    assert.equal(response.status, 403, origin || "(no origin)");
  }
  const noOrigin = new Request("https://proxy.example.com/login/device/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal((await proxy(noOrigin)).status, 403);
  for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
    assert.equal((await proxy(new Request("https://proxy.example.com/login/device/code", { method, headers: { Origin: ORIGIN } }))).status, 405, method);
  }
  for (const path of ["/", "/login", "/login/device/code/", "/login/device/code/../x", "/login/oauth/authorize", "/user", "/api/v3/user", "//github.com/login/device/code"]) {
    assert.equal((await proxy(post(path, {}))).status, 404, path);
  }
  const preflight = await proxy(new Request("https://proxy.example.com/login/device/code", { method: "OPTIONS", headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST" } }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal(calls.length, 0, "nothing reached GitHub for a refused request");
});

test("it serves one OAuth app: another client id is refused, an absent one is filled in", async () => {
  const { proxy, calls } = setup();
  assert.equal((await proxy(post("/login/device/code", { client_id: "someone-elses-app" }))).status, 403);
  assert.equal(calls.length, 0);
  assert.equal((await proxy(post("/login/device/code", {}))).status, 200);
  assert.equal(JSON.parse(String(calls[0]?.init.body)).client_id, CLIENT);
});

test("malformed, oversized, and non-JSON bodies never reach GitHub", async () => {
  const { proxy, calls } = setup();
  const bodies: Array<[string, string | unknown, Record<string, string>?]> = [
    ["not json", "{nope"],
    ["array", []],
    ["null", "null"],
    ["string", '"x"'],
    ["too big", { device_code: "d".repeat(5000) }],
    ["wrong type", "{}", { "Content-Type": "text/plain" }],
    ["form", "client_id=x", { "Content-Type": "application/x-www-form-urlencoded" }],
  ];
  for (const [label, body, headers] of bodies) {
    const response = await proxy(post("/login/device/code", body, headers));
    assert.equal(response.status, 400, label);
  }
  for (const code of [7, null, "", "short", "has space in it 123456", "x".repeat(300), "<script>alert(1)</script>", "../../etc/passwd", { a: 1 }]) {
    assert.equal((await proxy(post("/login/oauth/access_token", { device_code: code }))).status, 400, JSON.stringify(code));
  }
  assert.equal(calls.length, 0, "no request left the proxy");
});

test("GitHub errors, outages, redirects, and garbage become generic answers", async () => {
  const pending = setup(() => Response.json({ error: "authorization_pending", error_description: "x".repeat(50), interval: 5, secret: "no" }));
  const pendingReply = await pending.proxy(post("/login/oauth/access_token", { device_code: "d".repeat(40) }));
  assert.equal(pendingReply.status, 200);
  assert.deepEqual(await pendingReply.json(), { error: "authorization_pending", error_description: "x".repeat(50), interval: 5 });

  const down = setup(() => {
    throw new TypeError(`connect ECONNREFUSED 140.82.112.3:443 while sending ${ACCESS}`);
  });
  const downReply = await down.proxy(post("/login/device/code", {}));
  assert.equal(downReply.status, 502);
  const downText = await downReply.text();
  assert.ok(!downText.includes("ECONNREFUSED") && !downText.includes(ACCESS));

  const html = setup(() => new Response("<html>oops</html>", { status: 200, headers: { "content-type": "text/html" } }));
  assert.equal((await html.proxy(post("/login/device/code", {}))).status, 502);

  const big = setup(() => Response.json({ access_token: "t".repeat(5000), user_code: { nested: true }, expires_in: "soon" }));
  const bigReply = await big.proxy(post("/login/oauth/access_token", { device_code: "d".repeat(40) }));
  assert.deepEqual(await bigReply.json(), {}, "oversized or mistyped fields are dropped");

  const limited = setup(() => Response.json({ error: "slow_down", interval: 10 }, { status: 429 }));
  assert.equal((await limited.proxy(post("/login/oauth/access_token", { device_code: "d".repeat(40) }))).status, 429);
});

test("configuration mistakes fail at start-up, not at request time", () => {
  for (const allowedOrigin of ["*", "https://*.web.app", "http://twilda-desk.web.app", "twilda-desk.web.app", "https://twilda-desk.web.app/path", "null", ""]) {
    assert.throws(() => createProxy({ clientId: CLIENT, allowedOrigin }), Error, allowedOrigin);
  }
  for (const clientId of ["", "a", "has space", "x".repeat(200), "<x>"]) assert.throws(() => createProxy({ clientId, allowedOrigin: ORIGIN }), Error, clientId);
  assert.throws(() => createProxy({ clientId: CLIENT, allowedOrigin: ORIGIN, scope: "repo; drop" }));
  assert.doesNotThrow(() => createProxy({ clientId: CLIENT, allowedOrigin: "http://localhost:5173" }));
});

test("the reference implementation is stateless and silent", () => {
  const source = fs.readFileSync("examples/device-flow-proxy/worker.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/\bconsole\./.test(source), "no logging");
  for (const forbidden of [/\bKV\b/, /\.put\(/, /\bDurableObject/, /\bcaches\b/, /\bD1Database\b/, /\bR2Bucket\b/, /\bindexedDB\b/, /\blocalStorage\b/, /writeFile/, /setCookie|Set-Cookie/i, /Authorization/i]) {
    assert.ok(!forbidden.test(source), `unexpected ${String(forbidden)}`);
  }
  assert.ok(!/GITHUB_CLIENT_SECRET|client_secret/.test(source), "a device flow needs no client secret, and this must never hold one");
});
