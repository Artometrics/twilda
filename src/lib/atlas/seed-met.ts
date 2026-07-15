import type { AtlasEntity, AtlasLink, AtlasScene } from "@/lib/atlas/types";

/**
 * Met Museum Open Access — curated public-domain works housed at The Met.
 * Object IDs and images verified via the Met Collection API (isPublicDomain=true).
 * Accession numbers noted in aliases; metObjectId stores the numeric collection objectID.
 *
 * Intentionally omits non-OA favorites (e.g. Monet Bridge over a Pond of Water Lilies
 * 29.100.113 is rights-restricted in the API). Prefer fewer verified IDs over guesses.
 */

const MET = {
  lat: 40.7794,
  lng: -73.9632,
} as const;

const OA = {
  license: "CC0",
  attribution: "The Metropolitan Museum of Art",
  imageCredit: "The Met Open Access",
} as const;

function metWork(opts: {
  id: string;
  metObjectId: string;
  accession: string;
  name: string;
  calloutLabel?: string;
  summary: string;
  description: string;
  startYear: number;
  portraitUrl: string;
  tags: string[];
  rank?: number;
}): AtlasEntity {
  return {
    id: opts.id,
    kind: "work",
    name: opts.name,
    calloutLabel: opts.calloutLabel ?? opts.name,
    aliases: [opts.accession, `Met ${opts.metObjectId}`],
    summary: opts.summary,
    description: opts.description,
    startYear: opts.startYear,
    coords: { ...MET },
    tags: ["artifact", "open-access", "met", ...opts.tags],
    metObjectId: opts.metObjectId,
    sourceUrl: `https://www.metmuseum.org/art/collection/search/${opts.metObjectId}`,
    portraitUrl: opts.portraitUrl,
    ...OA,
    rank: opts.rank,
    peerSet: opts.rank != null ? "Met Open Access highlights (Atlas)" : undefined,
    provenance: [
      {
        year: 2025,
        placeId: "met-museum",
        note: "Housed in The Metropolitan Museum of Art collections (Open Access).",
      },
    ],
  };
}

