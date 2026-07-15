/**
 * Celtic Ogham / Druid tree calendar.
 * Based on the Celtic tree calendar — 13 lunar months, each associated with a sacred tree.
 * Note: The "Celtic tree astrology" popularized today is largely a 20th-century romantic invention
 * attributed to Robert Graves' "The White Goddess" (1948), not attested ancient practice.
 * We present it as a symbolic / poetic system for personal reflection.
 */

export interface DruidTree {
  tree: string;
  oghamLetter: string;
  symbol: string;
  dateRange: string;
  meaning: string;
  keywords: string[];
  lore: string;
}

const DRUID_TREES: (DruidTree & { startMD: [number, number]; endMD: [number, number] })[] = [
  {
    tree: "Birch", oghamLetter: "Beith", symbol: "ᚁ",
    startMD: [12, 24], endMD: [1, 20],
    dateRange: "Dec 24 – Jan 20",
    meaning: "New beginnings, renewal, purification",
    keywords: ["renewal", "clarity", "beginnings", "youth"],
    lore: "The Birch is the first tree to grow after fire — the pioneer. Its white bark strips away old layers; writing on birch bark is one of the oldest forms of human record. In Celtic tradition it governs the winter solstice and the rebirth of light.",
  },
  {
    tree: "Rowan", oghamLetter: "Luis", symbol: "ᚂ",
    startMD: [1, 21], endMD: [2, 17],
    dateRange: "Jan 21 – Feb 17",
    meaning: "Vision, protection, quickening",
    keywords: ["protection", "vision", "divination", "insight"],
    lore: "Rowan berries form a natural pentagram. Planted outside doors to ward off evil; carried by druids on journeys. Its quickening energy breaks the deep freeze of winter.",
  },
  {
    tree: "Ash", oghamLetter: "Nion", symbol: "ᚅ",
    startMD: [2, 18], endMD: [3, 17],
    dateRange: "Feb 18 – Mar 17",
    meaning: "Connection, the world tree, destiny",
    keywords: ["connection", "fate", "weaving", "world-tree"],
    lore: "Yggdrasil, the Norse world tree, is an Ash. The Ash bridges the worlds — its roots reach the underworld, its branches the sky. Those born to Ash are drawn to see the pattern beneath the surface.",
  },
  {
    tree: "Alder", oghamLetter: "Fearn", symbol: "ᚃ",
    startMD: [3, 18], endMD: [4, 14],
    dateRange: "Mar 18 – Apr 14",
    meaning: "Resilience, foundations, oracular power",
    keywords: ["foundations", "resilience", "bridge-builder", "oracle"],
    lore: "Alder wood hardens in water — the foundations of Venice were Alder piles. It bridges land and water, the seen and unseen. The Alder flute was said to coax the wind.",
  },
  {
    tree: "Willow", oghamLetter: "Saille", symbol: "ᚄ",
    startMD: [4, 15], endMD: [5, 12],
    dateRange: "Apr 15 – May 12",
    meaning: "Intuition, dreaming, the lunar feminine",
    keywords: ["intuition", "dreaming", "moon", "grief", "feeling"],
    lore: "The Willow weeps into water and bends without breaking. Sacred to the moon goddess. Willow bark gave us aspirin; the tree has healed pain across cultures. Those born to Willow carry deep feeling and prophetic dreaming.",
  },
  {
    tree: "Hawthorn", oghamLetter: "Huath", symbol: "ᚆ",
    startMD: [5, 13], endMD: [6, 9],
    dateRange: "May 13 – Jun 9",
    meaning: "Cleansing, contradiction, the threshold",
    keywords: ["threshold", "contradiction", "heart", "Beltane"],
    lore: "Hawthorn blooms at Beltane — a plant of paradox: beautiful flowers with sharp thorns. To cut one down invites ill luck. It marks the boundary between worlds. Those born to Hawthorn carry creative tension.",
  },
  {
    tree: "Oak", oghamLetter: "Duir", symbol: "ᚇ",
    startMD: [6, 10], endMD: [7, 7],
    dateRange: "Jun 10 – Jul 7",
    meaning: "Strength, sovereignty, the solstice king",
    keywords: ["strength", "sovereignty", "endurance", "truth"],
    lore: "The Oak is the chief sacred tree of the druids — its groves were their cathedrals. Mistletoe growing on an oak was especially potent. The Oak is the door (duir) between worlds. Born near the summer solstice: the strongest light.",
  },
  {
    tree: "Holly", oghamLetter: "Tinne", symbol: "ᚈ",
    startMD: [7, 8], endMD: [8, 4],
    dateRange: "Jul 8 – Aug 4",
    meaning: "Balance, the waning year, sacrifice",
    keywords: ["balance", "sacrifice", "waning", "protection"],
    lore: "The Holly King takes over from the Oak at midsummer — the waxing year turns toward the dark. Holly protects against lightning and malice. Those born here are balanced between giving and taking.",
  },
  {
    tree: "Hazel", oghamLetter: "Coll", symbol: "ᚉ",
    startMD: [8, 5], endMD: [9, 1],
    dateRange: "Aug 5 – Sep 1",
    meaning: "Wisdom, poetry, the sacred salmon",
    keywords: ["wisdom", "knowledge", "poetry", "divination"],
    lore: "Nine hazel trees hang over the Well of Wisdom; their nuts fall into the water and are eaten by the salmon of knowledge. To eat that salmon is to gain all wisdom. Hazel rods are used for dowsing.",
  },
  {
    tree: "Vine", oghamLetter: "Muin", symbol: "ᚋ",
    startMD: [9, 2], endMD: [9, 29],
    dateRange: "Sep 2 – Sep 29",
    meaning: "Harvest, prophecy, inner depths",
    keywords: ["harvest", "prophecy", "inner-truth", "wine"],
    lore: "The Vine is the plant of prophecy and transformation — wine loosens the tongue of the seer. At the autumn equinox, the harvest is weighed. Those born here seek the truth within the intoxicating.",
  },
  {
    tree: "Ivy", oghamLetter: "Gort", symbol: "ᚌ",
    startMD: [9, 30], endMD: [10, 27],
    dateRange: "Sep 30 – Oct 27",
    meaning: "Tenacity, healing, labyrinth",
    keywords: ["tenacity", "labyrinth", "healing", "perseverance"],
    lore: "Ivy clings to ruins and living trees alike — it outlasts both. A symbol of determination that heals old wounds. The labyrinth of Ivy represents the spiral path inward.",
  },
  {
    tree: "Reed", oghamLetter: "Ngetal", symbol: "ᚍ",
    startMD: [10, 28], endMD: [11, 24],
    dateRange: "Oct 28 – Nov 24",
    meaning: "Death and rebirth, Samhain, speech",
    keywords: ["Samhain", "death", "rebirth", "speech", "inner-voice"],
    lore: "Reed grows on the threshold between land and water. Cut, it becomes flute and arrow — the reed speaks. At Samhain, the veil thins; Reed people hear the ancestors.",
  },
  {
    tree: "Elder", oghamLetter: "Ruis", symbol: "ᚏ",
    startMD: [11, 25], endMD: [12, 23],
    dateRange: "Nov 25 – Dec 23",
    meaning: "Endings, the crone, regeneration",
    keywords: ["endings", "crone", "regeneration", "wisdom-of-age"],
    lore: "The Elder is the tree of the year's end — and its beginning. Cutting an Elder without asking permission was considered dangerous. The Elder Mother lives in the wood. From death: wine, medicine, music (Elder flutes).",
  },
];

export type DruidTree = (typeof DRUID_TREES)[number];

export function getDruidTree(month: number, day: number): DruidTree {
  const now: [number, number] = [month, day];
  for (const tree of DRUID_TREES) {
    const [sm, sd] = tree.startMD;
    const [em, ed] = tree.endMD;
    if (sm <= em) {
      if ((month > sm || (month === sm && day >= sd)) && (month < em || (month === em && day <= ed))) {
        return tree;
      }
    } else {
      // Wraps year (Dec 24 → Jan 20)
      if ((month > sm || (month === sm && day >= sd)) || (month < em || (month === em && day <= ed))) {
        return tree;
      }
    }
  }
  return DRUID_TREES[0];
}

export function druidTreeFromBirthDate(month: number, day: number): DruidTree {
  return getDruidTree(month, day);
}
