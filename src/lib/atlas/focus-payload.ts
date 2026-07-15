import {
  atlasEntities,
  atlasScenes,
  countByKind,
  focusPins,
  getEntity,
  getScene,
  peerRanking,
  relatedEntities,
  sceneCallouts,
  timelineBounds,
  RELATION_LABELS,
} from "@/lib/atlas/data";
import type { AtlasEntity } from "@/lib/atlas/types";

export function yearsLabel(e: AtlasEntity): string {
  if (e.startYear != null && e.endYear != null) return `${e.startYear}–${e.endYear}`;
  if (e.startYear != null) return e.startYear < 0 ? `${Math.abs(e.startYear)} BCE` : String(e.startYear);
  return "";
}

/** Prefer a scene that lists the entity as a callout or focus. */
export function sceneForEntity(entityId: string): string | null {
  const hit = atlasScenes.find(
    (s) => s.focusId === entityId || s.calloutIds.includes(entityId),
  );
  return hit?.id ?? null;
}

/** Compact catalog for client search + timeline (no long descriptions). */
export function searchIndex() {
  return atlasEntities.map((e) => ({
    id: e.id,
    kind: e.kind,
    name: e.name,
    startYear: e.startYear ?? null,
    endYear: e.endYear ?? null,
    haystack: `${e.name} ${e.summary} ${e.tags.join(" ")} ${(e.aliases ?? []).join(" ")}`.toLowerCase(),
  }));
}

export function timelineMarks() {
  return atlasEntities
    .filter(
      (e) =>
        e.startYear != null &&
        (e.kind === "person" ||
          e.kind === "deity" ||
          e.kind === "event" ||
          e.kind === "work" ||
          e.kind === "dynasty" ||
          e.kind === "idea"),
    )
    .map((e) => ({
      id: e.id,
      kind: e.kind,
      name: e.name,
      startYear: e.startYear as number,
      endYear: e.endYear ?? null,
    }));
}

function serializePinEntity(c: AtlasEntity, extra: Record<string, unknown> = {}) {
  return {
    id: c.id,
    kind: c.kind,
    name: c.name,
    calloutLabel: c.calloutLabel ?? c.name,
    portraitUrl: c.portraitUrl ?? null,
    coords: c.coords ?? null,
    startYear: c.startYear ?? null,
    endYear: c.endYear ?? null,
    ...extra,
  };
}

export function serializeCallouts(sceneId: string) {
  const scene = getScene(sceneId) ?? atlasScenes[0];
  return sceneCallouts(scene).map((c) => serializePinEntity(c));
}

/** Pins for a focused entity — used on soft-nav and museum deep-links. */
export function serializeFocusPins(entityId: string) {
  return focusPins(entityId).map(({ entity, role }) => serializePinEntity(entity, { role }));
}

export function focusCardPayload(entityId: string) {
  const focus = getEntity(entityId) ?? getEntity(atlasScenes[0].focusId)!;
  const related = relatedEntities(focus.id);
  const peers = peerRanking(focus.id);
  const counts = countByKind();
  const totalKinds = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    focus: {
      id: focus.id,
      kind: focus.kind,
      name: focus.name,
      summary: focus.summary,
      description: focus.description || null,
      years: yearsLabel(focus),
      tags: focus.tags,
      portraitUrl: focus.portraitUrl ?? null,
      sourceUrl: focus.sourceUrl ?? null,
      license: focus.license ?? null,
      attribution: focus.attribution ?? null,
      imageCredit: focus.imageCredit ?? null,
      wikidataId: focus.wikidataId ?? null,
      metObjectId: focus.metObjectId ?? null,
      provenance: (focus.provenance ?? []).map((p) => ({
        year: p.year,
        placeId: p.placeId,
        placeName: getEntity(p.placeId)?.name ?? p.placeId,
        note: p.note,
      })),
    },
    peers: peers.map((p) => ({ id: p.id, name: p.name, rank: p.rank })),
    related: related.slice(0, 10).map(({ link, entity, direction }) => ({
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      meta:
        (direction === "out" ? RELATION_LABELS[link.rel] : `← ${RELATION_LABELS[link.rel]}`) +
        (link.year != null
          ? ` · ${link.year < 0 ? Math.abs(link.year) + " BCE" : link.year}${link.yearEnd ? `–${link.yearEnd}` : ""}`
          : ""),
      note: link.note ?? null,
    })),
    hint: `${totalKinds} entries across ${Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${v} ${k}s`)
      .join(", ")}.`,
  };
}

export function scenePayload(sceneId: string, focusId?: string | null) {
  const scene = getScene(sceneId) ?? atlasScenes[0];
  const focus = getEntity(focusId || "") ?? getEntity(scene.focusId)!;
  return {
    scene: {
      id: scene.id,
      badge: scene.badge,
      year: scene.year,
      center: scene.center,
      zoom: scene.zoom,
    },
    callouts: serializeCallouts(scene.id),
    pins: serializeFocusPins(focus.id),
    card: focusCardPayload(focus.id),
    bounds: timelineBounds(),
  };
}
