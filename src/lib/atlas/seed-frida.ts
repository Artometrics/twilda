import type { AtlasEntity, AtlasLink } from "@/lib/atlas/types";

/**
 * Demo research graph — Frida Kahlo as the walkthrough case.
 * Places she lived/visited, works she made, museums that hold them,
 * people she was near, and soft rankings among peer works.
 */
export const fridaEntities: AtlasEntity[] = [
  {
    id: "frida-kahlo",
    kind: "person",
    name: "Frida Kahlo",
    calloutLabel: "Frida Kahlo",
    aliases: ["Magdalena Carmen Frida Kahlo y Calderón"],
    summary:
      "Mexican painter whose self-portraits fused personal injury, politics, and Mexican folk symbolism into a global language of intimate witness.",
    description: `Born in Coyoacán in 1907, Frida Kahlo spent most of her life at La Casa Azul. A near-fatal bus accident in 1925 left her in chronic pain and confined for long stretches — conditions that shaped both her body of work and its obsession with the self as subject.

She married Diego Rivera twice, traveled with him to the United States, and moved through Surrealist circles without fully belonging to them. She insisted her paintings were not dreams but lived facts.

Atlas tracks her places, her paintings' current homes, and the people and ideas that clustered around her — not as a timeline of genius alone, but as a network of presence.`,
    startYear: 1907,
    endYear: 1954,
    coords: { lat: 19.3551, lng: -99.1627 },
    tags: ["painter", "mexico", "modernism", "self-portrait"],
    portraitUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg/330px-Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg",
  },
  {
    id: "diego-rivera",
    kind: "person",
    name: "Diego Rivera",
    calloutLabel: "Diego Rivera",
    summary:
      "Monumental muralist and Kahlo's partner; his public frescoes and her private canvases formed a contentious dual orbit of Mexican modernism.",
    description:
      "Rivera's murals for Detroit, San Francisco, and Mexico City made him an international figure. His marriage to Kahlo drew both artists through US cities in the early 1930s and kept them politically and geographically entangled until her death.",
    startYear: 1886,
    endYear: 1957,
    coords: { lat: 19.4326, lng: -99.1332 },
    tags: ["muralist", "mexico", "modernism"],
    portraitUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Diego_Rivera_-_Google_Art_Project_%28cropped%29.jpg/330px-Diego_Rivera_-_Google_Art_Project_%28cropped%29.jpg",
  },
  {
    id: "casa-azul",
    kind: "place",
    name: "La Casa Azul",
    summary: "Kahlo's family home in Coyoacán — birthplace, studio, and now museum.",
    description:
      "The cobalt-walled house at Londres 247 is the geographic heart of Kahlo's life. She was born here, convalesced here, painted here, and died here. Today it is the Museo Frida Kahlo, preserving rooms almost as she left them.",
    startYear: 1904,
    coords: { lat: 19.3551, lng: -99.1627 },
    tags: ["museum", "home", "coyoacan", "mexico-city"],
  },
  {
    id: "mexico-city",
    kind: "place",
    name: "Mexico City",
    summary: "Capital metro where Kahlo's domestic life, political circle, and late exhibitions overlapped.",
    description:
      "Beyond Coyoacán, Mexico City held the Escuela Nacional Preparatoria, the Palacio de Bellas Artes, and the broader Mexican Renaissance Kahlo moved through with Rivera and their circle.",
    coords: { lat: 19.4326, lng: -99.1332 },
    tags: ["city", "mexico"],
  },
  {
    id: "san-francisco",
    kind: "place",
    name: "San Francisco",
    summary: "City where Kahlo and Rivera lived in 1930–31 while Rivera painted murals.",
    description:
      "Their first extended US stay. Rivera worked on commissions; Kahlo painted and met figures in the Bay Area art scene. A node linking Mexican modernism to California patronage.",
    coords: { lat: 37.7749, lng: -122.4194 },
    tags: ["city", "united-states", "1930s"],
  },
  {
    id: "detroit",
    kind: "place",
    name: "Detroit",
    summary: "Industrial city of Rivera's Detroit Industry murals; Kahlo accompanied him in 1932–33.",
    description:
      "While Rivera painted at the Detroit Institute of Arts, Kahlo suffered a miscarriage and produced works that confront fertility, industry, and displacement — including Henry Ford Hospital.",
    coords: { lat: 42.3314, lng: -83.0458 },
    tags: ["city", "united-states", "1930s"],
  },
  {
    id: "new-york",
    kind: "place",
    name: "New York",
    summary: "Site of Kahlo's first solo exhibition outside Mexico (Julien Levy Gallery, 1938).",
    description:
      "The 1938 Julien Levy show brought Kahlo into the New York collector and Surrealist circuit. André Breton wrote the catalog preface; the city became a waypoint for her international reputation.",
    coords: { lat: 40.7128, lng: -74.006 },
    tags: ["city", "united-states", "exhibition"],
  },
  {
    id: "paris",
    kind: "place",
    name: "Paris",
    summary: "1939 exhibition at Renou et Colle; Louvre later acquired 'The Frame'.",
    description:
      "Kahlo's brief Paris sojourn placed her among European Surrealists. The Louvre's purchase of The Frame made her the first Mexican artist in that collection — a status pivot more than a residential one.",
    coords: { lat: 48.8566, lng: 2.3522 },
    tags: ["city", "france", "exhibition"],
  },
  {
    id: "museo-arte-moderno",
    kind: "place",
    name: "Museo de Arte Moderno",
    summary: "Mexico City museum that holds The Two Fridas.",
    description:
      "Located in Chapultepec, the museum is a major public home for Mexican modernism. The Two Fridas hangs here as one of Kahlo's largest and most cited works.",
    coords: { lat: 19.4234, lng: -99.1795 },
    tags: ["museum", "mexico-city"],
  },
  {
    id: "mam-sf",
    kind: "place",
    name: "SFMOMA",
    summary: "San Francisco Museum of Modern Art — holds Frieda and Diego Rivera (1931).",
    description:
      "Kahlo's double portrait of herself with Rivera, painted during their San Francisco stay, lives in SFMOMA's collection — a direct map link from their California year to a present-day museum pin.",
    coords: { lat: 37.7857, lng: -122.4011 },
    tags: ["museum", "san-francisco"],
  },
  {
    id: "dia-detroit",
    kind: "place",
    name: "Detroit Institute of Arts",
    summary: "Home of Rivera's Detroit Industry murals; geographic anchor of Kahlo's Detroit year.",
    description:
      "The Diego Rivera murals at DIA are not Kahlo's paintings, but they locate the industrial context of her 1932 work. Atlas treats the murals as a related monument on her path.",
    coords: { lat: 42.3594, lng: -83.0645 },
    tags: ["museum", "detroit", "mural"],
  },
  {
    id: "louvre",
    kind: "place",
    name: "Louvre Museum",
    summary: "Paris; acquired Kahlo's The Frame (1938 painting on aluminum/glass).",
    description:
      "The acquisition cemented Kahlo's European institutional foothold. Atlas uses the Louvre pin as the current 'home' of that work's public life.",
    coords: { lat: 48.8606, lng: 2.3376 },
    tags: ["museum", "paris"],
  },
  {
    id: "work-two-fridas",
    kind: "work",
    name: "The Two Fridas",
    summary: "1939 double self-portrait; currently at Museo de Arte Moderno, Mexico City.",
    description: `Two seated Fridas hold hands, hearts exposed, one in European dress and one in Tehuana costume. Painted after her divorce from Rivera, it is often read as a split between public and private, European and Mexican selves.

Ranked among her most reproduced works. Provenance runs from the artist's hand through Mexican public collections to its present museum home.`,
    startYear: 1939,
    coords: { lat: 19.4234, lng: -99.1795 },
    tags: ["painting", "self-portrait", "1939"],
    rank: 1,
    peerSet: "Kahlo major canvases (Atlas demo set)",
    valueNote: "Largest Kahlo canvas; central to museum surveys of Mexican modernism.",
    provenance: [
      { year: 1939, placeId: "casa-azul", note: "Painted in Mexico after divorce from Rivera." },
      {
        year: 1947,
        placeId: "museo-arte-moderno",
        note: "Entered public Mexican museum circuit (Atlas simplified date).",
      },
    ],
  },
  {
    id: "work-frieda-diego",
    kind: "work",
    name: "Frieda and Diego Rivera",
    summary: "1931 double portrait painted in San Francisco; now at SFMOMA.",
    description:
      "Kahlo stands beside a towering Rivera, small and formal in Tehuana dress. The painting documents their San Francisco partnership year and now sits blocks from where they lived that season.",
    startYear: 1931,
    coords: { lat: 37.7857, lng: -122.4011 },
    tags: ["painting", "portrait", "1931"],
    rank: 3,
    peerSet: "Kahlo major canvases (Atlas demo set)",
    valueNote: "Key early US-period work; strong collector and survey demand.",
    provenance: [
      { year: 1931, placeId: "san-francisco", note: "Painted during Rivera mural commissions." },
      { year: 1936, placeId: "mam-sf", note: "Entered SFMOMA collection (Atlas simplified)." },
    ],
  },
  {
    id: "work-thorn-necklace",
    kind: "work",
    name: "Self-Portrait with Thorn Necklace and Hummingbird",
    summary: "1940 self-portrait; frequently among her highest-valued and most cited images.",
    description:
      "Thorns encircle her neck like a martyr's collar; a dead hummingbird hangs as pendant. Monkeys and a black cat crowd the foliage. A textbook image of Kahlo's pain-as-iconography.",
    startYear: 1940,
    coords: { lat: 30.2849, lng: -97.7341 },
    tags: ["painting", "self-portrait", "1940"],
    rank: 2,
    peerSet: "Kahlo major canvases (Atlas demo set)",
    valueNote: "Among the most auction-referenced Kahlo self-portraits; Harry Ransom Center (UT Austin) holds it.",
    provenance: [
      { year: 1940, placeId: "casa-azul", note: "Painted in Mexico." },
      {
        year: 1960,
        placeId: "ut-austin",
        note: "Acquired into Harry Ransom Center collections (Atlas simplified).",
      },
    ],
  },
  {
    id: "ut-austin",
    kind: "place",
    name: "Harry Ransom Center (UT Austin)",
    summary: "Holds Self-Portrait with Thorn Necklace and Hummingbird.",
    description:
      "Research library and museum at the University of Texas at Austin. A reminder that Kahlo's objects travel far from the blue house — into US academic collections as much as national museums.",
    coords: { lat: 30.2849, lng: -97.7341 },
    tags: ["museum", "archive", "texas"],
  },
  {
    id: "work-broken-column",
    kind: "work",
    name: "The Broken Column",
    summary: "1944 self-portrait of spinal fracture and corset; painted at Casa Azul.",
    description:
      "Kahlo's body opens like an architectural ruin, an Ionic column cracked down her torso. Nails pierce flesh; tears mark the face. One of the clearest maps from medical trauma to image.",
    startYear: 1944,
    coords: { lat: 19.3551, lng: -99.1627 },
    tags: ["painting", "self-portrait", "1944"],
    rank: 4,
    peerSet: "Kahlo major canvases (Atlas demo set)",
    valueNote: "Canonically taught; privately held / loan circuits (Atlas notes institutional absence).",
    provenance: [
      { year: 1944, placeId: "casa-azul", note: "Painted while wearing a steel corset." },
    ],
  },
  {
    id: "idea-mexicanidad",
    kind: "idea",
    name: "Mexicanidad",
    summary: "Post-revolutionary cultural identity Kahlo performed through dress, color, and subject.",
    description:
      "More than costume: Tehuana dress, pre-Columbian objects in Casa Azul, and folk ex-voto formats were part of a deliberate national-modern self-fashioning shared with (and against) Rivera's murals.",
    startYear: 1920,
    tags: ["idea", "politics", "identity"],
  },
  {
    id: "idea-surrealism",
    kind: "idea",
    name: "Surrealism",
    summary: "European movement that claimed Kahlo; she resisted the label.",
    description:
      "Breton called her a surrealist. Kahlo replied that she painted her own reality. Atlas keeps the influence link while marking her dissent — an idea she was near without joining.",
    startYear: 1924,
    tags: ["idea", "art-movement"],
  },
  {
    id: "event-accident",
    kind: "event",
    name: "1925 Bus Accident",
    summary: "Streetcar/bus collision in Mexico City that shattered Kahlo's spine and pelvis.",
    description:
      "The accident ended her medical-school path and began the long medical history that structures her self-portraits. Atlas places it as origin event, not destination.",
    startYear: 1925,
    coords: { lat: 19.4326, lng: -99.1332 },
    tags: ["event", "mexico-city"],
  },
  {
    id: "event-levy-show",
    kind: "event",
    name: "Julien Levy Gallery Solo Show",
    summary: "1938 New York debut — first solo exhibition in the United States.",
    description:
      "Twenty-five paintings. Breton's text. Collectors and press. The show is a network event: New York pins activate on the map, and several works begin their long provenance trails.",
    startYear: 1938,
    coords: { lat: 40.7128, lng: -74.006 },
    tags: ["event", "exhibition", "new-york"],
  },
];

