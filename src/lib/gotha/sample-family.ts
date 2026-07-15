/** Demo genealogy templates for first-run GOTHA. */
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

export type SampleTemplateId = "habsburg" | "immigrant-atlantic" | "mythic-ancestry";

const HABSBURG_PERSONS: SamplePerson[] = [
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

const HABSBURG_RELATIONS: SampleRelation[] = [
  { from: "franz-joseph", to: "elisabeth", rel: "partner" },
  { from: "franz-joseph", to: "rudolf", rel: "parent" },
  { from: "elisabeth", to: "rudolf", rel: "parent" },
  { from: "franz-joseph", to: "gisela", rel: "parent" },
  { from: "elisabeth", to: "gisela", rel: "parent" },
  { from: "rudolf", to: "gisela", rel: "sibling" },
];

const IMMIGRANT_PERSONS: SamplePerson[] = [
  {
    key: "you",
    name: "You (sample explorer)",
    birth_year: 1988,
    birth_month: 3,
    birth_day: 12,
    birth_place: "Boston, Massachusetts",
    birth_lat: 42.3601,
    birth_lng: -71.0589,
    death_year: null,
    family_name: "Murphy",
    is_self: true,
    notes: "Start here—replace with your own details.",
    atlas_seed_id: null,
  },
  {
    key: "mother",
    name: "Nora Murphy",
    birth_year: 1960,
    birth_month: 5,
    birth_day: 2,
    birth_place: "Cork, Ireland",
    birth_lat: 51.8985,
    birth_lng: -8.4756,
    death_year: null,
    family_name: "Murphy",
    is_self: false,
    notes: "Immigrant generation sample.",
    atlas_seed_id: null,
  },
  {
    key: "father",
    name: "Sean Murphy",
    birth_year: 1958,
    birth_month: 11,
    birth_day: 20,
    birth_place: "Dublin, Ireland",
    birth_lat: 53.3498,
    birth_lng: -6.2603,
    death_year: null,
    family_name: "Murphy",
    is_self: false,
    notes: "Immigrant generation sample.",
    atlas_seed_id: null,
  },
  {
    key: "maternal-gm",
    name: "Bridget O'Sullivan",
    birth_year: 1934,
    birth_month: 1,
    birth_day: 8,
    birth_place: "Killarney, Ireland",
    birth_lat: 52.0599,
    birth_lng: -9.5044,
    death_year: 2011,
    family_name: "O'Sullivan",
    is_self: false,
    notes: "Grandparent generation.",
    atlas_seed_id: null,
  },
];

const IMMIGRANT_RELATIONS: SampleRelation[] = [
  { from: "mother", to: "you", rel: "parent" },
  { from: "father", to: "you", rel: "parent" },
  { from: "mother", to: "father", rel: "partner" },
  { from: "maternal-gm", to: "mother", rel: "parent" },
];

const MYTHIC_PERSONS: SamplePerson[] = [
  {
    key: "you",
    name: "You (sample explorer)",
    birth_year: 1995,
    birth_month: 9,
    birth_day: 21,
    birth_place: "Cairo",
    birth_lat: 30.0444,
    birth_lng: 31.2357,
    death_year: null,
    family_name: null,
    is_self: true,
    notes: "Explore mythological ancestry against Atlas Egypt scene.",
    atlas_seed_id: null,
  },
  {
    key: "isis",
    name: "Isis (symbolic ancestor)",
    birth_year: -2500,
    birth_month: null,
    birth_day: null,
    birth_place: "Philae",
    birth_lat: 24.0256,
    birth_lng: 32.8842,
    death_year: null,
    family_name: null,
    is_self: false,
    notes: "Symbolic mythic link — open Egypt scene in Atlas for deities.",
    atlas_seed_id: null,
  },
];

const MYTHIC_RELATIONS: SampleRelation[] = [{ from: "isis", to: "you", rel: "parent" }];

export const SAMPLE_TEMPLATES: Record<
  SampleTemplateId,
  { label: string; persons: SamplePerson[]; relations: SampleRelation[] }
> = {
  habsburg: {
    label: "Habsburg sample",
    persons: HABSBURG_PERSONS,
    relations: HABSBURG_RELATIONS,
  },
  "immigrant-atlantic": {
    label: "Atlantic immigrant sample",
    persons: IMMIGRANT_PERSONS,
    relations: IMMIGRANT_RELATIONS,
  },
  "mythic-ancestry": {
    label: "Mythic ancestry sample",
    persons: MYTHIC_PERSONS,
    relations: MYTHIC_RELATIONS,
  },
};

/** @deprecated use SAMPLE_TEMPLATES.habsburg */
export const SAMPLE_FAMILY_PERSONS = HABSBURG_PERSONS;
/** @deprecated use SAMPLE_TEMPLATES.habsburg */
export const SAMPLE_FAMILY_RELATIONS = HABSBURG_RELATIONS;

export function resolveSampleTemplate(id: string | null | undefined) {
  const key = (id || "habsburg") as SampleTemplateId;
  return SAMPLE_TEMPLATES[key] ?? SAMPLE_TEMPLATES.habsburg;
}
