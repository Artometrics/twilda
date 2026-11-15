import { newId, hmacHex, safeEqual, signRecord } from "./sign";
import type { ReceiverConfig, StoredLead } from "./types";
import { validateLead } from "./validate";

const HEADERS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
} as const;

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, "content-type": "application/json; charset=utf-8", ...extra } });
}

const THANKS = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Thank you</title><body style="font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem"><h1>Thank you</h1><p>Your message was sent. You can close this tab or go back.</p></body></html>`;

/** Read at most `max` bytes. A body that is larger is refused without reading the rest. */
export async function readCapped(request: Request, max: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** A body decoded into a map with no prototype, so `__proto__` is just a name that fails the key rule. */
function decode(contentType: string, body: string): Map<string, unknown> | null {
  const map = new Map<string, unknown>();
  if (contentType.startsWith("application/x-www-form-urlencoded")) {
    for (const [name, value] of new URLSearchParams(body)) {
      if (map.has(name)) return null;
      map.set(name, value);
    }
    return map;
  }
  if (contentType.startsWith("application/json")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return null;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    for (const [name, value] of Object.entries(parsed)) map.set(name, value);
    return map;
  }
  return null;
}

function checkConfig(config: ReceiverConfig): void {
  if (config.signingSecret.length < 32) throw new Error("signingSecret must be at least 32 characters");
  if (config.allowedOrigins.length === 0) throw new Error("allowedOrigins must list at least one origin");
  for (const origin of config.allowedOrigins) {
    if (!/^https:\/\/[a-z0-9.-]+(?::\d{1,5})?$/.test(origin) || origin.includes("*")) throw new Error(`allowedOrigins entry is not a plain https origin: ${origin}`);
  }
  if (config.redirectTo !== undefined) {
    let url: URL;
    try {
      url = new URL(config.redirectTo);
    } catch {
      throw new Error("redirectTo is not a URL");
    }
    if (url.protocol !== "https:" || !config.allowedOrigins.includes(url.origin)) throw new Error("redirectTo must be https on an allowed origin");
  }
  if (config.inboundSecret !== undefined && config.inboundSecret.length < 32) throw new Error("inboundSecret must be at least 32 characters");
}

/**
 * The stateless receiver. One function from a `Request` to a `Response`; it keeps nothing between calls
 * and writes to the store you pass in. Runs anywhere the Web Fetch API and WebCrypto exist.
 */
export function createReceiver(config: ReceiverConfig): (request: Request) => Promise<Response> {
  checkConfig(config);
  const maxBody = Math.min(config.maxBodyBytes ?? 16_384, 65_536);
  const minFill = config.minFillMs ?? 1500;
  const now = config.now ?? Date.now;

  return async (request) => {
    const origin = request.headers.get("origin");
    const allowed = origin !== null && config.allowedOrigins.includes(origin);
    const cors: Record<string, string> = allowed ? { "access-control-allow-origin": origin as string, vary: "Origin" } : { vary: "Origin" };

    if (request.method === "OPTIONS") {
      if (!allowed) return json(403, { ok: false, error: "origin_not_allowed" });
      return new Response(null, {
        status: 204,
        headers: { ...HEADERS, ...cors, "access-control-allow-methods": "POST", "access-control-allow-headers": "content-type", "access-control-max-age": "600" },
      });
    }
    if (request.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, { allow: "POST, OPTIONS" });
    if (origin === null ? !config.allowMissingOrigin : !allowed) return json(403, { ok: false, error: "origin_not_allowed" }, cors);

    const type = (request.headers.get("content-type") ?? "").toLowerCase();
    if (!type.startsWith("application/x-www-form-urlencoded") && !type.startsWith("application/json")) {
      return json(415, { ok: false, error: "unsupported_media_type" }, cors);
    }
    const body = await readCapped(request, maxBody);
    if (body === null) return json(413, { ok: false, error: "payload_too_large" }, cors);

    if (config.inboundSecret !== undefined) {
      const given = (request.headers.get("x-twilda-signature") ?? "").replace(/^sha256=/, "");
      if (!safeEqual(await hmacHex(config.inboundSecret, body), given)) return json(401, { ok: false, error: "bad_signature" }, cors);
    }

    const raw = decode(type, body);
    if (!raw) return json(400, { ok: false, error: "bad_body" }, cors);
    const result = validateLead(raw, { extraFields: config.extraFields, minFillMs: minFill });
    if (!result.ok) return json(400, { ok: false, errors: result.errors }, cors);

    const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
    const thanks = (): Response => {
      if (wantsJson) return json(200, { ok: true }, cors);
      if (config.redirectTo) return new Response(null, { status: 303, headers: { ...HEADERS, ...cors, location: config.redirectTo } });
      return new Response(THANKS, { status: 200, headers: { ...HEADERS, ...cors, "content-type": "text/html; charset=utf-8" } });
    };

    // A robot gets the same answer as a person and nothing is kept.
    if (result.spam) return thanks();
    if (result.tooFast) return json(400, { ok: false, errors: { _form: "too fast" } }, cors);

    const record = { id: newId(), receivedAt: now(), form: result.form, page: result.page, fields: result.fields };
    const stored: StoredLead = { ...record, sig: await signRecord(config.signingSecret, record) };
    try {
      await config.store.append(stored);
    } catch {
      return json(502, { ok: false, error: "store_unavailable" }, cors);
    }
    return thanks();
  };
}