export const fridaLinks: AtlasLink[] = [
  { id: "l1", from: "frida-kahlo", to: "casa-azul", rel: "born_in", year: 1907 },
  { id: "l2", from: "frida-kahlo", to: "casa-azul", rel: "lived_in", year: 1907, yearEnd: 1954 },
  { id: "l3", from: "frida-kahlo", to: "diego-rivera", rel: "partner_of", year: 1929, yearEnd: 1954, note: "Married 1929; divorced 1939; remarried 1940." },
  { id: "l4", from: "frida-kahlo", to: "san-francisco", rel: "visited", year: 1930, yearEnd: 1931 },
  { id: "l5", from: "frida-kahlo", to: "detroit", rel: "visited", year: 1932, yearEnd: 1933 },
  { id: "l6", from: "frida-kahlo", to: "new-york", rel: "visited", year: 1933 },
  { id: "l7", from: "frida-kahlo", to: "new-york", rel: "visited", year: 1938, note: "Julien Levy solo show." },
  { id: "l8", from: "frida-kahlo", to: "paris", rel: "visited", year: 1939 },
  { id: "l9", from: "frida-kahlo", to: "event-accident", rel: "related", year: 1925 },
  { id: "l10", from: "frida-kahlo", to: "idea-mexicanidad", rel: "influenced_by" },
  { id: "l11", from: "frida-kahlo", to: "idea-surrealism", rel: "influenced_by", note: "Claimed by Surrealists; she rejected the frame." },
  { id: "l12", from: "frida-kahlo", to: "work-two-fridas", rel: "created", year: 1939 },
  { id: "l13", from: "frida-kahlo", to: "work-frieda-diego", rel: "created", year: 1931 },
  { id: "l14", from: "frida-kahlo", to: "work-thorn-necklace", rel: "created", year: 1940 },
  { id: "l15", from: "frida-kahlo", to: "work-broken-column", rel: "created", year: 1944 },
  { id: "l16", from: "work-two-fridas", to: "museo-arte-moderno", rel: "housed_at", year: 1947 },
  { id: "l17", from: "work-frieda-diego", to: "mam-sf", rel: "housed_at", year: 1936 },
  { id: "l18", from: "work-thorn-necklace", to: "ut-austin", rel: "housed_at", year: 1960 },
  { id: "l19", from: "work-broken-column", to: "casa-azul", rel: "related", year: 1944, note: "Painted at Casa Azul; later circulation varies." },
  { id: "l20", from: "diego-rivera", to: "dia-detroit", rel: "created", year: 1932, yearEnd: 1933, note: "Detroit Industry murals." },
  { id: "l21", from: "diego-rivera", to: "detroit", rel: "visited", year: 1932, yearEnd: 1933 },
  { id: "l22", from: "diego-rivera", to: "san-francisco", rel: "visited", year: 1930, yearEnd: 1931 },
  { id: "l23", from: "event-levy-show", to: "new-york", rel: "related", year: 1938 },
  { id: "l24", from: "frida-kahlo", to: "event-levy-show", rel: "related", year: 1938 },
  { id: "l25", from: "casa-azul", to: "mexico-city", rel: "near" },
  { id: "l26", from: "museo-arte-moderno", to: "mexico-city", rel: "near" },
  { id: "l27", from: "work-two-fridas", to: "work-thorn-necklace", rel: "valued_among", note: "Same peer ranking set." },
  { id: "l28", from: "work-thorn-necklace", to: "work-frieda-diego", rel: "valued_among" },
  { id: "l29", from: "diego-rivera", to: "casa-azul", rel: "lived_in", year: 1929, yearEnd: 1954, note: "Intermittent residence with Kahlo." },
];
