import type { APIRoute } from "astro";
import { enrichFromWikidata } from "@/lib/atlas/enrich";

export const prerender = false;

/** Wikidata enrich — ?qid=QID or ?q=search. Auth required (matches /api/atlas/state). */
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

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
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 502 });
  }
};
