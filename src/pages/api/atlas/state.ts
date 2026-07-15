import type { APIRoute } from "astro";
import { getEntity, getScene, atlasScenes } from "@/lib/atlas/data";
import { focusCardPayload, scenePayload } from "@/lib/atlas/focus-payload";

export const prerender = false;

/** Soft-nav payloads for Atlas — keeps the map mounted while the card/scene update. */
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const sceneId = url.searchParams.get("scene") ?? atlasScenes[0].id;
  const entityId = url.searchParams.get("e");
  const mode = url.searchParams.get("mode") ?? (entityId && !url.searchParams.has("scene") ? "focus" : "scene");

  // mode=focus → card only; mode=scene → callouts + card (+ optional e)
  if (mode === "focus" && entityId) {
    if (!getEntity(entityId)) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    return new Response(JSON.stringify({ card: focusCardPayload(entityId) }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (!getScene(sceneId) && sceneId !== atlasScenes[0].id) {
    return new Response(JSON.stringify({ error: "Unknown scene" }), { status: 404 });
  }

  const payload = scenePayload(sceneId, entityId);
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
};
