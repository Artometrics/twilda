import type { APIRoute } from "astro";
import { searchIndex, timelineMarks } from "@/lib/atlas/focus-payload";

export const prerender = false;

/** Lazy Atlas catalog for client search + timeline scrubber. */
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  return new Response(
    JSON.stringify({
      search: searchIndex(),
      timeline: timelineMarks(),
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300",
      },
    },
  );
};
