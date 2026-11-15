import type { APIRoute } from "astro";
import { loadSite, themeCss } from "twilda:content";

export const GET: APIRoute = () =>
  new Response(themeCss(loadSite().theme), { headers: { "Content-Type": "text/css; charset=utf-8" } });
