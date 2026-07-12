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

/** Cookie-backed server client for middleware, pages, and API routes. */
export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        if (!cookiesSupported(cookies)) return [];
        return cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookiesToSet) {
        if (!cookiesSupported(cookies)) return;
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}

/** Browser client with cookie session sync. */
export function createSupabaseBrowserClient() {
  return createSSRBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