export const metEntities: AtlasEntity[] = [
  {
    id: "met-museum",
    kind: "place",
    name: "The Metropolitan Museum of Art",
    calloutLabel: "The Met",
    aliases: ["The Met", "Metropolitan Museum"],
    summary:
      "New York flagship museum on Fifth Avenue — over 1.5 million open-access images under CC0.",
    description: `Founded in 1870, The Metropolitan Museum of Art holds encyclopedic collections spanning five millennia. In 2017 it released hundreds of thousands of public-domain collection images under Creative Commons Zero (CC0), inviting reuse without restriction.

Atlas seeds a curated set of famous Open Access works still on Fifth Avenue — paintings, sculpture, Egyptian monuments, and Cloisters tapestries — each linked by housed_at to this pin.`,
    startYear: 1870,
    coords: { ...MET },
    tags: ["museum", "new-york", "open-access", "met"],
    ...OA,
    sourceUrl: "https://www.metmuseum.org/",
  },

  // —— American Wing ——
  metWork({
    id: "met-washington-crossing",
    metObjectId: "11417",
    accession: "97.34",
    name: "Washington Crossing the Delaware",
    calloutLabel: "Washington Crossing",
    summary: "1851 Leutze epic of the 1776 Christmas night crossing; American Wing icon.",
    description:
      "Emanuel Leutze’s monumental history painting stages Washington’s surprise attack on Trenton. Painted in Düsseldorf for a US audience, it became one of the Met’s most visited American canvases. Accession 97.34 (not the outdated 11.173 citation sometimes repeated online).",
    startYear: 1851,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ad/web-large/DP215410.jpg",
    tags: ["painting", "american-wing", "leutze", "1851"],
    rank: 1,
  }),
  metWork({
    id: "met-madame-x",
    metObjectId: "12127",
    accession: "16.53",
    name: "Madame X (Virginie Amélie Avegno Gautreau)",
    calloutLabel: "Madame X",
    summary: "Sargent’s 1883–84 society portrait that scandalized the Paris Salon.",
    description:
      "John Singer Sargent’s black-satin portrait of Virginie Gautreau. The original plunging strap caused outrage; Sargent later repainted it. Gift of the artist, now a fixture of the American Wing.",
    startYear: 1883,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ad/web-large/DP-29006-001.jpg",
    tags: ["painting", "american-wing", "sargent", "portrait"],
    rank: 3,
  }),
  metWork({
    id: "met-fur-traders",
    metObjectId: "10159",
    accession: "33.61",
    name: "Fur Traders Descending the Missouri",
    calloutLabel: "Fur Traders",
    summary: "1845 Bingham genre scene of traders and a tethered animal on a dugout canoe.",
    description:
      "George Caleb Bingham’s quiet river nocturne is a cornerstone of antebellum American genre painting — commerce, wilderness, and measured light on the Missouri.",
    startYear: 1845,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ad/web-large/DT73.jpg",
    tags: ["painting", "american-wing", "bingham"],
  }),
  metWork({
    id: "met-rocky-mountains",
    metObjectId: "10154",
    accession: "07.123",
    name: "The Rocky Mountains, Lander's Peak",
    calloutLabel: "Lander's Peak",
    summary: "1863 Bierstadt vista of the American West — luminous, immense, promotional.",
    description:
      "Albert Bierstadt’s Lander’s Peak canvas helped fix Yellowstone-era mountain sublime in eastern museum halls. Oil on canvas, American Wing.",
    startYear: 1863,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ad/web-large/DT82.jpg",
    tags: ["painting", "american-wing", "bierstadt", "landscape"],
  }),

  // —— European Paintings ——
  metWork({
    id: "met-death-of-socrates",
    metObjectId: "436105",
    accession: "31.45",
    name: "The Death of Socrates",
    calloutLabel: "Death of Socrates",
    summary: "1787 David neoclassical tableau of Socrates reaching for the hemlock.",
    description:
      "Jacques-Louis David’s prison scene is a manifesto of Enlightenment virtue and revolutionary-era clarity of gesture. Accession 31.45.",
    startYear: 1787,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-13139-001.jpg",
    tags: ["painting", "european-paintings", "david", "neoclassical"],
    rank: 2,
  }),
  metWork({
    id: "met-aristotle-homer",
    metObjectId: "437394",
    accession: "61.198",
    name: "Aristotle with a Bust of Homer",
    calloutLabel: "Aristotle",
    summary: "1653 Rembrandt: gold chain, reflective philosopher, Homeric bust.",
    description:
      "Rembrandt’s meditation on fame, gold, and poetic ancestry. Purchased by the Met in 1961 (accession 61.198). Often misremembered under other accession strings online.",
    startYear: 1653,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-30758-001.jpg",
    tags: ["painting", "european-paintings", "rembrandt"],
    rank: 4,
  }),
  metWork({
    id: "met-straw-hat",
    metObjectId: "436532",
    accession: "67.187.70a",
    name: "Self-Portrait with a Straw Hat",
    calloutLabel: "Straw Hat",
    summary: "1887 van Gogh self-portrait (obverse of The Potato Peeler).",
    description:
      "Vincent van Gogh painted on both sides of this panel. The straw-hat face toward Parisian light is one of the Met’s most reproduced van Goghs. Accession 67.187.70a.",
    startYear: 1887,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DT1502_cropped2.jpg",
    tags: ["painting", "european-paintings", "van-gogh", "self-portrait"],
    rank: 5,
  }),
  metWork({
    id: "met-juan-de-pareja",
    metObjectId: "437869",
    accession: "1971.86",
    name: "Juan de Pareja",
    calloutLabel: "Juan de Pareja",
    summary: "1650 Velázquez portrait of his studio assistant and fellow painter.",
    description:
      "Diego Velázquez painted Juan de Pareja in Rome before the papal portrait of Innocent X. The Met’s acquisition (1971.86) was a watershed for American Old Master collecting.",
    startYear: 1650,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-14286-001.jpg",
    tags: ["painting", "european-paintings", "velazquez", "portrait"],
  }),
  metWork({
    id: "met-water-pitcher",
    metObjectId: "437881",
    accession: "89.15.21",
    name: "Young Woman with a Water Pitcher",
    calloutLabel: "Water Pitcher",
    summary: "c. 1662 Vermeer of quiet daylight, linen, and a brass pitcher.",
    description:
      "Johannes Vermeer’s domestic quiet remains a Met pilgrimage painting. Accession 89.15.21 — among the earliest Vermeers in a US public collection.",
    startYear: 1662,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP353257.jpg",
    tags: ["painting", "european-paintings", "vermeer"],
  }),
  metWork({
    id: "met-maid-asleep",
    metObjectId: "437878",
    accession: "14.40.611",
    name: "A Maid Asleep",
    calloutLabel: "Maid Asleep",
    summary: "c. 1656–57 early Vermeer — table clutter, door ajar, dozing figure.",
    description:
      "An early Vermeer with narrative ambiguity: drink, unfinished letter, and a secondary figure glimpsed beyond. Bequest of Benjamin Altman.",
    startYear: 1656,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP355525.jpg",
    tags: ["painting", "european-paintings", "vermeer"],
  }),
  metWork({
    id: "met-harvesters",
    metObjectId: "435809",
    accession: "19.164",
    name: "The Harvesters",
    calloutLabel: "Harvesters",
    summary: "1565 Bruegel panel of August labor, rest, and landscape breadth.",
    description:
      "Pieter Bruegel the Elder’s month from a seasons cycle. Peasants harvest wheat under a high horizon — a northern landscape breakthrough. Accession 19.164.",
    startYear: 1565,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP119115.jpg",
    tags: ["painting", "european-paintings", "bruegel"],
  }),
  metWork({
    id: "met-wheat-cypresses",
    metObjectId: "436535",
    accession: "1993.132",
    name: "Wheat Field with Cypresses",
    calloutLabel: "Wheat Field",
    summary: "1889 van Gogh cypress and wheat under Provençal wind.",
    description:
      "Painted near Saint-Rémy. One of several versions; the Met’s canvas (1993.132) is among the most complete and charged.",
    startYear: 1889,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-42549-001.jpg",
    tags: ["painting", "european-paintings", "van-gogh", "landscape"],
  }),
  metWork({
    id: "met-cypresses",
    metObjectId: "437980",
    accession: "49.30",
    name: "Cypresses",
    calloutLabel: "Cypresses",
    summary: "1889 van Gogh close study of flame-shaped cypress trees.",
    description:
      "Companion energy to Wheat Field with Cypresses — vertical dark greens against cobalt sky. Accession 49.30.",
    startYear: 1889,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP130999.jpg",
    tags: ["painting", "european-paintings", "van-gogh"],
  }),
  metWork({
    id: "met-irises",
    metObjectId: "436528",
    accession: "58.187",
    name: "Irises",
    calloutLabel: "Irises",
    summary: "1890 van Gogh bed of irises painted in the asylum garden.",
    description:
      "One of van Gogh’s final floral subjects before Auvers. Dense violet against warm ground. Accession 58.187.",
    startYear: 1890,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP346474.jpg",
    tags: ["painting", "european-paintings", "van-gogh"],
  }),
  metWork({
    id: "met-horse-fair",
    metObjectId: "435702",
    accession: "87.25",
    name: "The Horse Fair",
    calloutLabel: "Horse Fair",
    summary: "1852–55 Rosa Bonheur’s thronged Paris horse market.",
    description:
      "Rosa Bonheur’s vast animal-painting manifesto. She studied horses at the Paris fair dressed as a man with police permission. Accession 87.25.",
    startYear: 1852,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-23550-001.jpg",
    tags: ["painting", "european-paintings", "bonheur"],
  }),
  metWork({
    id: "met-boating",
    metObjectId: "436947",
    accession: "29.100.115",
    name: "Boating",
    calloutLabel: "Boating",
    summary: "1874 Manet on the water at Argenteuil — blue, white, cropped modernity.",
    description:
      "Édouard Manet’s boating pair under a high summer sky. A touchstone of Impressionist-adjacent modernity at the Met. Accession 29.100.115.",
    startYear: 1874,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-25466-001.jpg",
    tags: ["painting", "european-paintings", "manet", "impressionism"],
  }),
  metWork({
    id: "met-spanish-singer",
    metObjectId: "436944",
    accession: "49.58.2",
    name: "The Spanish Singer",
    calloutLabel: "Spanish Singer",
    summary: "1860 Manet guitarist that announced his Salon breakthrough.",
    description:
      "Manet’s early Spanish taste in a single seated musician. Accession 49.58.2.",
    startYear: 1860,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/dp130799.jpg",
    tags: ["painting", "european-paintings", "manet"],
  }),
  metWork({
    id: "met-dance-class",
    metObjectId: "438817",
    accession: "1987.47.1",
    name: "The Dance Class",
    calloutLabel: "Dance Class",
    summary: "1874 Degas rehearsal room — mirrors, tutus, and off-center space.",
    description:
      "Edgar Degas’s ballet classroom is a Met favorite for its asymmetrical stagecraft. Accession 1987.47.1.",
    startYear: 1874,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-20101-001.jpg",
    tags: ["painting", "european-paintings", "degas"],
  }),
  metWork({
    id: "met-venus-lute",
    metObjectId: "437827",
    accession: "36.29",
    name: "Venus and the Lute Player",
    calloutLabel: "Venus",
    summary: "c. 1565–70 Titian workshop erotic pastoral with music and landscape.",
    description:
      "Late Titian / workshop dialogue of Venus, music, and open country. Accession 36.29.",
    startYear: 1565,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-28918-001.jpg",
    tags: ["painting", "european-paintings", "titian"],
  }),
  metWork({
    id: "met-bronzino-young-man",
    metObjectId: "435802",
    accession: "29.100.16",
    name: "Portrait of a Young Man",
    calloutLabel: "Bronzino",
    summary: "1530s Bronzino Mannerist court portrait — cool, polished, enigmatic.",
    description:
      "Agnolo Bronzino’s lacquered Florentine elegance. Accession 29.100.16.",
    startYear: 1530,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-14286-011.jpg",
    tags: ["painting", "european-paintings", "bronzino", "portrait"],
  }),
  metWork({
    id: "met-woman-parrot",
    metObjectId: "436002",
    accession: "29.100.57",
    name: "Woman with a Parrot",
    calloutLabel: "Woman with Parrot",
    summary: "1866 Courbet nude with macaw — Realist provocation in a salon setting.",
    description:
      "Gustave Courbet’s frank flesh and exotic bird. H. O. Havemeyer bequest. Accession 29.100.57.",
    startYear: 1866,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-17680-001.jpg",
    tags: ["painting", "european-paintings", "courbet"],
  }),
  metWork({
    id: "met-rembrandt-self",
    metObjectId: "437397",
    accession: "14.40.618",
    name: "Self-Portrait (Rembrandt, 1660)",
    calloutLabel: "Rembrandt 1660",
    summary: "1660 late Rembrandt self-portrait — paint as flesh and time.",
    description:
      "One of Rembrandt’s introspective late self-portraits in the Altman Collection. Accession 14.40.618.",
    startYear: 1660,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-16323-001.jpg",
    tags: ["painting", "european-paintings", "rembrandt", "self-portrait"],
  }),
  metWork({
    id: "met-view-of-toledo",
    metObjectId: "436575",
    accession: "29.100.6",
    name: "View of Toledo",
    calloutLabel: "Toledo",
    summary: "c. 1599–1600 El Greco storm-sky cityscape above the Tagus.",
    description:
      "El Greco’s rare pure landscape — green hills, shattered cloud, spiritual weather. Accession 29.100.6.",
    startYear: 1599,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP349564.jpg",
    tags: ["painting", "european-paintings", "el-greco", "landscape"],
  }),
  metWork({
    id: "met-musicians",
    metObjectId: "435844",
    accession: "52.81",
    name: "The Musicians",
    calloutLabel: "Musicians",
    summary: "c. 1597 Caravaggio concert — soft fruit, costume, and gaze.",
    description:
      "Early Caravaggio musical company, often read as a Roman cardsharps-era companion piece. Accession 52.81.",
    startYear: 1597,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-687-001.jpg",
    tags: ["painting", "european-paintings", "caravaggio"],
  }),
  metWork({
    id: "met-duccio-madonna",
    metObjectId: "438754",
    accession: "2004.442",
    name: "Madonna and Child",
    calloutLabel: "Duccio",
    summary: "c. 1290–1300 Duccio panel — Sienese gold ground intimacy.",
    description:
      "Duccio di Buoninsegna’s small Madonna is a landmark of early Italian painting in the Met. Accession 2004.442.",
    startYear: 1290,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP142735.jpg",
    tags: ["painting", "european-paintings", "duccio", "medieval"],
  }),
  metWork({
    id: "met-lavoisier",
    metObjectId: "436106",
    accession: "1977.10",
    name: "Antoine Laurent Lavoisier and Marie Anne Lavoisier",
    calloutLabel: "Lavoisier",
    summary: "1788 David double portrait of the chemist and his scientific partner.",
    description:
      "Jacques-Louis David’s laboratory-adjacent society portrait of the Lavoisiers. Accession 1977.10.",
    startYear: 1788,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-19709-001.jpg",
    tags: ["painting", "european-paintings", "david", "portrait"],
  }),
  metWork({
    id: "met-majas-balcony",
    metObjectId: "436548",
    accession: "29.100.10",
    name: "Majas on a Balcony",
    calloutLabel: "Majas",
    summary: "c. 1800–10 Goya balcony scene with veiled intrigue behind.",
    description:
      "Francisco Goya’s majas lean into public space while cloaked men watch. Accession 29.100.10.",
    startYear: 1800,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-20750-001.jpg",
    tags: ["painting", "european-paintings", "goya"],
  }),
  metWork({
    id: "met-circus-sideshow",
    metObjectId: "437654",
    accession: "61.101.17",
    name: "Circus Sideshow (Parade de cirque)",
    calloutLabel: "Circus Sideshow",
    summary: "1887–88 Seurat nocturnal fairground spectacle in Pointillist haze.",
    description:
      "Georges Seurat’s night fair — trombonist, gaslight, waiting crowd. Accession 61.101.17.",
    startYear: 1887,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP375450_cropped.jpg",
    tags: ["painting", "european-paintings", "seurat", "pointillism"],
  }),
  metWork({
    id: "met-turner-venice",
    metObjectId: "437853",
    accession: "99.31",
    name: "Venice, from the Porch of Madonna della Salute",
    calloutLabel: "Turner Venice",
    summary: "c. 1835 Turner dazzle of canal light from the Salute porch.",
    description:
      "J. M. W. Turner’s Venetian light dissolving stone into atmosphere. Accession 99.31.",
    startYear: 1835,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP169568.jpg",
    tags: ["painting", "european-paintings", "turner", "landscape"],
  }),

  // —— Egyptian / Greek / Cloisters ——
  metWork({
    id: "met-temple-dendur",
    metObjectId: "547802",
    accession: "68.154",
    name: "The Temple of Dendur",
    calloutLabel: "Dendur",
    summary: "Augustan Nubian temple rebuilt in the Sackler Wing (gift of Egypt).",
    description:
      "Sandstone temple from Dendur, commissioned under Augustus for Isis and two Nubian brothers deified. Gift of Egypt to the US; reconstructed at the Met in the 1970s. Accession 68.154.",
    startYear: -15,
    portraitUrl: "https://images.metmuseum.org/CRDImages/eg/web-large/DP240337.jpg",
    tags: ["architecture", "egyptian-art", "temple", "nubia"],
  }),
  metWork({
    id: "met-hatshepsut",
    metObjectId: "544448",
    accession: "30.3.1",
    name: "Large Kneeling Statue of Hatshepsut",
    calloutLabel: "Hatshepsut",
    summary: "c. 1479–1458 BCE granite kneeling queen/pharaoh offering jars.",
    description:
      "Monumental granite image of Hatshepsut from Deir el-Bahri, knees bent in perpetual offering. Accession 30.3.1.",
    startYear: -1479,
    portraitUrl: "https://images.metmuseum.org/CRDImages/eg/web-large/21V_CAT092R3.jpg",
    tags: ["sculpture", "egyptian-art", "hatshepsut"],
  }),
  metWork({
    id: "met-amenhotep-sphinx",
    metObjectId: "544498",
    accession: "1972.125",
    name: "Sphinx of Amenhotep III",
    calloutLabel: "Amenhotep Sphinx",
    summary: "c. 1390–1352 BCE small granite sphinx, possibly a temple model.",
    description:
      "Compact sphinx of Amenhotep III — royal portrait fused with lion body. Accession 1972.125.",
    startYear: -1390,
    portraitUrl: "https://images.metmuseum.org/CRDImages/eg/web-large/DT539.jpg",
    tags: ["sculpture", "egyptian-art", "amenhotep"],
  }),
  metWork({
    id: "met-kouros",
    metObjectId: "253370",
    accession: "32.11.1",
    name: "Marble statue of a kouros (youth)",
    calloutLabel: "Kouros",
    summary: "c. 590–580 BCE Attic archaic youth — stiff smile, striding left foot.",
    description:
      "One of the finest early Attic kouroi in America. Grave marker or dedication. Accession 32.11.1.",
    startYear: -590,
    portraitUrl: "https://images.metmuseum.org/CRDImages/gr/web-large/DP-23263-005.jpg",
    tags: ["sculpture", "greek-and-roman", "kouros", "archaic"],
  }),
  metWork({
    id: "met-panathenaic",
    metObjectId: "248902",
    accession: "14.130.12",
    name: "Terracotta Panathenaic prize amphora",
    calloutLabel: "Panathenaic Amphora",
    summary: "c. 530 BCE prize jar for the Panathenaic Games (Euphiletos Painter).",
    description:
      "Black-figure amphora awarded filled with sacred olive oil. Athena and a footrace on opposite sides. Accession 14.130.12.",
    startYear: -530,
    portraitUrl: "https://images.metmuseum.org/CRDImages/gr/web-large/DP245711.jpg",
    tags: ["ceramics", "greek-and-roman", "panathenaic"],
  }),
  metWork({
    id: "met-unicorn-garden",
    metObjectId: "467642",
    accession: "37.80.6",
    name: "The Unicorn Rests in a Garden",
    calloutLabel: "Unicorn",
    summary: "c. 1495–1505 Unicorn Tapestries — enclosed garden, captive unicorn.",
    description:
      "Cloisters masterpiece from the Unicorn Tapestries series. Millefleurs ground, fence, and the unicorn under a tree. Accession 37.80.6.",
    startYear: 1495,
    portraitUrl: "https://images.metmuseum.org/CRDImages/cl/web-large/DP118991.jpg",
    tags: ["tapestry", "the-cloisters", "medieval", "unicorn"],
  }),

  // —— Additional verified Open Access (Met Collection API, isPublicDomain=true) ——
  metWork({
    id: "met-sunflowers",
    metObjectId: "436524",
    accession: "49.41",
    name: "Sunflowers",
    calloutLabel: "Sunflowers",
    summary: "1887 van Gogh cut sunflowers against a blue ground.",
    description:
      "Vincent van Gogh’s Paris-era sunflower still life (accession 49.41). Distinct from the Arles series — verified Open Access via Met API object 436524.",
    startYear: 1887,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-41223-001.jpg",
    tags: ["painting", "european-paintings", "van-gogh", "still-life"],
  }),
  metWork({
    id: "met-madame-roulin",
    metObjectId: "459123",
    accession: "1975.1.231",
    name: "Madame Roulin and Her Baby",
    calloutLabel: "Madame Roulin",
    summary: "1888 van Gogh double portrait of Augustine Roulin and infant Marcelle.",
    description:
      "Robert Lehman Collection canvas of the postman’s wife and child. Accession 1975.1.231 (object 459123).",
    startYear: 1888,
    portraitUrl: "https://images.metmuseum.org/CRDImages/rl/web-large/DT3154.jpg",
    tags: ["painting", "lehman", "van-gogh", "portrait"],
  }),
  metWork({
    id: "met-penitent-magdalen",
    metObjectId: "436839",
    accession: "1978.517",
    name: "The Penitent Magdalen",
    calloutLabel: "Magdalen",
    summary: "c. 1640 Georges de La Tour candlelit meditation.",
    description:
      "La Tour’s quiet Magdalen with skull and oil lamp — Caravaggesque calm without crowd. Accession 1978.517.",
    startYear: 1635,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-27910-001.jpg",
    tags: ["painting", "european-paintings", "la-tour"],
  }),
  metWork({
    id: "met-sabine-women",
    metObjectId: "437329",
    accession: "46.160",
    name: "The Abduction of the Sabine Women",
    calloutLabel: "Sabines",
    summary: "c. 1633–34 Poussin Roman legend in staged tumult.",
    description:
      "Nicolas Poussin’s choreographed abduction scene — classical narrative as diagram of bodies. Accession 46.160.",
    startYear: 1633,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-29324-001.jpg",
    tags: ["painting", "european-paintings", "poussin"],
  }),
  metWork({
    id: "met-monet-family",
    metObjectId: "436965",
    accession: "1976.201.14",
    name: "The Monet Family in Their Garden at Argenteuil",
    calloutLabel: "Monet Family",
    summary: "1874 Manet visit to Monet’s Argenteuil garden — friendship as plein-air.",
    description:
      "Édouard Manet painting Claude Monet’s household outdoors the same summer as Boating. Accession 1976.201.14.",
    startYear: 1874,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-25465-001.jpg",
    tags: ["painting", "european-paintings", "manet", "impressionism"],
  }),
  metWork({
    id: "met-rest-egypt",
    metObjectId: "436101",
    accession: "49.7.21",
    name: "The Rest on the Flight into Egypt",
    calloutLabel: "Rest on Flight",
    summary: "c. 1512–15 Gerard David forest picnic of the Holy Family.",
    description:
      "Early Netherlandish quietude — Madonna, Child, and Joseph among fruit and forest. Accession 49.7.21.",
    startYear: 1512,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-14936-023.jpg",
    tags: ["painting", "european-paintings", "gerard-david", "northern-renaissance"],
  }),
  metWork({
    id: "met-cezanne-apples",
    metObjectId: "435882",
    accession: "51.112.1",
    name: "Still Life with Apples and a Pot of Primroses",
    calloutLabel: "Cézanne Apples",
    summary: "c. 1890 Cézanne constructive still life — apples, pot, and tilted plane.",
    description:
      "Paul Cézanne’s measured volumes that Cubism would cite. Accession 51.112.1.",
    startYear: 1890,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DT47.jpg",
    tags: ["painting", "european-paintings", "cezanne", "still-life"],
  }),
  metWork({
    id: "met-degas-drying-foot",
    metObjectId: "436172",
    accession: "29.100.36",
    name: "Woman Drying Her Foot",
    calloutLabel: "Drying Foot",
    summary: "1885–86 Degas bather twisting to dry a foot — private gesture publicized.",
    description:
      "Pastel intimacy from the Havemeyer orbit. Accession 29.100.36.",
    startYear: 1885,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP253481.jpg",
    tags: ["painting", "european-paintings", "degas"],
  }),
  metWork({
    id: "met-degas-flowers",
    metObjectId: "436121",
    accession: "29.100.128",
    name: "A Woman Seated beside a Vase of Flowers",
    calloutLabel: "Degas Flowers",
    summary: "1865 Degas (Madame Paul Valpinçon?) — portrait eclipsed by blooms.",
    description:
      "Early Degas experiment: floral still life dominating a half-seen sitter. Accession 29.100.128.",
    startYear: 1865,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-25460-001.jpg",
    tags: ["painting", "european-paintings", "degas", "portrait"],
  }),
  metWork({
    id: "met-oedipus-sphinx",
    metObjectId: "437153",
    accession: "21.134.1",
    name: "Oedipus and the Sphinx",
    calloutLabel: "Oedipus",
    summary: "1864 Gustave Moreau Symbolist cliffside confrontation.",
    description:
      "Moreau’s jeweled myth — Oedipus meeting the winged Sphinx on a rocky ledge. Accession 21.134.1.",
    startYear: 1864,
    portraitUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-14201-023.jpg",
    tags: ["painting", "european-paintings", "moreau", "symbolism"],
  }),
  metWork({
    id: "met-molo-venice",
    metObjectId: "459029",
    accession: "1975.1.87",
    name: "The Molo, Venice, from the Bacino di San Marco",
    calloutLabel: "Molo Venice",
    summary: "c. 1709 Carlevaris view across the Bacino to the Molo.",
    description:
      "Luca Carlevaris veduta from the Robert Lehman Collection — precursor air before Canaletto fame. Accession 1975.1.87.",
    startYear: 1706,
    portraitUrl: "https://images.metmuseum.org/CRDImages/rl/web-large/DT3061.jpg",
    tags: ["painting", "lehman", "carlevaris", "venice"],
  }),
  metWork({
    id: "met-hirschfeld-krater",
    metObjectId: "248904",
    accession: "14.130.14",
    name: "Terracotta krater (Hirschfeld Workshop)",
    calloutLabel: "Hirschfeld Krater",
    summary: "c. 750–735 BCE monumental Geometric funeral vase.",
    description:
      "Attic Geometric krater with prothesis and chariot frieze — defining late Geometric funerary art. Accession 14.130.14.",
    startYear: -750,
    portraitUrl: "https://images.metmuseum.org/CRDImages/gr/web-large/DP-42350-001.jpg",
    tags: ["ceramics", "greek-and-roman", "geometric"],
  }),
  metWork({
    id: "met-lion-nubian",
    metObjectId: "544226",
    accession: "31.4.4",
    name: "Statuette of lion holding a Nubian captive",
    calloutLabel: "Lion Captive",
    summary: "c. 1850–1550 BCE ivory/ebony lion subduing a captive.",
    description:
      "Small Egyptian prestige carving — predator and prisoner as political emblem. Accession 31.4.4.",
    startYear: -1850,
    portraitUrl: "https://images.metmuseum.org/CRDImages/eg/web-large/DP303604.jpg",
    tags: ["sculpture", "egyptian-art", "nubia"],
  }),
];

