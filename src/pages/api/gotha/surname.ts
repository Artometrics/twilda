import type { APIRoute } from "astro";
import { lookupSurname } from "@/lib/gotha/surname-lookup";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const limited = checkRateLimit(`surname:${locals.user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) return rateLimitResponse(limited);

  const surname = url.searchParams.get("name");
  if (!surname?.trim()) {
    return new Response(JSON.stringify({ error: "name required" }), { status: 400 });
  }

  const info = await lookupSurname(surname.trim());
  return new Response(JSON.stringify(info), {
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Remaining": String(limited.remaining),
    },
  });
};
