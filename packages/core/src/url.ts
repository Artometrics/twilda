/**
 * One rule for what counts as a link target Twilda will store or print.
 *
 * A browser forgives a lot that a string check does not: it strips tabs and newlines
 * from a URL, reads `\` as `/` (so `/\evil.example` is the protocol-relative address
 * `//evil.example`), and turns a non-ASCII host into punycode. Each of those is a way
 * to slip a different destination past a check that only looks for `//` or `http`.
 * So a target is refused when it holds whitespace, control characters, quotes,
 * angle brackets, or a backslash at all.
 */

export const MAX_LINK_LENGTH = 400;

// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\u0000-\u0020\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff<>"'`\\]/;

/** True when `value` holds a character no link target needs: whitespace, controls, quotes, brackets, backslash, invisible characters. */
export function hasForbiddenChars(value: string): boolean {
  return FORBIDDEN.test(value);
}

/** True when the host has a punycode label, which is how a look-alike (homograph) domain is written. */
export function hasPunycodeHost(hostname: string): boolean {
  return hostname.split(".").some((label) => label.toLowerCase().startsWith("xn--"));
}

/** A site path: starts with one `/`, never `//`, and carries no character a browser would reinterpret. */
export function isSitePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && value.length <= MAX_LINK_LENGTH && !FORBIDDEN.test(value) && !hasDotSegment(value);
}

/** A `.` or `..` path segment, written plainly or percent-encoded. A browser resolves it, so the stored path would not be the path that loads. */
export function hasDotSegment(value: string): boolean {
  const path = value.split(/[?#]/, 1)[0] ?? "";
  return path.split("/").some((segment) => /^(?:\.|%2e){1,2}$/i.test(segment));
}

/** An absolute http(s) address with a host, no credentials, no look-alike (punycode) host. */
export function isWebUrl(value: string): boolean {
  if (value.length > MAX_LINK_LENGTH || FORBIDDEN.test(value) || !/^https?:\/\//i.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    (url.protocol === "https:" || url.protocol === "http:") &&
    url.hostname.length > 0 &&
    !url.username &&
    !url.password &&
    !hasPunycodeHost(url.hostname)
  );
}

/** Site path or http(s) address. This is what `hrefSchema` accepts. */
export function isSafeHref(value: string): boolean {
  return isSitePath(value) || isWebUrl(value);
}

/** The host a web address points at, lower-case and without a leading `www.`, or null. */
export function hostOf(value: string): string | null {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

const HOST_LIKE = /^(?:https?:\/\/)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#]\S*)?$/i;

/**
 * A link whose visible text is itself a web address but points somewhere else
 * (`[https://bank.example](https://evil.example)`) is a phishing shape. A label that is
 * not an address, such as "the report", is never a mismatch.
 */
export function labelContradictsTarget(label: string, href: string): boolean {
  const text = label.trim();
  if (!HOST_LIKE.test(text) || !/^https?:\/\//i.test(href)) return false;
  const shown = hostOf(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  const real = hostOf(href);
  if (!shown || !real) return false;
  return shown !== real;
}

const MAILTO = /^mailto:[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)$/;

/** A bare address: `mailto:name@host.tld`. No query (so no `?subject=` or `?bcc=` header injection), no punycode host. */
export function isMailto(value: string): boolean {
  if (value.length > 140 || FORBIDDEN.test(value)) return false;
  const match = MAILTO.exec(value);
  return match !== null && !hasPunycodeHost(match[1] as string);
}

/** What a button or contact line may point at: a site path, an http(s) address, or a bare `mailto:` address. */
export function isActionHref(value: string): boolean {
  return isSafeHref(value) || isMailto(value);
}