const WORK_IDS = metEntities.filter((e) => e.kind === "work").map((e) => e.id);

export const metLinks: AtlasLink[] = [
  ...WORK_IDS.map(
    (id, i): AtlasLink => ({
      id: `met-housed-${i + 1}`,
      from: id,
      to: "met-museum",
      rel: "housed_at",
      year: 2025,
      note: "Met Open Access collection object.",
    }),
  ),
  {
    id: "met-near-washington-socrates",
    from: "met-washington-crossing",
    to: "met-death-of-socrates",
    rel: "valued_among",
    note: "Same Met Open Access highlight peer set.",
  },
  {
    id: "met-near-aristotle-straw",
    from: "met-aristotle-homer",
    to: "met-straw-hat",
    rel: "valued_among",
  },
  {
    id: "met-vg-wheat-cypress",
    from: "met-wheat-cypresses",
    to: "met-cypresses",
    rel: "related",
    year: 1889,
    note: "Same Saint-Rémy season.",
  },
  {
    id: "met-vermeer-pair",
    from: "met-water-pitcher",
    to: "met-maid-asleep",
    rel: "related",
    note: "Both Vermeer interiors at The Met.",
  },
  {
    id: "met-vg-sunflowers-roulin",
    from: "met-sunflowers",
    to: "met-madame-roulin",
    rel: "related",
    year: 1888,
    note: "van Gogh Open Access pair at The Met.",
  },
  {
    id: "met-manet-boating-family",
    from: "met-boating",
    to: "met-monet-family",
    rel: "related",
    year: 1874,
    note: "Same Argenteuil summer.",
  },
  {
    id: "met-degas-dance-flowers",
    from: "met-dance-class",
    to: "met-degas-flowers",
    rel: "related",
    note: "Degas rehearsal room and early floral portrait.",
  },
];

export const metMuseumScene: AtlasScene = {
  id: "met-open-access",
  title: "Met Open Access",
  subtitle: "Public-domain monuments on Fifth Avenue",
  year: 2025,
  center: { lat: 40.7794, lng: -73.9632 },
  zoom: 13,
  badge: "Met Open Access",
  calloutIds: [
    "met-museum",
    "met-washington-crossing",
    "met-death-of-socrates",
    "met-aristotle-homer",
    "met-straw-hat",
    "met-sunflowers",
    "met-juan-de-pareja",
    "met-water-pitcher",
    "met-harvesters",
    "met-madame-x",
    "met-wheat-cypresses",
    "met-cezanne-apples",
    "met-penitent-magdalen",
    "met-temple-dendur",
    "met-view-of-toledo",
    "met-unicorn-garden",
    "met-kouros",
    "met-hirschfeld-krater",
    "met-hatshepsut",
  ],
  focusId: "met-washington-crossing",
};
