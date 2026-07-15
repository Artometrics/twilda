import type { APIRoute } from "astro";
import { lookupSurname } from "@/lib/gotha/surname-lookup";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const surname = url.searchParams.get("name");
  if (!surname?.trim()) {
    return new Response(JSON.stringify({ error: "name required" }), { status: 400 });
  }

  const info = await lookupSurname(surname.trim());
  return new Response(JSON.stringify(info), { headers: { "Content-Type": "application/json" } });
};
