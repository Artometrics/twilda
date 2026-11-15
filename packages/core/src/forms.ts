import { z } from "zod";
import { hasForbiddenChars, hasPunycodeHost } from "./url";

/**
 * Forms, integrate-only.
 *
 * Twilda prints a form and the browser sends it to an address the site owner chose in
 * `content/site.json` (`forms.endpoint`). Twilda never receives, stores, or logs a
 * submission. Everything here is pure and browser-safe: no `node:` import, no `document`.
 *
 * Two things are validated and kept in one place so they cannot drift:
 * - the **endpoint** (https only, one origin, no wildcard), which also becomes the only
 *   origin the site's Content-Security-Policy opens for `form-action` and `connect-src`;
 * - the **submission** (what a visitor typed), by the same rules the page's script applies
 *   before it sends and a receiver such as `packages/leads-inbox` applies on arrival.
 */

export const FORM_VARIANTS = ["contact", "lead", "newsletter"] as const;
export type FormVariant = (typeof FORM_VARIANTS)[number];

export const FORM_VARIANT_LABELS: Record<FormVariant, string> = {
  contact: "Contact form",
  lead: "Lead form",
  newsletter: "Newsletter sign-up",
};

export const FORM_FIELD_KINDS = ["name", "email", "phone", "company", "message", "text", "consent"] as const;
export type FormFieldKind = (typeof FORM_FIELD_KINDS)[number];

export const FORM_FIELD_KIND_LABELS: Record<FormFieldKind, string> = {
  name: "Name",
  email: "Email address",
  phone: "Phone number",
  company: "Company",
  message: "Message (several lines)",
  text: "Short answer",
  consent: "Consent tick box",
};

/** Most a visitor can type into one field, by kind. The page, the validator, and the receiver all use these. */
export const FORM_FIELD_MAX: Record<FormFieldKind, number> = {
  name: 100,
  email: 254,
  phone: 30,
  company: 100,
  message: 2000,
  text: 200,
  consent: 3,
};

/** Largest whole submission in characters. A receiver should refuse a body over twice this. */
export const FORM_MAX_PAYLOAD_CHARS = 6000;

/** Fastest a human is expected to fill a form, in milliseconds. A faster submit is asked to press send again. */
export const FORM_MIN_FILL_MS = 1500;

/** Names the page adds itself. A site's `hidden` fields may not reuse them. */
export const FORM_RESERVED_NAMES = ["_hp", "_elapsed_ms", "_page", "_form"] as const;

export const MAX_FORM_HIDDEN = 5;
export const MAX_FORM_FIELDS = 8;

// ---------------------------------------------------------------------------------------------
// The endpoint

/** `https://host[:port]`, lower case: the only shape that may reach a Content-Security-Policy. */
const CSP_ORIGIN = /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?::\d{2,5})?$/;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const LOCAL_SUFFIX = /\.(?:localhost|local|internal|lan|home|corp|test|invalid|example)$/i;

/** Characters that could end a CSP source or start another directive, or that mean "any". */
const POLICY_BREAKERS = /[;,*|^{}[\]()!$&=]/;
const ENCODED_CONTROL = /%(?:0[0-9a-f]|1[0-9a-f]|7f|2[02-7]|3c|3e|5c)/i;

export interface EndpointCheck {
  ok: boolean;
  /** `https://host[:port]` when ok. This is what the policy lists. */
  origin?: string;
  reason?: string;
}

/**
 * Whether `value` may be a form endpoint. `https://` only, one concrete public host, no
 * credentials, no look-alike host, no port other than a plain number, no fragment, and none of the
 * characters that could make the host smuggle a second source or directive into a policy.
 */
