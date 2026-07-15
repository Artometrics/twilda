/** Demo genealogy for first-run GOTHA — Habsburg-adjacent sample with map pins. */
export type SamplePerson = {
  key: string;
  name: string;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  birth_place: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  death_year: number | null;
  family_name: string | null;
  is_self: boolean;
  notes: string | null;
  /** Atlas TypeScript seed id (e.g. "franz-joseph"), not a DB uuid. */
  atlas_seed_id: string | null;
};

export type SampleRelation = {
  from: string;
  to: string;
  rel: "parent" | "partner" | "sibling" | "child" | "other";
};

export const SAMPLE_FAMILY_PERSONS: SamplePerson[] = [
  {
    key: "franz-joseph",
    name: "Franz Joseph I",
    birth_year: 1830,
    birth_month: 8,
    birth_day: 18,
    birth_place: "Schönbrunn, Vienna",
    birth_lat: 48.1845,
    birth_lng: 16.3122,
    death_year: 1916,
    family_name: "Habsburg",
    is_self: false,
    notes: "Emperor of Austria — sample Almanach-style entry linked to Atlas.",
    atlas_seed_id: "franz-joseph",
  },
  {
    key: "elisabeth",
    name: "Elisabeth of Bavaria (Sisi)",
    birth_year: 1837,
    birth_month: 12,
    birth_day: 24,
    birth_place: "Munich",
    birth_lat: 48.1374,
    birth_lng: 11.5755,
    death_year: 1898,
    family_name: "Wittelsbach",
    is_self: false,
    notes: "Empress consort; restless traveler across the Habsburg lands.",
    atlas_seed_id: null,
  },
  {
    key: "rudolf",
    name: "Rudolf, Crown Prince",
    birth_year: 1858,
    birth_month: 8,
    birth_day: 21,
    birth_place: "Laxenburg",
    birth_lat: 48.0686,
    birth_lng: 16.3564,
    death_year: 1889,
    family_name: "Habsburg",
    is_self: false,
    notes: "Only son of Franz Joseph and Elisabeth.",
    atlas_seed_id: null,
  },
  {
    key: "gisela",
    name: "Gisela of Austria",
    birth_year: 1856,
    birth_month: 7,
    birth_day: 12,
    birth_place: "Laxenburg",
    birth_lat: 48.0686,
    birth_lng: 16.3564,
    death_year: 1932,
    family_name: "Habsburg",
    is_self: false,
    notes: "Second daughter; later lived in Munich.",
    atlas_seed_id: null,
  },
  {
    key: "you",
    name: "You (sample explorer)",
    birth_year: 1990,
    birth_month: 6,
    birth_day: 15,
    birth_place: "Vienna",
    birth_lat: 48.2082,
    birth_lng: 16.3738,
    death_year: null,
    family_name: null,
    is_self: true,
    notes: "Placeholder for your own entry. Edit or delete and rebuild your tree.",
    atlas_seed_id: null,
  },
];

/** from = parent/partner/sibling source; to = child/partner target (parent: from→to means from is parent of to). */
export const SAMPLE_FAMILY_RELATIONS: SampleRelation[] = [
  { from: "franz-joseph", to: "elisabeth", rel: "partner" },
  { from: "franz-joseph", to: "rudolf", rel: "parent" },
  { from: "elisabeth", to: "rudolf", rel: "parent" },
  { from: "franz-joseph", to: "gisela", rel: "parent" },
  { from: "elisabeth", to: "gisela", rel: "parent" },
  { from: "rudolf", to: "gisela", rel: "sibling" },
];
