import { createServerClient, createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import type { Database } from "./database.types";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.PUBLIC_SUPABASE_URL &&
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );
}

function getSupabaseUrl(): string {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing PUBLIC_SUPABASE_URL");
  return url;
}

function getSupabaseAnonKey(): string {
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

/** Cookie-backed server client for middleware, pages, and API routes. */
export function cookiesSupported(cookies: AstroCookies): boolean {
  return typeof cookies.getAll === "function";
}

function parseCookieHeader(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  const parsed: { name: string; value: string }[] = [];

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq);
    const rawValue = trimmed.slice(eq + 1);
    try {
      parsed.push({ name, value: decodeURIComponent(rawValue) });
    } catch {
      parsed.push({ name, value: rawValue });
    }
  }

  return parsed;
}

function readCookies(cookies: AstroCookies, request?: Request): { name: string; value: string }[] {
  if (cookiesSupported(cookies)) {
    return cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
  }
  return parseCookieHeader(request?.headers.get("cookie") ?? null);
}

/** Cookie-backed server client for middleware, pages, and API routes. */
export function createSupabaseServerClient(cookies: AstroCookies, request?: Request) {
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return readCookies(cookies, request);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (typeof cookies.set === "function") {
            cookies.set(name, value, options);
          }
        });
      },
    },
  });
}

/** Browser client with cookie session sync. */
export function createSupabaseBrowserClient() {
  return createSSRBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
