export type AtlasKind = "person" | "place" | "work" | "idea" | "event";

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
  | "valued_among";

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
};
