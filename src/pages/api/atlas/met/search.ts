import type { APIRoute } from "astro";
import { metSearch } from "@/lib/atlas/enrich";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export const prerender = false;

/** Met Museum public-domain search — ?q= (up to 12 object details). */
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const limited = checkRateLimit(`met-search:${locals.user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) return rateLimitResponse(limited);

  const q = url.searchParams.get("q")?.trim();
  if (!q) {
    return new Response(JSON.stringify({ error: "Provide ?q=" }), { status: 400 });
  }

  try {
    const results = await metSearch(q, 12);
    return new Response(JSON.stringify(results), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300",
        "X-RateLimit-Remaining": String(limited.remaining),
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 502 });
  }
};
