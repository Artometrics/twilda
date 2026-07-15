import type { APIRoute } from "astro";
import { metObject } from "@/lib/atlas/enrich";

export const prerender = false;

/** Met Museum single object — /api/atlas/met/:id */
export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

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
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 502 });
  }
};
