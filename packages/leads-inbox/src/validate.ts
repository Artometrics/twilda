/**
 * The receiver's own copy of the Twilda form rules. It is deliberately not imported from `@twilda/core`:
 * this package deploys alone, and the receiver must not trust that a request came from Twilda's script.
 * `test/parity.test.ts` checks these rules against the core ones so the two cannot drift.
 */

export const FIELD_KINDS = ["name", "email", "phone", "company", "message", "text", "consent"] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

export const FIELD_MAX: Record<FieldKind, number> = { name: 100, email: 254, phone: 30, company: 100, message: 2000, text: 200, consent: 3 };
export const MAX_PAYLOAD_CHARS = 6000;
export const MAX_KEYS = 24;
export const SPECIAL = ["_hp", "_elapsed_ms", "_page", "_form"] as const;

const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029]/;
const LINE_BREAK = /[\r\n\u0085\u2028\u2029]/;
const ENCODED_BREAK = /%(?:0[ad]|00)/i;
const EMAIL = /^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)$/;
const PHONE = /^\+?[0-9][0-9 ().-]{4,28}[0-9]$/;
const FORM_ID = /^[a-z][a-z0-9-]{0,39}$/;
const KEY = /^[A-Za-z_][A-Za-z0-9_-]{0,39}$/;
const FIELD_NAME = new RegExp(`^(${FIELD_KINDS.join("|")})(?:_([2-8]))?$`);

export function isSafeEmail(value: string): boolean {
  if (value.length > FIELD_MAX.email || LINE_BREAK.test(value) || CONTROL.test(value) || ENCODED_BREAK.test(value)) return false;
  if (/[\s,;<>()[\]\\":]/.test(value)) return false;
  const match = EMAIL.exec(value);
  if (!match) return false;
  return !(match[1] as string).split(".").some((label) => label.toLowerCase().startsWith("xn--"));
}

export function isSingleLine(value: string, max: number): boolean {
  return value.length <= max && !LINE_BREAK.test(value) && !CONTROL.test(value) && !ENCODED_BREAK.test(value);
}

/** The kind a field name stands for (`email`, `email_2`), or null for a name Twilda never sends. */
export function kindOf(name: string): FieldKind | null {
  const match = FIELD_NAME.exec(name);
  return match ? (match[1] as FieldKind) : null;
}

function checkValue(kind: FieldKind, value: string): string | null {
  if (value.length > FIELD_MAX[kind]) return "too long";
  switch (kind) {
    case "email":
      return isSafeEmail(value) ? null : "not an email address";
    case "phone":
      return PHONE.test(value) && (value.match(/\d/g) ?? []).length >= 6 ? null : "not a phone number";
    case "message":
      return CONTROL.test(value) || value.includes("\r") ? "unusual characters" : null;
    case "consent":
      return value === "yes" ? null : "consent must be yes";
    default:
      return isSingleLine(value, FIELD_MAX[kind]) ? null : "must be one line";
  }
}

export type Parsed =
  | { ok: true; spam: boolean; tooFast: boolean; form: string; page: string | null; fields: Record<string, string> }
  | { ok: false; errors: Record<string, string> };

/**
 * Check a decoded body. `raw` maps names to values with no prototype; any non-string is refused.
 * Unknown names are refused, never stored: a receiver that keeps whatever it is sent keeps whatever an attacker sends.
 */
export function validateLead(
  raw: ReadonlyMap<string, unknown>,
  options: { extraFields?: readonly string[]; minFillMs: number },
): Parsed {
  // No prototype: an error recorded under `__proto__` must be an own key, or it would silently vanish.
  const errors: Record<string, string> = Object.create(null) as Record<string, string>;
  const extra = new Set(options.extraFields ?? []);
  if (raw.size > MAX_KEYS) return { ok: false, errors: { _form: "too many fields" } };
  const fields: Record<string, string> = Object.create(null) as Record<string, string>;
  let total = 0;
  for (const [name, given] of raw) {
    if (!KEY.test(name)) {
      errors[safeKey(name)] = "bad field name";
      continue;
    }
    if (typeof given !== "string") {
      errors[name] = "send plain text";
      continue;
    }
    if ((SPECIAL as readonly string[]).includes(name)) continue;
    const kind = kindOf(name);
    if (!kind && !extra.has(name)) {
      errors[name] = "unknown field";
      continue;
    }
    const value = kind === "message" ? given.replace(/\r\n?/g, "\n").trim() : given.trim();
    total += value.length;
    if (value === "") continue;
    if (kind) {
      const problem = checkValue(kind, value);
      if (problem) errors[name] = problem;
      else fields[name] = value;
    } else if (!isSingleLine(value, 200)) errors[name] = "must be one line";
    else fields[name] = value;
  }
  if (total > MAX_PAYLOAD_CHARS) errors._form = "too much text";
  const form = raw.get("_form");
  if (typeof form !== "string" || !FORM_ID.test(form)) errors._form = errors._form ?? "missing form id";
  if (!Object.keys(fields).some((name) => kindOf(name) === "email" || kindOf(name) === "phone")) errors._contact = "an email address or phone number is required";
  if (Object.keys(errors).length > 0) return { ok: false, errors: { ...errors } };

  const trap = raw.get("_hp");
  const elapsed = raw.get("_elapsed_ms");
  const spam = (typeof trap === "string" && trap !== "") || (trap !== undefined && typeof trap !== "string");
  const tooFast = typeof elapsed === "string" && /^\d{1,9}$/.test(elapsed) && Number(elapsed) < options.minFillMs;
  const pageRaw = raw.get("_page");
  return { ok: true, spam, tooFast, form: form as string, page: cleanPage(pageRaw), fields: { ...fields } };
}

function safeKey(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, "?").slice(0, 40) || "?";
}

/** A page address worth keeping: a plain https URL with no credentials, no controls, and a sane length. */
export function cleanPage(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300 || CONTROL.test(value) || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}
