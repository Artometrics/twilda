import type { LeadStore, StoredLead } from "./types";

/** For tests and local runs. Not durable. */
export class MemoryStore implements LeadStore {
  readonly records: StoredLead[] = [];
  async append(record: StoredLead): Promise<void> {
    this.records.push(record);
  }
  async list(limit: number): Promise<StoredLead[]> {
    return this.records.slice().sort((a, b) => b.receivedAt - a.receivedAt).slice(0, limit);
  }
}

/** The part of a Cloudflare Workers KV namespace this package uses. Structural, so there is no Cloudflare import. */
export interface KvLike {
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  get(key: string): Promise<string | null>;
  list(options: { prefix: string; limit: number }): Promise<{ keys: { name: string }[] }>;
}

const FAR = 9_999_999_999_999;

/**
 * Leads in a KV namespace the site owner owns. Keys sort newest first (`lead:<reversed time>:<id>`),
 * every key expires after `retentionDays`, and nothing is ever overwritten because the id is random.
 */
export class KvStore implements LeadStore {
  constructor(
    private readonly kv: KvLike,
    private readonly retentionDays = 90,
  ) {}

  async append(record: StoredLead): Promise<void> {
    const key = `lead:${String(FAR - record.receivedAt).padStart(13, "0")}:${record.id}`;
    // KV needs at least 60 seconds; a day is the shortest retention this template offers.
    const ttl = Math.max(86_400, Math.floor(this.retentionDays) * 86_400);
    await this.kv.put(key, JSON.stringify(record), { expirationTtl: ttl });
  }

  async list(limit: number): Promise<StoredLead[]> {
    const { keys } = await this.kv.list({ prefix: "lead:", limit });
    const rows = await Promise.all(keys.map((key) => this.kv.get(key.name)));
    const out: StoredLead[] = [];
    for (const row of rows) {
      if (!row) continue;
      const parsed = parseStored(row);
      if (parsed) out.push(parsed);
    }
    return out;
  }
}

/** The part of a Firestore database this package uses. Structural, so `firebase-admin` is never imported here. */
export interface FirestoreLike {
  collection(name: string): {
    doc(id: string): { create(data: unknown): Promise<unknown> };
    orderBy(field: string, direction: "desc"): { limit(count: number): { get(): Promise<{ docs: { data(): unknown }[] }> } };
  };
}

/** Leads in a Firestore collection in the owner's own project. `create` fails if the id exists, so nothing is overwritten. */
export class FirestoreStore implements LeadStore {
  constructor(
    private readonly db: FirestoreLike,
    private readonly collection = "leads",
  ) {}
  async append(record: StoredLead): Promise<void> {
    await this.db.collection(this.collection).doc(record.id).create(record);
  }
  async list(limit: number): Promise<StoredLead[]> {
    const snapshot = await this.db.collection(this.collection).orderBy("receivedAt", "desc").limit(limit).get();
    const out: StoredLead[] = [];
    for (const doc of snapshot.docs) {
      const parsed = parseStored(doc.data());
      if (parsed) out.push(parsed);
    }
    return out;
  }
}

/** Read a stored row back, refusing anything that is not the shape this package writes. */
export function parseStored(input: unknown): StoredLead | null {
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return null;
    }
  }
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  const fields = row.fields;
  if (typeof row.id !== "string" || typeof row.receivedAt !== "number" || typeof row.form !== "string" || typeof row.sig !== "string") return null;
  if (row.page !== null && typeof row.page !== "string") return null;
  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) return null;
  const clean: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [name, entry] of Object.entries(fields)) {
    if (typeof entry !== "string") return null;
    clean[name] = entry;
  }
  return { id: row.id, receivedAt: row.receivedAt, form: row.form, page: (row.page as string | null) ?? null, fields: { ...clean }, sig: row.sig };
}
