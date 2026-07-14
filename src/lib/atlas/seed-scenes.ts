import type { AtlasEntity, AtlasLink, AtlasScene } from "@/lib/atlas/types";

/**
 * Mexico City ~1939 — Kahlo/Rivera “who was near” domestic orbit.
 */
export const fridaMexicoScene: AtlasScene = {
  id: "mexico-1939",
  title: "Mexico City 1939",
  subtitle: "Casa Azul and the modernists nearby",
  year: 1939,
  center: { lat: 19.38, lng: -99.17 },
  zoom: 12,
  badge: "Mexico City 1939",
  calloutIds: ["frida-kahlo", "diego-rivera", "casa-azul", "museo-arte-moderno"],
  focusId: "frida-kahlo",
};
