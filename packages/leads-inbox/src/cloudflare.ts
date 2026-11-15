import { createInbox } from "./inbox";
import { createReceiver } from "./receiver";
import { KvStore, type KvLike } from "./store";

/** The bindings and secrets the Worker reads. Set them with `wrangler secret put`, never in the file. */
export interface Env {
  LEADS: KvLike;
  /** Comma-separated https origins that may post, such as `https://example.com,https://www.example.com`. */
  ALLOWED_ORIGINS: string;
  SIGNING_SECRET: string;
  INBOX_USER: string;
  INBOX_PASSWORD: string;
  /** Optional, comma-separated extra field names (the site's fixed hidden fields). */
  EXTRA_FIELDS?: string;
  /** Optional. Days to keep a lead. Default 90. */
  RETENTION_DAYS?: string;
  /** Optional. Require `X-Twilda-Signature` on posts (only for a forwarding server). */
  INBOUND_SECRET?: string;
}

const list = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * A Cloudflare Worker. `POST /lead` receives; `GET /inbox`, `/inbox.csv` and `/inbox.css` read.
 * One Worker serves both so there is one place to deploy and one set of secrets.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const store = new KvStore(env.LEADS, Number(env.RETENTION_DAYS) || 90);
    const path = new URL(request.url).pathname;
    if (path === "/lead") {
      return createReceiver({
        allowedOrigins: list(env.ALLOWED_ORIGINS),
        signingSecret: env.SIGNING_SECRET,
        inboundSecret: env.INBOUND_SECRET || undefined,
        extraFields: list(env.EXTRA_FIELDS),
        store,
      })(request);
    }
    return createInbox({ store, signingSecret: env.SIGNING_SECRET, user: env.INBOX_USER, password: env.INBOX_PASSWORD })(request);
  },
};
