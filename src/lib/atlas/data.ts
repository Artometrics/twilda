import { fridaEntities, fridaLinks } from "@/lib/atlas/seed-frida";
import { viennaEntities, viennaLinks, vienna1913Scene } from "@/lib/atlas/seed-vienna";
import { fridaMexicoScene } from "@/lib/atlas/seed-scenes";
import { monarchyEntities, monarchyLinks, monarchiesScene } from "@/lib/atlas/seed-monarchies";
import { egyptEntities, egyptLinks, egyptScene } from "@/lib/atlas/seed-egypt";
import { languageEntities, languageLinks, languagesScene } from "@/lib/atlas/seed-languages";
import { metEntities, metLinks, metMuseumScene } from "@/lib/atlas/seed-met";
import type { AtlasEntity, AtlasKind, AtlasLink, AtlasScene } from "@/lib/atlas/types";
import { RELATION_LABELS } from "@/lib/atlas/types";

export const atlasEntities: AtlasEntity[] = [
  ...fridaEntities,
  ...viennaEntities,
  ...monarchyEntities,
  ...egyptEntities,
  ...languageEntities,
  ...metEntities,
];

export const atlasLinks: AtlasLink[] = [
  ...fridaLinks,
  ...viennaLinks,
  ...monarchyLinks,
  ...egyptLinks,
  ...languageLinks,
  ...metLinks,
];

export const atlasScenes: AtlasScene[] = [
  vienna1913Scene,
  fridaMexicoScene,
  monarchiesScene,
  egyptScene,
  languagesScene,
  metMuseumScene,
];

const byId = Object.fromEntries(atlasEntities.map((e) => [e.id, e]));

export function getEntity(id: string): AtlasEntity | undefined {
  return byId[id];
}

export function getScene(id: string): AtlasScene | undefined {
  return atlasScenes.find((s) => s.id === id);
}

export function linksFor(id: string): AtlasLink[] {
  return atlasLinks.filter((l) => l.from === id || l.to === id);
}

export function relatedEntities(
  id: string,
): { link: AtlasLink; entity: AtlasEntity; direction: "out" | "in" }[] {
  const out: { link: AtlasLink; entity: AtlasEntity; direction: "out" | "in" }[] = [];
  for (const link of linksFor(id)) {
    const otherId = link.from === id ? link.to : link.from;
    const entity = byId[otherId];
    if (!entity) continue;
    out.push({ link, entity, direction: link.from === id ? "out" : "in" });
  }
  return out;
}

export function focusPins(entityId: string): { entity: AtlasEntity; role: string }[] {
  const focus = byId[entityId];
  if (!focus) return [];

  const pins: { entity: AtlasEntity; role: string }[] = [];
  const seen = new Set<string>();

  const add = (e: AtlasEntity | undefined, role: string) => {
    if (!e?.coords || seen.has(e.id)) return;
    seen.add(e.id);
    pins.push({ entity: e, role });
  };

  if (focus.coords) add(focus, focus.kind === "work" ? "Current location" : "Here");

  for (const { link, entity } of relatedEntities(entityId)) {
    if (entity.coords) add(entity, RELATION_LABELS[link.rel]);
    if (entity.kind === "work" && entity.coords) add(entity, "Work");
  }

  if (focus.provenance) {
    for (const p of focus.provenance) {
      add(byId[p.placeId], `${p.year}: ${p.note}`);
    }
  }

  return pins;
}

export function sceneCallouts(scene: AtlasScene): AtlasEntity[] {
  return scene.calloutIds.map((id) => byId[id]).filter(Boolean) as AtlasEntity[];
}

export function timelineBounds(entities = atlasEntities): { min: number; max: number } {
  let min = -4000;
  let max = 2025;
  for (const e of entities) {
    if (e.startYear != null) min = Math.min(min, e.startYear);
    if (e.endYear != null) max = Math.max(max, e.endYear);
    if (e.startYear != null && e.endYear == null) max = Math.max(max, e.startYear);
  }
  return { min: min - 50, max: max + 25 };
}

export function peerRanking(entityId: string): AtlasEntity[] {
  const e = byId[entityId];
  if (!e?.peerSet) return [];
  return atlasEntities
    .filter((x) => x.peerSet === e.peerSet && x.rank != null)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}

export function countByKind(): Record<AtlasKind, number> {
  const counts: Record<AtlasKind, number> = {
    person: 0, place: 0, work: 0, idea: 0, event: 0,
    deity: 0, dynasty: 0, concept: 0,
  };
  for (const e of atlasEntities) {
    if (e.kind in counts) counts[e.kind]++;
  }
  return counts;
}

export { RELATION_LABELS };
