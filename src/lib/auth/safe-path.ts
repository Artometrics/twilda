/**
 * Allow only same-origin relative paths.
 * Rejects protocol-relative (`//evil.com`), backslash tricks, and absolute URLs.
 * Safe for browser + server bundles (no SSR imports).
 */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//") || path.startsWith("/\\")) return false;
  if (path.includes("://")) return false;
  if (/[\0\r\n]/.test(path)) return false;
  return true;
}
