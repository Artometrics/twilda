/**
 * What a file in `public/media/` may be. Images are served from the site's own origin,
 * so a file that is also a script or a web page (an SVG with a handler, a JPEG with
 * markup after its header) is a way to run code there. Two layers cover it:
 * the response headers (`nosniff`, a CSP with `script-src 'none'` on the site) and these checks,
 * which refuse such a file before it is committed or merged.
 */

export type ImageKind = "jpeg" | "png" | "webp" | "gif";

/** What the bytes are, from their first bytes and not from the file name or the declared type. */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  const at = (i: number) => bytes[i] ?? -1;
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "jpeg";
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 && at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) return "png";
  if (at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38) return "gif";
  if (at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) return "webp";
  return null;
}

export const MEDIA_FILE_NAME = /^[a-z0-9][a-z0-9-]{0,78}\.(?:svg|jpg|png|webp|gif)$/;

const KIND_OF_EXTENSION: Record<string, ImageKind> = { jpg: "jpeg", png: "png", webp: "webp", gif: "gif" };

/** Markup or script that has no place inside a raster image's bytes. */
const ACTIVE_CONTENT = /<\s*(?:script|svg|html|iframe|object|embed|foreignobject|body|meta|link|style)\b|javascript\s*:|<\?php|\bon[a-z]{3,20}\s*=\s*["']/i;

export const MAX_RASTER_BYTES = 1_000_000;

/** Latin-1 view of the bytes, so a text search never throws on binary data. */
function latin1(bytes: Uint8Array): string {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return out;
}

/** True when a raster file carries markup or script after its header: the signature of a polyglot. */
export function containsActiveContent(bytes: Uint8Array): boolean {
  return ACTIVE_CONTENT.test(latin1(bytes));
}

/**
 * Check bytes that are about to be committed as `public/media/<name>`. Returns a message
 * a person can act on, or null when the file is acceptable. SVG is never accepted from a
 * device: it is a document, not a picture, and goes in through code review.
 */
export function inspectUpload(name: string, bytes: Uint8Array): string | null {
  if (!MEDIA_FILE_NAME.test(name)) return `${name}: the file name is not allowed.`;
  const extension = name.slice(name.lastIndexOf(".") + 1);
  if (extension === "svg") return `${name}: SVG cannot be uploaded from the editor. Add it to public/media in a reviewed pull request.`;
  if (bytes.length === 0) return `${name}: the file is empty.`;
  if (bytes.length > MAX_RASTER_BYTES) return `${name}: the file is larger than ${MAX_RASTER_BYTES} bytes.`;
  const kind = sniffImage(bytes);
  if (!kind) return `${name}: the bytes are not a JPEG, PNG, WEBP, or GIF image.`;
  if (KIND_OF_EXTENSION[extension] !== kind) return `${name}: the bytes are a ${kind.toUpperCase()} image, not a .${extension} file.`;
  if (containsActiveContent(bytes)) return `${name}: the image contains markup or script. Re-save it as a plain image.`;
  return null;
}

const SVG_PROBLEMS: Array<[RegExp, string]> = [
  [/<\s*script\b/i, "contains a <script> element"],
  [/\bon[a-z]{3,20}\s*=/i, "contains an event-handler attribute"],
  [/javascript\s*:/i, "contains a javascript: URL"],
  [/data\s*:\s*text\/html/i, "contains a data:text/html URL"],
  [/<\s*(?:foreignobject|iframe|embed|object|audio|video|animate|set|handler|listener)\b/i, "contains an element that can run or embed active content"],
  [/<!\s*(?:doctype|entity)/i, "declares a DOCTYPE or ENTITY, which can load external data"],
  [/<\?xml-stylesheet/i, "links an external stylesheet"],
  [/@import\b/i, "imports a stylesheet"],
  [/\b(?:xlink:)?href\s*=\s*["']\s*(?!#)[^"']/i, "references something outside the file"],
  [/url\(\s*["']?\s*(?!#)(?:https?:|\/\/|data:)/i, "loads an image or font from outside the file"],
];

/** Problems that make an SVG unsafe to serve from the site's origin. Empty means clean. */
export function auditSvg(text: string): string[] {
  const problems: string[] = [];
  if (!/^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b/i.test(text)) problems.push("does not start with an <svg> element");
  for (const [pattern, message] of SVG_PROBLEMS) if (pattern.test(text)) problems.push(message);
  return problems;
}
