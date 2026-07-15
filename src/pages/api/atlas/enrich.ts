import type { APIRoute } from "astro";
import { enrichFromWikidata } from "@/lib/atlas/enrich";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export const prerender = false;

/** Wikidata enrich — ?qid=QID or ?q=search. Auth required (matches /api/atlas/state). */
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const limited = checkRateLimit(`enrich:${locals.user.id}`, { limit: 40, windowMs: 60_000 });
  if (!limited.ok) return rateLimitResponse(limited);

  const qid = url.searchParams.get("qid");
  const q = url.searchParams.get("q");
  if (!qid && !q) {
    return new Response(JSON.stringify({ error: "Provide ?qid= or ?q=" }), { status: 400 });
  }

  try {
    const result = await enrichFromWikidata({ qid, q });
    if (result == null) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    return new Response(JSON.stringify(result), {
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
