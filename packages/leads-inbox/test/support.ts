import { MemoryStore, createReceiver, type ReceiverConfig } from "../src/index";

export const SECRET = "s".repeat(40);
export const ORIGIN = "https://example.com";

export function setup(overrides: Partial<ReceiverConfig> = {}) {
  const store = new MemoryStore();
  let clock = 1_700_000_000_000;
  const handle = createReceiver({ allowedOrigins: [ORIGIN], signingSecret: SECRET, store, now: () => clock++, ...overrides });
  return { store, handle };
}

export const GOOD = { _form: "enquiry", name: "Ada Lovelace", email: "ada@example.org", message: "Hello\nthere", _elapsed_ms: "9000", _page: "https://example.com/contact?x=1#top" };

export function post(body: Record<string, string> | string, init: { origin?: string | null; type?: string; accept?: string; headers?: Record<string, string> } = {}): Request {
  const headers: Record<string, string> = { "content-type": init.type ?? "application/x-www-form-urlencoded", accept: init.accept ?? "application/json", ...init.headers };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  const text = typeof body === "string" ? body : init.type === "application/json" ? JSON.stringify(body) : new URLSearchParams(body).toString();
  return new Request("https://leads.example.workers.dev/lead", { method: "POST", headers, body: text });
}
