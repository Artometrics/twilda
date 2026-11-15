/**
 * Reference implementation of the sign-in proxy for GitHub's device flow.
 *
 * Why it exists: GitHub's device-flow endpoints send no CORS headers, so a browser cannot call them.
 * This forwards exactly two requests and adds the CORS headers. It is optional. Twilda works without it
 * when a person pastes a token.
 *
 * What it is on purpose:
 * - Stateless. No KV, no Durable Object, no database, no cache. Nothing it sees is written anywhere.
 * - Silent. It never logs a request, a body, or a response. There is no `console` call in this file.
 * - Narrow. One OAuth app (`clientId`), one desk origin (`allowedOrigin`), two paths, JSON bodies under 2 KB.
 *   The scope is fixed here, so a caller cannot ask for a wider one.
 * - A pass-through for the access token. The token is in the response body that goes straight back to the
 *   desk. It is not stored, hashed, or copied into a header, a URL, or a log.
 *
 * It runs unchanged on Cloudflare Workers, Deno Deploy, Bun, and Node 22 (`Request`, `Response`, `fetch`).
 * See README.md in this folder for deployment notes. Nothing in the Twilda build imports this file.
 */

export interface ProxyConfig {
  /** The GitHub OAuth app (or GitHub App) client id this proxy serves. Requests for any other client id are refused. */
  clientId: string;
  /** Exact origin of the desk that may call this proxy, for example `https://twilda-desk.web.app`. Never `*`. */
  allowedOrigin: string;
  /** Scope sent to GitHub. Fixed by whoever deploys the proxy. Ignored by a GitHub App. Default `repo`. */
  scope?: string;
  /** Override for tests. Defaults to the platform `fetch`. */
  fetchImpl?: typeof fetch;
  /** Milliseconds to wait for GitHub. Default 10000. */
  timeoutMs?: number;
}

const MAX_BODY_BYTES = 2048;
const GITHUB = "https://github.com";
const DEVICE_CODE = /^[A-Za-z0-9._-]{8,200}$/;
const CLIENT_ID = /^[A-Za-z0-9._-]{4,100}$/;
const ORIGIN_SHAPE = /^https?:\/\/[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?(?::\d{1,5})?$/;
const SCOPE = /^[A-Za-z0-9:_,. -]{0,200}$/;

const ROUTES = {
  "/login/device/code": {
    upstream: `${GITHUB}/login/device/code`,
    reply: ["device_code", "user_code", "verification_uri", "expires_in", "interval", "error", "error_description"],
  },
  "/login/oauth/access_token": {
    upstream: `${GITHUB}/login/oauth/access_token`,
    reply: ["access_token", "token_type", "scope", "error", "error_description", "interval"],
  },
} as const;

type RoutePath = keyof typeof ROUTES;

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function reply(status: number, origin: string, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function readSmallJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) return null;
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(Uint8Array.from(chunks.flatMap((chunk) => [...chunk])));
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Build the request handler. Pure: every decision is a function of the request and the config. */
export function createProxy(config: ProxyConfig): (request: Request) => Promise<Response> {
  if (!CLIENT_ID.test(config.clientId)) throw new Error("clientId is missing or malformed.");
  if (!ORIGIN_SHAPE.test(config.allowedOrigin.replace(/\/$/, ""))) {
    throw new Error("allowedOrigin must be one exact https origin, such as https://twilda-desk.web.app.");
  }
  const origin = new URL(config.allowedOrigin);
  if (origin.protocol !== "https:" && origin.hostname !== "localhost" && origin.hostname !== "127.0.0.1") {
    throw new Error("allowedOrigin must be https, except for localhost during development.");
  }
  const allowed = origin.origin;
  const scope = config.scope ?? "repo";
  if (!SCOPE.test(scope)) throw new Error("scope is malformed.");
  const call = config.fetchImpl ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));

  return async (request) => {
    const url = new URL(request.url);
    const route = (ROUTES as Record<string, (typeof ROUTES)[RoutePath]>)[url.pathname];
    if (!route) return reply(404, allowed, { error: "not_found" });

    if (request.headers.get("origin") !== allowed) return reply(403, allowed, { error: "origin_not_allowed" });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(allowed) });
    if (request.method !== "POST") return reply(405, allowed, { error: "method_not_allowed" });

    const input = await readSmallJson(request);
    if (!input) return reply(400, allowed, { error: "bad_request" });
    if (input.client_id !== undefined && input.client_id !== config.clientId) return reply(403, allowed, { error: "client_not_allowed" });

    let forward: Record<string, string>;
    if (url.pathname === "/login/device/code") {
      forward = { client_id: config.clientId, scope };
    } else {
      const deviceCode = input.device_code;
      if (typeof deviceCode !== "string" || !DEVICE_CODE.test(deviceCode)) return reply(400, allowed, { error: "bad_request" });
      forward = { client_id: config.clientId, device_code: deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" };
    }

    let upstream: Response;
    try {
      upstream = await call(route.upstream, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "twilda-device-flow-proxy" },
        body: JSON.stringify(forward),
        redirect: "error",
        signal: AbortSignal.timeout(config.timeoutMs ?? 10_000),
      });
    } catch {
      return reply(502, allowed, { error: "upstream_unavailable" });
    }

    let payload: unknown;
    try {
      payload = await upstream.json();
    } catch {
      return reply(502, allowed, { error: "upstream_unavailable" });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return reply(502, allowed, { error: "upstream_unavailable" });

    const out: Record<string, string | number> = {};
    for (const key of route.reply) {
      const value = (payload as Record<string, unknown>)[key];
      if ((typeof value === "string" && value.length <= 1000) || (typeof value === "number" && Number.isFinite(value))) out[key] = value;
    }
    // GitHub answers 200 with an `error` field while a person has not approved yet, and 4xx for real failures. Pass the status through.
    return reply(upstream.ok ? 200 : upstream.status === 429 ? 429 : 400, allowed, out);
  };
}

interface WorkerEnv {
  GITHUB_CLIENT_ID: string;
  ALLOWED_ORIGIN: string;
  GITHUB_SCOPE?: string;
}

/** Cloudflare Workers entry. The three values are plain variables, not secrets: a client id is public. */
export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return createProxy({ clientId: env.GITHUB_CLIENT_ID, allowedOrigin: env.ALLOWED_ORIGIN, scope: env.GITHUB_SCOPE })(request);
  },
};
