import type { APIRoute } from "astro";
import { themeCss } from "@twilda/core";
import { readSite } from "../content/site";

export const GET: APIRoute = () =>
  new Response(themeCss(readSite().theme), { headers: { "Content-Type": "text/css; charset=utf-8" } });
