export type AtlasKind = "person" | "place" | "work" | "idea" | "event" | "deity" | "dynasty" | "concept";

export type AtlasRelation =
  | "born_in"
  | "lived_in"
  | "visited"
  | "created"
  | "housed_at"
  | "exhibited_at"
  | "near"
  | "partner_of"
  | "influenced_by"
  | "related"
  | "moved_to"
  | "valued_among"
  | "parent_of"
  | "child_of"
  | "sibling_of"
  | "spouse_of"
  | "ruled"
  | "descends_from"
  | "speaks"
  | "writes_in"
  | "member_of";

export interface AtlasCoords {
  lat: number;
  lng: number;
}

export interface AtlasProvenance {
  year: number;
  placeId: string;
  note: string;
}

export interface AtlasEntity {
  id: string;
  kind: AtlasKind;
  name: string;
  summary: string;
  description: string;
  /** Birth / start year */
  startYear?: number;
  /** Death / end year */
  endYear?: number;
  /** Primary coordinates (for places, or current location of a work) */
  coords?: AtlasCoords;
  tags: string[];
  /** Soft ranking among a peer set (1 = highest in set) */
  rank?: number;
  peerSet?: string;
  valueNote?: string;
  provenance?: AtlasProvenance[];
  /** Optional portrait for map callouts (people) */
  portraitUrl?: string;
  /** Short label on callout (defaults to name) */
  calloutLabel?: string;
  aliases?: string[];
}

export interface AtlasLink {
  id: string;
  from: string;
  to: string;
  rel: AtlasRelation;
  year?: number;
  yearEnd?: number;
  note?: string;
}

/** A curated map snapshot — “who was near” in one place and year. */
export interface AtlasScene {
  id: string;
  title: string;
  subtitle: string;
  year: number;
  center: AtlasCoords;
  zoom: number;
  /** Badge text e.g. "Vienna 1913" */
  badge: string;
  /** Person (and optional place) ids shown as callouts */
  calloutIds: string[];
  /** Default focused entity when opening the scene */
  focusId: string;
}

export const RELATION_LABELS: Record<AtlasRelation, string> = {
  born_in: "Born in",
  lived_in: "Lived in",
  visited: "Visited",
  created: "Created",
  housed_at: "Housed at",
  exhibited_at: "Exhibited at",
  near: "Near",
  partner_of: "Partner of",
  influenced_by: "Influenced by",
  related: "Related",
  moved_to: "Moved to",
  valued_among: "Valued among",
  parent_of: "Parent of",
  child_of: "Child of",
  sibling_of: "Sibling of",
  spouse_of: "Spouse of",
  ruled: "Ruled",
  descends_from: "Descends from",
  speaks: "Speaks",
  writes_in: "Writes in",
  member_of: "Member of",
};
