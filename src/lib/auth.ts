import { getSiteUrl } from "@/lib/site";

const DEFAULT_AFTER_AUTH = "/novels/";

/** Allowed post-login redirect paths (open redirect guard). */
const ALLOWED_REDIRECTS = new Set([
  "/novels/",
  "/novels",
  "/forms/login",
  "/forms/signup",
  "/account/",
  "/account",
]);

/** Supabase email confirmation / password reset callback URL. */
export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}

/** Resolve a safe redirect target from query params or fall back to novels. */
export function getSafeRedirect(next: string | null | undefined): string {
  if (!next) return DEFAULT_AFTER_AUTH;

  let path = next;
  try {
    const parsed = new URL(next, getSiteUrl());
    path = `${parsed.pathname}${parsed.search}`;
  } catch {
    path = next;
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_AFTER_AUTH;
  }

  const normalized = path.endsWith("/") && path.length > 1 ? path : path;
  if (ALLOWED_REDIRECTS.has(normalized) || ALLOWED_REDIRECTS.has(`${normalized}/`)) {
    return normalized.endsWith("/") ? normalized : `${normalized}/`;
  }

  if (normalized.startsWith("/novels/")) {
    return normalized;
  }

  return DEFAULT_AFTER_AUTH;
}
