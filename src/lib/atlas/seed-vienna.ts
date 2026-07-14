import type { AtlasEntity, AtlasLink, AtlasScene } from "@/lib/atlas/types";

/**
 * Vienna 1913 — “who was near” snapshot.
 * Portrait callouts clustered across the Innere Stadt / nearby districts.
 * Coords are researched approximations of residences / habitual places that year.
 */
export const viennaEntities: AtlasEntity[] = [
  {
    id: "vienna",
    kind: "place",
    name: "Vienna",
    summary: "Imperial capital of Austria-Hungary; dense social map of 1913.",
    description:
      "In 1913 Vienna packed artists, exiles, emperors, and future radicals into a few walkable districts. Atlas uses that year as a pure proximity scene — not a claim that they all met, but that they shared a city.",
    coords: { lat: 48.2082, lng: 16.3738 },
    tags: ["city", "austria", "1913"],
  },
  {
    id: "cafe-central",
    kind: "place",
    name: "Café Central",
    calloutLabel: "Café",
    summary: "Legendary coffeehouse in the Innere Stadt — chess, papers, exiles.",
    description:
      "Herrengasse. Writers, revolutionaries, and regulars layered over decades. In the Vienna 1913 scene it is the unlabeled yellow tip in spirit — a place marker for nearness rather than a single biography.",
    coords: { lat: 48.21033, lng: 16.36555 },
    tags: ["cafe", "vienna", "innere-stadt"],
  },
  {
    id: "sigmund-freud",
    kind: "person",
    name: "Sigmund Freud",
    calloutLabel: "Freud",
    summary: "Psychoanalyst at Berggasse 19 — analyzing the city that invented him.",
    description:
      "By 1913 Freud had long held his practice and home at Berggasse 19 in the Alsergrund. Vienna’s cafe and clinic geography formed the domestic side of psychoanalysis’s birth.",
    startYear: 1856,
    endYear: 1939,
    coords: { lat: 48.21855, lng: 16.36305 },
    tags: ["psychoanalysis", "vienna", "1913"],
    portraitUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Sigmund_Freud%2C_by_Max_Halberstadt_%28cropped%29.jpg/330px-Sigmund_Freud%2C_by_Max_Halberstadt_%28cropped%29.jpg",
  },
  {
    id: "leon-trotsky",
    kind: "person",
    name: "Leon Trotsky",
    calloutLabel: "Trotsky",
    summary: "Exile journalist in Vienna, editing and arguing in the cafe belt.",
    description:
      "Trotsky spent years of pre-war exile in Vienna, writing for the Russian revolutionary press and frequenting the central cafés. His 1913 pin sits near the political coffeehouse circuit.",
    startYear: 1879,
    endYear: 1940,
    coords: { lat: 48.2096, lng: 16.3642 },
    tags: ["revolutionary", "exile", "vienna", "1913"],
    portraitUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Leon_Trotsky_1918_%283x4_rotated_cropped_b%29.jpg/330px-Leon_Trotsky_1918_%283x4_rotated_cropped_b%29.jpg",
  },
  {
    id: "joseph-stalin",
    kind: "person",
    name: "Joseph Stalin",
    calloutLabel: "Stalin",
    summary: "Brief 1913 Vienna stay while editing Party work — near the same cafe myth.",
    description:
      "Stalin’s short Vienna visit (often dated around early 1913 while working on nationalities questions) places him in the same exile ecosystem as Trotsky — proximity without friendship.",
    startYear: 1878,
    endYear: 1953,
    coords: { lat: 48.2089, lng: 16.3668 },
    tags: ["revolutionary", "exile", "vienna", "1913"],
    portraitUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/StalinCropped1943.jpg/330px-StalinCropped1943.jpg",
  },
  {
    id: "adolf-hitler",
    kind: "person",
    name: "Adolf Hitler",
    calloutLabel: "Hitler",
    summary: "Failed art student years; registered at the Meldemannstraße men’s hostel.",
    description:
      "Hitler’s Vienna period (ending mid-1913 as he left for Munich) is one of poverty, rejection from the Academy, and lodging in workers’ hostels north of the center. Atlas pins the hostel neighborhood — not the Hofburg.",
    startYear: 1889,
    endYear: 1945,
    coords: { lat: 48.2392, lng: 16.3808 },
    tags: ["vienna", "1913", "exiled-ambition"],
    portraitUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Hitler_portrait_crop_%28cropped%29%282%29.jpg/330px-Hitler_portrait_crop_%28cropped%29%282%29.jpg",
  },
  {
    id: "franz-joseph",
    kind: "person",
    name: "Franz Joseph I",
    calloutLabel: "Franz Joseph",
    summary: "Emperor of Austria — aging sovereign at the Hofburg as the empire tensed.",
    description:
      "In 1913 Franz Joseph still embodied Habsburg continuity. The Hofburg pin anchors imperial power a short walk from the coffeehouses where exiles plotted against empires.",
    startYear: 1830,
    endYear: 1916,
    coords: { lat: 48.2054, lng: 16.3658 },
    tags: ["emperor", "habsburg", "vienna", "1913"],
    portraitUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Franz_Joseph_I_of_Austria.1910_%28cropped%29.jpg/330px-Franz_Joseph_I_of_Austria.1910_%28cropped%29.jpg",
  },
  {
    id: "event-vienna-1913",
    kind: "event",
    name: "Vienna 1913",
    summary: "One city, one year — emperors, analysts, and future dictators within walking distance.",
    description:
      "Atlas scene event: not a single gathering, but a temporal slice. Toggle this scene to see callouts for Freud, Trotsky, Stalin, Hitler, Franz Joseph, and Café Central.",
    startYear: 1913,
    coords: { lat: 48.2082, lng: 16.3738 },
    tags: ["scene", "vienna"],
  },
];

