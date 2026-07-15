import type { APIRoute } from "astro";
import { wikipediaSummary } from "@/lib/atlas/enrich";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export const prerender = false;

/** Wikipedia page summary — ?title= */
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const limited = checkRateLimit(`wiki:${locals.user.id}`, { limit: 40, windowMs: 60_000 });
  if (!limited.ok) return rateLimitResponse(limited);

  const title = url.searchParams.get("title")?.trim();
  if (!title) {
    return new Response(JSON.stringify({ error: "Provide ?title=" }), { status: 400 });
  }

  try {
    const result = await wikipediaSummary(title);
    if (!result) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=600",
        "X-RateLimit-Remaining": String(limited.remaining),
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 502 });
  }
};
