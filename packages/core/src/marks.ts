import { escapeHtml } from "./escape";

/**
 * Basic inline marks inside a plain string field: `**bold**`, `*italic*`, and
 * `[label](https://example.com)`. A backslash escapes `\ * [ ]` and `(`/`)`.
 *
 * The stored value stays a plain string, so the contract does not grow a rich-text
 * type, a field with no marks reads as it always did, and nothing here can carry
 * HTML. The renderer prints only `<strong>`, `<em>`, and `<a>`, and every other
 * character is escaped. A link whose target is not safe is printed as plain text.
 */

export type MarksLevel = "emphasis" | "links";

export type MarkNode =
  | { t: "text"; v: string }
  | { t: "strong"; c: MarkNode[] }
  | { t: "em"; c: MarkNode[] }
  | { t: "a"; href: string; c: MarkNode[] };

const SPECIAL = "\\*[]()";
const MAX_HREF = 400;

/** http(s) with a host and no credentials, `mailto:`, or a site path. No scripts, no `data:`, no `//host`. */
export function isSafeLinkTarget(value: string): boolean {
  const href = value.trim();
  if (href.length === 0 || href.length > MAX_HREF || href !== value) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f<>"'`\\]/.test(href)) return false;
  if (href.startsWith("/")) return !href.startsWith("//");
  if (href.startsWith("#")) return href.length > 1;
  if (/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(href)) return true;
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    const url = new URL(href);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".") && !url.username && !url.password;
  } catch {
    return false;
  }
}

const isSpace = (char: string | undefined) => char === undefined || /\s/.test(char);

/** Index of the delimiter that closes an emphasis run opened before `from`, or -1. */
function findClose(source: string, from: number, delimiter: "*" | "**"): number {
  let i = from;
  while (i < source.length) {
    const char = source[i];
    if (char === "\\") {
      i += 2;
      continue;
    }
    if (char !== "*") {
      i += 1;
      continue;
    }
    let end = i;
    while (source[end] === "*") end += 1;
    const run = end - i;
    if (!isSpace(source[i - 1])) {
      if (delimiter === "**" && run >= 2) return end - 2;
      if (delimiter === "*" && (run === 1 || run >= 3)) return end - 1;
    }
    i = end;
  }
  return -1;
}

function findLinkEnd(source: string, open: number): { label: string; href: string; next: number } | null {
  let i = open + 1;
  while (i < source.length && source[i] !== "]") {
    if (source[i] === "\\") i += 1;
    if (source[i] === "[") return null;
    i += 1;
  }
  if (source[i] !== "]" || source[i + 1] !== "(") return null;
  const close = source.indexOf(")", i + 2);
  if (close === -1) return null;
  return { label: source.slice(open + 1, i), href: source.slice(i + 2, close), next: close + 1 };
}

function parseRange(source: string, allowLinks: boolean): MarkNode[] {
  const out: MarkNode[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) out.push({ t: "text", v: buffer });
    buffer = "";
  };
  let i = 0;
  while (i < source.length) {
    const char = source[i] as string;
    if (char === "\\" && i + 1 < source.length && SPECIAL.includes(source[i + 1] as string)) {
      buffer += source[i + 1];
      i += 2;
      continue;
    }
    if (char === "*") {
      const strong = source[i + 1] === "*";
      const width = strong ? 2 : 1;
      if (!isSpace(source[i + width])) {
        const close = findClose(source, i + width, strong ? "**" : "*");
        if (close > i + width) {
          flush();
          out.push({ t: strong ? "strong" : "em", c: parseRange(source.slice(i + width, close), allowLinks) });
          i = close + width;
          continue;
        }
      }
    }
    if (char === "[" && allowLinks) {
      const link = findLinkEnd(source, i);
      if (link && isSafeLinkTarget(link.href)) {
        flush();
        out.push({ t: "a", href: link.href, c: parseRange(link.label, false) });
        i = link.next;
        continue;
      }
    }
    buffer += char;
    i += 1;
  }
  flush();
  return out;
}

