import assert from "node:assert/strict";
import { documentSchema, type TwildaDocument } from "@twilda/core";
import { HOSTILE_ARTICLE, HOSTILE_PAGE } from "../fixtures/render-corpus";

/**
 * Strings an attacker types into a field. Every one of them must come out of the renderer
 * as inert text, never as markup, an event handler, or a navigable URL.
 */
export const XSS_PAYLOADS: string[] = [
  `<script>alert(1)</script>`,
  `"><img src=x onerror=alert(1)>`,
  `'><svg onload=alert(1)>`,
  `</p><iframe srcdoc="<script>alert(1)</script>"></iframe>`,
  `javascript:alert(1)`,
  `<a href="javascript:alert(1)">x</a>`,
  `<style>*{display:none}</style>`,
  `<!-- --><script>alert(1)</script>`,
  `&lt;script&gt;alert(1)&lt;/script&gt;`,
  `&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;`,
  `<math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>`,
  `<noscript><p title="</noscript><img src=x onerror=alert(1)>">`,
  `<base href="https://evil.example/">`,
  `<meta http-equiv="refresh" content="0;url=https://evil.example/">`,
  `\u0000<script>alert(1)</script>`,
  `\u2028<img src=x onerror=alert(1)>`,
  `{{constructor.constructor('alert(1)')()}}`,
  "`${alert(1)}`",
  `[click](javascript:alert(1))`,
  `**<img src=x onerror=alert(1)>**`,
  `*[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)*`,
];

export interface Tag {
  name: string;
  closing: boolean;
  attrs: Record<string, string>;
  raw: string;
}

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>`=]+))?)*)\s*\/?>/g;
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`=]+)))?/g;

export function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function scanTags(html: string): { tags: Tag[]; text: string } {
  const tags: Tag[] = [];
  const text = html.replace(TAG, (raw, slash: string, name: string, attrSource: string) => {
    const attrs: Record<string, string> = {};
    for (const match of attrSource.matchAll(ATTR)) {
      const key = (match[1] as string).toLowerCase();
      attrs[key] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
    }
    tags.push({ name: name.toLowerCase(), closing: slash === "/", attrs, raw });
    return "\u0001";
  });
  return { tags, text };
}

/** Every element the renderer is allowed to emit. No script, style, form, svg, object, embed, base, meta, or link. */
export const ALLOWED_TAGS = new Set([
  "a", "article", "aside", "br", "div", "em", "figcaption", "figure", "footer", "h1", "h2", "h3",
  "header", "iframe", "img", "li", "nav", "ol", "p", "section", "span", "strong", "table", "tbody",
  "td", "th", "thead", "tr", "ul", "time", "audio", "source", "dl", "dt", "dd", "small", "b", "i", "main", "h4",
]);

const ALLOWED_ATTRS = new Set([
  "class", "id", "href", "rel", "src", "alt", "aria-label", "role", "title", "loading", "allowfullscreen",
  "referrerpolicy", "sandbox", "controls", "preload", "datetime", "colspan", "scope", "width", "height", "type", "download",
]);

const EMBED_SRC = /^https:\/\/(?:www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}|player\.vimeo\.com\/video\/\d+)(?:\?[A-Za-z0-9_=&.-]*)?$/;
const SITE_PATH = /^\/(?!\/)[A-Za-z0-9/._~%?=&#-]*$/;

/** A URL the renderer may put in `href`. Absolute links must be http(s), `mailto:` is allowed, and anything else is a failure. */
export function isAllowedHrefValue(value: string): boolean {
  if (value === "#") return true;
  if (SITE_PATH.test(value) && !value.includes("..")) return true;
  return /^https?:\/\/[^\s\\<>"'`]+$/i.test(value) && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
}

export function isAllowedSrcValue(tag: string, value: string): boolean {
  if (tag === "iframe") return EMBED_SRC.test(value);
  if (SITE_PATH.test(value) && !value.includes("..")) return true;
  if (/^https:\/\/[^\s\\<>"'`]+$/i.test(value)) return true;
  return /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/=]*$/.test(value);
}

/**
 * Parse generated HTML with a small independent scanner and assert it is exactly the inert
 * subset Twilda emits. This is deliberately not the code under test: it knows nothing about escapeHtml.
 */
export function assertInertMarkup(html: string, label = "markup"): Tag[] {
  const { tags, text } = scanTags(html.replace(/<!doctype html>/i, ""));
  const stripped = text.replace(/<!--[\s\S]*?-->/g, "");
  assert.ok(!/[<>]/.test(stripped), `${label}: stray angle bracket in text: ${JSON.stringify(stripped.match(/.{0,30}[<>].{0,30}/)?.[0])}`);
  for (const tag of tags) {
    assert.ok(ALLOWED_TAGS.has(tag.name), `${label}: element <${tag.name}> is not allowed (${tag.raw.slice(0, 80)})`);
    if (tag.closing) continue;
    for (const [key, value] of Object.entries(tag.attrs)) {
      assert.ok(!key.startsWith("on"), `${label}: event handler ${key} on <${tag.name}>`);
      assert.ok(key.startsWith("data-twilda-") || ALLOWED_ATTRS.has(key), `${label}: attribute ${key} is not allowed on <${tag.name}>`);
      if (key === "href") assert.ok(isAllowedHrefValue(value), `${label}: href ${JSON.stringify(value)} is not allowed`);
      if (key === "src") assert.ok(isAllowedSrcValue(tag.name, value), `${label}: src ${JSON.stringify(value)} is not allowed on <${tag.name}>`);
    }
    if (tag.name === "a" && /^https?:/i.test(tag.attrs.href ?? "")) {
      assert.match(tag.attrs.rel ?? "", /noopener/, `${label}: external link without rel=noopener`);
    }
  }
  return tags;
}

/** Every string leaf in a value, with the path that reaches it. */
export function stringLeaves(value: unknown, trail: Array<string | number> = []): Array<{ path: Array<string | number>; value: string }> {
  if (typeof value === "string") return [{ path: trail, value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => stringLeaves(item, [...trail, index]));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => stringLeaves(item, [...trail, key]));
  }
  return [];
}

export function withLeaf<T>(doc: T, trail: Array<string | number>, value: string): T {
  const copy = structuredClone(doc) as Record<string | number, unknown>;
  let cursor: Record<string | number, unknown> = copy;
  for (const key of trail.slice(0, -1)) cursor = cursor[key] as Record<string | number, unknown>;
  cursor[trail[trail.length - 1] as string | number] = value;
  return copy as T;
}

/** Fields the renderer branches on. A payload there is a validation matter, not an output-encoding one. */
export const STRUCTURAL_KEYS = new Set(["kind", "type", "level", "role", "status", "updatedAt"]);

export const RICH_ARTICLE: TwildaDocument = documentSchema.parse({
  ...HOSTILE_ARTICLE,
  blocks: [
    ...(HOSTILE_ARTICLE as { blocks: unknown[] }).blocks,
    { id: "em3", type: "embed", kind: "video", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", title: "YouTube clip", caption: "Cap" },
    { id: "em4", type: "embed", kind: "video", src: "https://player.vimeo.com/video/76979871", title: "Vimeo clip", caption: "" },
  ],
});

export const RICH_PAGE: TwildaDocument = HOSTILE_PAGE;

export const SAMPLE_CSV = new Map<string, string>([["content/data/chart.csv", "Year,Count\n2025,3\n2026,4\n"]]);
