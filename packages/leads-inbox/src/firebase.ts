import { createInbox } from "./inbox";
import { createReceiver } from "./receiver";
import type { InboxConfig, ReceiverConfig } from "./types";

/** The part of an Express request a Firebase `onRequest` function gives you. Structural: no `firebase-functions` import. */
export interface NodeRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  /** Firebase gives the raw bytes here; the receiver needs them to check the size and the signature. */
  rawBody?: Uint8Array | { toString(encoding?: string): string };
}

export interface NodeResponse {
  status(code: number): NodeResponse;
  set(name: string, value: string): unknown;
  send(body: string): unknown;
  end(): unknown;
}

function toRequest(req: NodeRequest, base: string): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(", "));
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const raw = req.rawBody;
  const body = hasBody && raw ? (raw instanceof Uint8Array ? raw : new TextEncoder().encode(raw.toString("utf8"))) : undefined;
  return new Request(new URL(req.url, base), { method: req.method, headers, body: body as BodyInit | undefined });
}

async function send(response: Response, res: NodeResponse): Promise<void> {
  res.status(response.status);
  response.headers.forEach((value, name) => res.set(name, value));
  const text = await response.text();
  if (text === "") res.end();
  else res.send(text);
}

/**
 * Wrap the receiver as `onRequest((req, res) => receiveLead(config)(req, res))`.
 * `base` only completes the relative URL Express gives; use your function's own https address.
 */
export function receiveLead(config: ReceiverConfig, base = "https://localhost"): (req: NodeRequest, res: NodeResponse) => Promise<void> {
  const handle = createReceiver(config);
  return async (req, res) => send(await handle(toRequest(req, base)), res);
}

/** Wrap the inbox the same way. Serve it from a second function; keep it behind its own Basic credentials. */
export function readInbox(config: InboxConfig, base = "https://localhost"): (req: NodeRequest, res: NodeResponse) => Promise<void> {
  const handle = createInbox(config);
  return async (req, res) => send(await handle(toRequest(req, base)), res);
}
