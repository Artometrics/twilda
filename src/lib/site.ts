import { createClient } from "@supabase/supabase-js";

/** Canonical public site origin (no trailing slash). */
export function getSiteUrl(): string {
  const raw = import.meta.env.PUBLIC_SITE_URL?.trim();
  // Prefer configured env; fall back to local/dev so builds never emit broken canonicals.
  const site = raw && raw.length > 0 ? raw : "http://localhost:4321";
  return site.replace(/\/$/, "");
}

/** True when public Supabase env vars are present (does not validate keys). */
export function hasPublicSupabaseEnv(): boolean {
  return Boolean(
    import.meta.env.PUBLIC_SUPABASE_URL &&
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Lightweight connectivity check for health endpoints.
 * Does not expose secrets; returns ok=false when misconfigured.
 */
export async function pingSupabase(): Promise<{
  configured: boolean;
  reachable: boolean;
  error?: string;
}> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { configured: false, reachable: false, error: "missing_env" };
  }

  try {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.auth.getSession();
    if (error) {
      return { configured: true, reachable: false, error: error.message };
    }
    return { configured: true, reachable: true };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}