export const viennaLinks: AtlasLink[] = [
  { id: "v1", from: "sigmund-freud", to: "vienna", rel: "lived_in", year: 1891, yearEnd: 1938 },
  { id: "v2", from: "leon-trotsky", to: "vienna", rel: "visited", year: 1907, yearEnd: 1914 },
  { id: "v3", from: "joseph-stalin", to: "vienna", rel: "visited", year: 1913 },
  { id: "v4", from: "adolf-hitler", to: "vienna", rel: "lived_in", year: 1908, yearEnd: 1913 },
  { id: "v5", from: "franz-joseph", to: "vienna", rel: "lived_in", year: 1848, yearEnd: 1916 },
  { id: "v6", from: "sigmund-freud", to: "cafe-central", rel: "near", year: 1913 },
  { id: "v7", from: "leon-trotsky", to: "cafe-central", rel: "near", year: 1913 },
  { id: "v8", from: "joseph-stalin", to: "cafe-central", rel: "near", year: 1913 },
  { id: "v9", from: "franz-joseph", to: "cafe-central", rel: "near", year: 1913 },
  { id: "v10", from: "adolf-hitler", to: "cafe-central", rel: "near", year: 1913, note: "Same city, distant social worlds." },
  { id: "v11", from: "leon-trotsky", to: "joseph-stalin", rel: "near", year: 1913 },
  { id: "v12", from: "event-vienna-1913", to: "vienna", rel: "related", year: 1913 },
  { id: "v13", from: "cafe-central", to: "vienna", rel: "near" },
];

export const vienna1913Scene: AtlasScene = {
  id: "vienna-1913",
  title: "Vienna 1913",
  subtitle: "Who shared the city that year",
  year: 1913,
  center: { lat: 48.212, lng: 16.37 },
  zoom: 14,
  badge: "Vienna 1913",
  calloutIds: [
    "sigmund-freud",
    "leon-trotsky",
    "joseph-stalin",
    "adolf-hitler",
    "franz-joseph",
    "cafe-central",
  ],
  focusId: "sigmund-freud",
};
