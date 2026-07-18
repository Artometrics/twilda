import type { APIRoute } from "astro";
import { hasPublicSupabaseEnv, pingSupabase } from "@/lib/site";
import { createServerClient } from "@/lib/supabase/server";

export const prerender = false;

type DeepCheck = {
  novels?: "ok" | "missing" | "error";
  warning?: string;
  error?: string;
};

async function deepProbe(): Promise<DeepCheck> {
  const serviceRole = Boolean(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceRole) {
    return {
      warning: "SUPABASE_SERVICE_ROLE_KEY unset — skipped novels probe",
    };
  }

  try {
    const admin = createServerClient({ useServiceRole: true });
    const { error } = await admin.from("novels").select("id").limit(1);
    if (error) {
      const msg = error.message || "query_failed";
      if (/does not exist|schema cache|relation/i.test(msg)) {
        return { novels: "missing", error: msg };
      }
      return { novels: "error", error: msg };
    }
    return { novels: "ok" };
  } catch (err) {
    return {
      novels: "error",
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
  const deepFailed =
    deep &&
    deepCheck != null &&
    (deepCheck.novels === "missing" || deepCheck.novels === "error");

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
