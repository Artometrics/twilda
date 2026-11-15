const encoder = new TextEncoder();

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** HMAC-SHA256 as lowercase hex. */
export async function hmacHex(secret: string, message: string): Promise<string> {
  return hex(await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(message)));
}

/**
 * The same bytes for the same record on every runtime: fixed key order, field names sorted, no whitespace.
 * Signing a record means signing this string.
 */
export function canonical(record: { id: string; receivedAt: number; form: string; page: string | null; fields: Record<string, string> }): string {
  const fields = Object.keys(record.fields)
    .sort()
    .map((name) => [name, record.fields[name]]);
  return JSON.stringify([record.id, record.receivedAt, record.form, record.page, fields]);
}

/** Compare two strings in time that depends only on their length. */
export function safeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

export async function signRecord(secret: string, record: Parameters<typeof canonical>[0]): Promise<string> {
  return hmacHex(secret, canonical(record));
}

export async function verifyRecord(secret: string, record: Parameters<typeof canonical>[0], sig: string): Promise<boolean> {
  return safeEqual(await signRecord(secret, record), sig);
}

/** A random id: 16 bytes as hex. */
export function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