export function checkFormEndpoint(value: string): EndpointCheck {
  const no = (reason: string): EndpointCheck => ({ ok: false, reason });
  if (typeof value !== "string" || value.length === 0) return no("Enter the address your form service gave you.");
  if (value.length > 300) return no("The address is longer than 300 characters.");
  if (!/^https:\/\//i.test(value)) return no("Use an address that starts with https://. http:, javascript:, data:, and other schemes are refused.");
  if (hasForbiddenChars(value)) return no("The address has a space, quote, bracket, backslash, or invisible character.");
  if (POLICY_BREAKERS.test(value.slice("https://".length).split(/[?#]/, 1)[0] ?? "")) return no("The host or path has a character that is not allowed: ; , * | and similar.");
  if (/[;,*]/.test(value)) return no("The address may not contain ; , or *.");
  if (ENCODED_CONTROL.test(value)) return no("The address has an encoded control character.");
  if (value.includes("@")) return no("The address may not carry a user name or password.");
  if (value.includes("#")) return no("Leave off the #fragment.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return no("That is not a valid address.");
  }
  if (url.protocol !== "https:") return no("Use https://.");
  if (url.username || url.password) return no("The address may not carry a user name or password.");
  const host = url.hostname.toLowerCase();
  if (host.endsWith(".")) return no("Leave off the dot after the host name.");
  if (IPV4.test(host) || host.includes(":") || host.startsWith("[")) return no("Use a host name, not an IP address.");
  if (host === "localhost" || LOCAL_SUFFIX.test(host) || !host.includes(".")) return no("Use a public host name.");
  if (hasPunycodeHost(host) || !/^[a-z0-9.-]+$/.test(host)) return no("Look-alike (non-ASCII) host names are refused.");
  const origin = url.origin.toLowerCase();
  if (!CSP_ORIGIN.test(origin)) return no("The host name is not in a form the policy can list.");
  return { ok: true, origin };
}

export function isFormEndpoint(value: string): boolean {
  return checkFormEndpoint(value).ok;
}

/** The origin a valid endpoint adds to the policy, or null when it is not valid. */
export function formEndpointOrigin(value: string): string | null {
  const result = checkFormEndpoint(value);
  return result.ok ? (result.origin ?? null) : null;
}

export const formEndpointSchema = z
  .string()
  .max(300)
  .superRefine((value, ctx) => {
    const result = checkFormEndpoint(value);
    if (!result.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.reason ?? "Not a valid form address." });
  });

const hiddenName = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z0-9_-]{0,39}$/, "Use letters, numbers, hyphens, or underscores, starting with a letter or an underscore.")
  .refine((name) => !(FORM_RESERVED_NAMES as readonly string[]).includes(name.toLowerCase()), "That name is used by the page itself.")
  .refine((name) => !/^(?:name|email|phone|company|message|text|consent)(?:_\d+)?$/i.test(name), "That name is used by a form field.");

// eslint-disable-next-line no-control-regex
const hiddenValue = z.string().max(120).regex(/^[^\u0000-\u001f\u007f-\u009f\u2028\u2029]*$/, "No line breaks or control characters.");

/** The site-wide forms setting in `content/site.json`. Absent means the site has no form and its policy stays shut. */
export const formsConfigSchema = z
  .object({
    /** Where the browser sends a submission. `https://` only. */
    endpoint: formEndpointSchema,
    /**
     * `fetch`: the page's script sends the submission and shows the result on the page (the service must
     * allow cross-origin requests; Formspree and Basin do). `post`: the script only checks the fields, then
     * the browser does a normal form post and the service's own thank-you page opens. It works with any
     * service and keeps `connect-src` shut.
     */
    mode: z.enum(["fetch", "post"]).default("fetch"),
    /** What `fetch` sends: `form` (url-encoded, the safest across services) or `json`. With no script, a plain `form` post is always the fallback. */
    format: z.enum(["form", "json"]).default("form"),
    /** Fixed extra fields some services want, such as Netlify's `form-name` or Formspree's `_subject`. */
    hidden: z
      .record(hiddenName, hiddenValue)
      .default({})
      .refine((value) => Object.keys(value).length <= MAX_FORM_HIDDEN, `At most ${MAX_FORM_HIDDEN} hidden fields.`),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.mode === "post" && value.format === "json") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["format"], message: "A plain post cannot send JSON. Use format \"form\", or mode \"fetch\"." });
    }
  });

export type FormsConfig = z.infer<typeof formsConfigSchema>;

// ---------------------------------------------------------------------------------------------
// Field sets

export interface FormFieldDef {
  id: string;
  kind: FormFieldKind;
  label: string;
  required: boolean;
  hint: string;
}

/** The field set a variant starts with. A site owner may relabel, reorder, add, and remove. */
export function defaultFields(variant: FormVariant): FormFieldDef[] {
  switch (variant) {
    case "contact":
      return [
        { id: "name", kind: "name", label: "Your name", required: true, hint: "" },
        { id: "email", kind: "email", label: "Email address", required: true, hint: "We reply here." },
        { id: "message", kind: "message", label: "How can we help?", required: true, hint: "" },
      ];
    case "lead":
      return [
        { id: "name", kind: "name", label: "Your name", required: true, hint: "" },
        { id: "email", kind: "email", label: "Email address", required: true, hint: "" },
        { id: "company", kind: "company", label: "Company", required: false, hint: "" },
        { id: "goal", kind: "text", label: "What are you building?", required: false, hint: "" },
      ];
    case "newsletter":
      return [
        { id: "name", kind: "name", label: "First name", required: false, hint: "" },
        { id: "email", kind: "email", label: "Email address", required: true, hint: "" },
      ];
    default: {
      const exhaustive: never = variant;
      throw new Error(`Unknown form variant ${exhaustive}`);
    }
  }
}

