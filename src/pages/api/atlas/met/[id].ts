import type { APIRoute } from "astro";
import { metObject } from "@/lib/atlas/enrich";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export const prerender = false;

/** Met Museum single object — /api/atlas/met/:id */
export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const limited = checkRateLimit(`met-id:${locals.user.id}`, { limit: 40, windowMs: 60_000 });
  if (!limited.ok) return rateLimitResponse(limited);

  const id = params.id;
  if (!id || !/^\d+$/.test(id)) {
    return new Response(JSON.stringify({ error: "Invalid object id" }), { status: 400 });
  }

  try {
    const result = await metObject(id);
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
