/** One stored lead. Only what the visitor typed, the form it came from, and when. No IP address, no user agent. */
export interface LeadRecord {
  id: string;
  /** Milliseconds since the epoch, set by the receiver, never by the sender. */
  receivedAt: number;
  /** The `_form` value: the section id on the Twilda page. */
  form: string;
  /** The page address the form was on, when it was a plain https URL. */
  page: string | null;
  /** Field name to value, as validated. */
  fields: Record<string, string>;
}

/** A record as stored: the lead plus an HMAC-SHA256 over its canonical form. */
export interface StoredLead extends LeadRecord {
  sig: string;
}

/** Where leads go. Append and read only: the receiver never updates or deletes, and the inbox never writes. */
export interface LeadStore {
  append(record: StoredLead): Promise<void>;
  /** Newest first. */
  list(limit: number): Promise<StoredLead[]>;
}

export interface ReceiverConfig {
  /** Origins that may post, such as `https://example.com`. Exact match, https only, no wildcard. */
  allowedOrigins: readonly string[];
  /** Key for the stored record signatures. At least 32 characters. Keep it out of the store. */
  signingSecret: string;
  store: LeadStore;
  /**
   * Optional. When set, every request must carry `X-Twilda-Signature: sha256=<hex>`, an HMAC of the raw body.
   * A browser cannot hold a secret, so use this only for a server that forwards (Zapier, Make, your own function).
   */
  inboundSecret?: string;
  /** Extra field names to accept beyond the Twilda field set, for the site's fixed hidden fields. */
  extraFields?: readonly string[];
  /** Largest body in bytes. Default 16384. */
  maxBodyBytes?: number;
  /** Fastest plausible fill in ms. Default 1500, the same as the page. */
  minFillMs?: number;
  /** Accept a request with no Origin header. Default false. */
  allowMissingOrigin?: boolean;
  /** Where a plain form post is sent afterwards. Must be https on an allowed origin. Without it a small thank-you page is shown. */
  redirectTo?: string;
  /** Clock, for tests. */
  now?: () => number;
}

export interface InboxConfig {
  store: LeadStore;
  signingSecret: string;
  /** HTTP Basic credentials. The password must be at least 16 characters. */
  user: string;
  password: string;
  /** Rows to show and export. Default 200, at most 1000. */
  limit?: number;
}
