import type { APIRoute, GetStaticPaths } from "astro";
import { FORMS_CLIENT_JS } from "@twilda/core";
import { loadSite } from "twilda:content";

// The one script a form page loads. It is built only when content/site.json has a "forms" setting,
// so a site with no form ships no script at all.
export const getStaticPaths: GetStaticPaths = () => (loadSite().forms ? [{ params: { asset: "twilda-forms" } }] : []);

export const GET: APIRoute = () =>
  new Response(FORMS_CLIENT_JS, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