export function parseMarks(source: string, level: MarksLevel = "links"): MarkNode[] {
  return parseRange(source, level === "links");
}

function nodesToHtml(nodes: MarkNode[], level: MarksLevel): string {
  return nodes
    .map((node) => {
      switch (node.t) {
        case "text":
          return escapeHtml(node.v);
        case "strong":
          return `<strong>${nodesToHtml(node.c, level)}</strong>`;
        case "em":
          return `<em>${nodesToHtml(node.c, level)}</em>`;
        case "a":
          return `<a href="${escapeHtml(node.href)}" rel="noopener noreferrer nofollow">${nodesToHtml(node.c, level)}</a>`;
      }
    })
    .join("");
}

/** Escaped HTML for a marked-up string. Only strong, em, and a (with a safe href) can appear. */
export function renderMarks(source: string, level: MarksLevel = "links"): string {
  return nodesToHtml(parseMarks(source, level), level);
}

function nodesToText(nodes: MarkNode[]): string {
  return nodes.map((node) => (node.t === "text" ? node.v : nodesToText(node.c))).join("");
}

/** The words with every mark removed. */
export function stripMarks(source: string, level: MarksLevel = "links"): string {
  return nodesToText(parseMarks(source, level));
}

/** Escape characters that would otherwise read as marks. */
export function escapeMarks(text: string): string {
  let out = "";
  for (const char of text) out += SPECIAL.includes(char) ? `\\${char}` : char;
  return out;
}

/** Link targets written as `[label](target)` that are not safe. Used by the schema. */
export function unsafeLinkTargets(source: string): string[] {
  const bad: string[] = [];
  let i = 0;
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] === "[") {
      const link = findLinkEnd(source, i);
      if (link) {
        if (!isSafeLinkTarget(link.href)) bad.push(link.href);
        i = link.next;
        continue;
      }
    }
    i += 1;
  }
  return bad;
}

/** Percent-encode what would end a link target early. */
export function encodeLinkTarget(href: string): string {
  return href.replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\s/g, "%20");
}

interface DomLike {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<DomLike>;
  getAttribute?(name: string): string | null;
}

function styleSays(node: DomLike, pattern: RegExp): boolean {
  return pattern.test(node.getAttribute?.("style") ?? "");
}

/**
 * Turn the DOM of an editing surface back into the marked-up string. Only text,
 * bold, italic, links, and line breaks survive. Every other element contributes its text.
 * A link is kept only when its target is safe.
 */
export function marksFromDom(root: DomLike, level: MarksLevel = "links"): string {
  const walk = (node: DomLike): string => {
    if (node.nodeType === 3) return escapeMarks((node.textContent ?? "").replace(/\u00a0/g, " "));
    if (node.nodeType !== 1) return "";
    const name = node.nodeName.toLowerCase();
    if (name === "br") return "\n";
    const inner = Array.from(node.childNodes).map(walk).join("");
    const block = name === "div" || name === "p";
    const wrapWith = (marker: string) => {
      const trimmed = inner.trim();
      if (!trimmed) return inner;
      const lead = inner.slice(0, inner.length - inner.trimStart().length);
      const tail = inner.slice(inner.trimEnd().length);
      return `${lead}${marker}${trimmed}${marker}${tail}`;
    };
    let out = inner;
    if (name === "a") {
      const href = (node.getAttribute?.("href") ?? node.getAttribute?.("data-twilda-href") ?? "").trim();
      out = level === "links" && inner.trim() && isSafeLinkTarget(href) ? `[${inner.trim()}](${encodeLinkTarget(href)})` : inner;
    } else {
      const strong = name === "strong" || name === "b" || styleSays(node, /font-weight\s*:\s*(bold|[6-9]00)/i);
      const em = name === "em" || name === "i" || styleSays(node, /font-style\s*:\s*italic/i);
      if (strong && em) out = wrapWith("***");
      else if (strong) out = wrapWith("**");
      else if (em) out = wrapWith("*");
    }
    return block ? `${out}\n` : out;
  };
  return Array.from(root.childNodes).map(walk).join("");
}