/**
 * The name each field is submitted under: its kind, and `_2`, `_3` for a repeat of the same kind
 * (`text`, `text_2`). Names never start with an underscore, so they cannot meet the page's own.
 */
export function formFieldNames(fields: ReadonlyArray<{ kind: FormFieldKind }>): string[] {
  const seen = new Map<string, number>();
  return fields.map((field) => {
    const count = (seen.get(field.kind) ?? 0) + 1;
    seen.set(field.kind, count);
    return count === 1 ? field.kind : `${field.kind}_${count}`;
  });
}

// ---------------------------------------------------------------------------------------------
// Submissions

const EMAIL = /^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029]/;
const LINE_BREAK = /[\r\n\u0085\u2028\u2029]/;
const ENCODED_BREAK = /%(?:0[ad]|00)/i;
const PHONE = /^\+?[0-9][0-9 ().-]{4,28}[0-9]$/;

export type SubmissionResult =
  | { ok: true; values: Record<string, string>; spam: boolean }
  | { ok: false; errors: Record<string, string> };

/**
 * An email address that is safe to put in a message header: one address, plain ASCII, no
 * line break (raw or percent-encoded), no comma or semicolon that would add a recipient, and no
 * header name. This is deliberately stricter than the full email grammar.
 */
export function isSafeEmail(value: string): boolean {
  if (value.length > FORM_FIELD_MAX.email || LINE_BREAK.test(value) || CONTROL.test(value) || ENCODED_BREAK.test(value)) return false;
  if (/[\s,;<>()[\]\\":]/.test(value)) return false;
  const match = EMAIL.exec(value);
  if (!match) return false;
  return !(match[1] as string).split(".").some((label) => label.toLowerCase().startsWith("xn--"));
}

/** A line of text that can go into a header or a one-line cell: no line break (raw or percent-encoded) and no control character. */
export function isSingleLine(value: string, max: number): boolean {
  return value.length <= max && !LINE_BREAK.test(value) && !CONTROL.test(value) && !ENCODED_BREAK.test(value);
}

function checkField(kind: FormFieldKind, raw: string): string | null {
  const value = raw.trim();
  if (value.length > FORM_FIELD_MAX[kind]) return `Use at most ${FORM_FIELD_MAX[kind]} characters.`;
  switch (kind) {
    case "email":
      return isSafeEmail(value) ? null : "Enter an email address such as name@example.com.";
    case "phone":
      return PHONE.test(value) && (value.match(/\d/g) ?? []).length >= 6 ? null : "Enter a phone number with digits, spaces, + ( ) . or - only.";
    case "message":
      return CONTROL.test(value) || value.includes("\r") ? "Remove the unusual characters." : null;
    case "consent":
      return value === "yes" ? null : "Tick the box to continue.";
    default:
      return isSingleLine(value, FORM_FIELD_MAX[kind]) ? null : "Use one line of plain text.";
  }
}

/**
 * Validate what a visitor submitted against a form section's field set. `values` is keyed by the
 * submitted names from {@link formFieldNames}. Unknown names are ignored except the page's own
 * `_hp` (honeypot) and `_elapsed_ms` (time trap), which set `spam`. The returned values hold only
 * the section's fields, trimmed, so a receiver never stores a field nobody asked for.
 */
export function validateSubmission(
  section: { fields: ReadonlyArray<{ kind: FormFieldKind; required: boolean }> },
  values: Readonly<Record<string, unknown>>,
): SubmissionResult {
  const names = formFieldNames(section.fields);
  const errors: Record<string, string> = {};
  const clean: Record<string, string> = {};
  let total = 0;
  section.fields.forEach((field, index) => {
    const name = names[index] as string;
    const given = values[name];
    const raw = typeof given === "string" ? given : "";
    if (given !== undefined && typeof given !== "string") {
      errors[name] = "Send plain text.";
      return;
    }
    const value = field.kind === "message" ? raw.replace(/\r\n?/g, "\n").trim() : raw.trim();
    total += value.length;
    if (value === "") {
      if (field.required) errors[name] = field.kind === "consent" ? "Tick the box to continue." : "This field is required.";
      return;
    }
    const problem = checkField(field.kind, value);
    if (problem) errors[name] = problem;
    else clean[name] = value;
  });
  if (total > FORM_MAX_PAYLOAD_CHARS) errors._form = "That is too much text to send.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const trap = values._hp;
  const elapsed = values._elapsed_ms;
  const spam = (typeof trap === "string" && trap !== "") || (trap !== undefined && typeof trap !== "string");
  const tooFast = typeof elapsed === "string" && /^\d{1,9}$/.test(elapsed) && Number(elapsed) < FORM_MIN_FILL_MS;
  return { ok: true, values: clean, spam: spam || tooFast };
}
