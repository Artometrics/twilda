import type { APIRoute } from "astro";
import { hasPublicSupabaseEnv, pingSupabase } from "@/lib/site";
import { createServerClient } from "@/lib/supabase/server";

export const prerender = false;

type DeepCheck = {
  atlas_collections?: "ok" | "missing" | "error";
  warning?: string;
  error?: string;
};

async function deepProbe(): Promise<DeepCheck> {
  const serviceRole = Boolean(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceRole) {
    return {
      warning: "SUPABASE_SERVICE_ROLE_KEY unset — skipped atlas_collections probe",
    };
  }

  try {
    const admin = createServerClient({ useServiceRole: true });
    const { error } = await admin.from("atlas_collections").select("id").limit(1);
    if (error) {
      const msg = error.message || "query_failed";
      // Missing relation → migrations not applied
      if (/does not exist|schema cache|relation/i.test(msg)) {
        return { atlas_collections: "missing", error: msg };
      }
      return { atlas_collections: "error", error: msg };
    }
    return { atlas_collections: "ok" };
  } catch (err) {
    return {
      atlas_collections: "error",
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}

export const GET: APIRoute = async ({ url }) => {
  const deep = url.searchParams.get("deep") === "1";
  const supabasePing = await pingSupabase();
  const configured = hasPublicSupabaseEnv();
  const reachable = supabasePing.reachable;

  let deepCheck: DeepCheck | undefined;
  if (deep) {
    deepCheck = await deepProbe();
  }

  const criticalOk = configured && reachable;
  // Deep atlas_collections miss/error fails the probe; missing service role is soft warning only.
  const deepFailed =
    deep &&
    deepCheck != null &&
    (deepCheck.atlas_collections === "missing" || deepCheck.atlas_collections === "error");

  const ok = criticalOk && !deepFailed;
  const status = ok ? 200 : 503;

  const body = {
    ok,
    site: import.meta.env.PUBLIC_SITE_URL || null,
    supabase: {
      configured,
      reachable,
      ...(supabasePing.error ? { error: supabasePing.error } : {}),
    },
    billing: {
      stripe: Boolean(import.meta.env.STRIPE_SECRET_KEY),
      webhook: Boolean(import.meta.env.STRIPE_WEBHOOK_SECRET),
    },
    ...(deepCheck ? { deep: deepCheck } : {}),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
