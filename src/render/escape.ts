const MEDIA_PATH = /^\/media\/[a-z0-9-]+\.svg$/;
const HREF_PATH = /^\/(?!\/)[a-zA-Z0-9/._~-]*$/;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Only repo media plates. Anything else becomes an empty plate. */
export function safeMedia(src: string): string | null {
  return MEDIA_PATH.test(src) ? src : null;
}

/** Site-relative paths only. Rejects protocols, protocol-relative URLs, and queries. */
export function safeHref(href: string): string {
  const trimmed = href.trim();
  if (trimmed === "/") return "/";
  if (!HREF_PATH.test(trimmed)) return "#";
  return trimmed;
}
