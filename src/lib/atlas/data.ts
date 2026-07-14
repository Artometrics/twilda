import { fridaEntities, fridaLinks } from "@/lib/atlas/seed-frida";
import type { AtlasEntity, AtlasKind, AtlasLink } from "@/lib/atlas/types";
import { RELATION_LABELS } from "@/lib/atlas/types";

export const atlasEntities: AtlasEntity[] = [...fridaEntities];
export const atlasLinks: AtlasLink[] = [...fridaLinks];

const byId = Object.fromEntries(atlasEntities.map((e) => [e.id, e]));

export function getEntity(id: string): AtlasEntity | undefined {
  return byId[id];
}

export function linksFor(id: string): AtlasLink[] {
  return atlasLinks.filter((l) => l.from === id || l.to === id);
}

export function relatedEntities(id: string): { link: AtlasLink; entity: AtlasEntity; direction: "out" | "in" }[] {
  const out: { link: AtlasLink; entity: AtlasEntity; direction: "out" | "in" }[] = [];
  for (const link of linksFor(id)) {
    const otherId = link.from === id ? link.to : link.from;
    const entity = byId[otherId];
    if (!entity) continue;
    out.push({ link, entity, direction: link.from === id ? "out" : "in" });
  }
  return out;
}

/** Map pins to highlight when focusing an entity. */
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
    if (entity.coords) {
      add(entity, RELATION_LABELS[link.rel]);
    }
    // If linked to a work, also pin the work's house
    if (entity.kind === "work" && entity.coords) {
      add(entity, "Work");
    }
  }

  // Provenance places for works
  if (focus.provenance) {
    for (const p of focus.provenance) {
      add(byId[p.placeId], `${p.year}: ${p.note}`);
    }
  }

  return pins;
}

export function timelineBounds(entities = atlasEntities): { min: number; max: number } {
  let min = 1900;
  let max = 1960;
  for (const e of entities) {
    if (e.startYear != null) min = Math.min(min, e.startYear);
    if (e.endYear != null) max = Math.max(max, e.endYear);
    if (e.startYear != null && e.endYear == null) max = Math.max(max, e.startYear);
  }
  return { min: min - 5, max: max + 5 };
}

export function entitiesInYearRange(
  from: number,
  to: number,
  entities = atlasEntities,
): AtlasEntity[] {
  return entities.filter((e) => {
    const start = e.startYear ?? e.endYear;
    const end = e.endYear ?? e.startYear;
    if (start == null) return e.kind === "place" || e.kind === "idea";
    return start <= to && (end ?? start) >= from;
  });
}

export function peerRanking(entityId: string): AtlasEntity[] {
  const e = byId[entityId];
  if (!e?.peerSet) return [];
  return atlasEntities
    .filter((x) => x.peerSet === e.peerSet && x.rank != null)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}

export function searchEntities(query: string): AtlasEntity[] {
  const q = query.trim().toLowerCase();
  if (!q) return atlasEntities;
  return atlasEntities.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      e.tags.some((t) => t.includes(q)) ||
      e.aliases?.some((a) => a.toLowerCase().includes(q)),
  );
}

export function countByKind(): Record<AtlasKind, number> {
  const counts: Record<AtlasKind, number> = {
    person: 0,
    place: 0,
    work: 0,
    idea: 0,
    event: 0,
  };
  for (const e of atlasEntities) counts[e.kind]++;
  return counts;
}

export { RELATION_LABELS };
