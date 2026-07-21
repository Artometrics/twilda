// Novelcrafter-style data layer.
// Gatsby is a fully populated example; Trinity and Cardinal are seeded templates.

import { trinitySeed as trinity } from "@/lib/novels/trinity-seed";
import { cardinalSeed } from "@/lib/novels/cardinal-seed";

export type CodexType = "character" | "location" | "lore" | "other";

export interface CodexEntry {
  id: string;
  type: CodexType;
  name: string;
  /** Two-letter fallback avatar initials */
  initials: string;
  /** tailwind-ish gradient class used for the avatar chip */
  color: string;
  tags: string[];
  summary: string;
  description: string;
  aliases?: string[];
  mentions?: number;
}

export interface Scene {
  title: string;
  text: string;
  /** Present when loaded from database */
  id?: string;
  /** HTML content from database */
  content?: string;
}

export interface Chapter {
  title: string;
  label?: string;
  scenes: Scene[];
}

export interface Novel {
  id: string;
  title: string;
  author: string;
  series?: string;
  updated: string;
  /** Higher = more recently updated (for library sort) */
  sortKey: number;
  synopsis: string;
  cover: CoverKind;
  blank?: boolean;
  codex: CodexEntry[];
  chapters: Chapter[];
}

export type CoverKind = "gatsby" | "cardinal" | "trinity" | "plain";

export function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function novelWordCount(novel: Novel): number {
  return novel.chapters.reduce(
    (sum, ch) => sum + ch.scenes.reduce((s, sc) => s + wordCount(sc.text), 0),
    0,
  );
}

export function codexCount(novel: Novel, type: CodexType): number {
  return novel.codex.filter((e) => e.type === type).length;
}

// --- Gatsby manuscript (generated from content/gatsby/*.txt) ---
import { gatsbyChapters as gatsbyChapterData } from "./gatsby-chapters";

const gatsbyChapters: Chapter[] = gatsbyChapterData.map((ch) => ({
  title: ch.title,
  scenes: ch.scenes.map((sc) => ({ title: sc.title, text: sc.text })),
}));

const gatsbyCodex: CodexEntry[] = [
  // Characters
  {
    id: "nick-carraway",
    type: "character",
    name: "Nick Carraway",
    initials: "NC",
    color: "from-sky-500 to-indigo-600",
    tags: ["narrator", "yale", "bonds", "midwest", "west egg"],
    aliases: ["Nick", "Carraway", "old sport"],
    mentions: 312,
    summary:
      "The novel's narrator; a Yale graduate and bond salesman from the Midwest who rents a house next to Gatsby.",
    description:
      "Nick Carraway is the reserved, observant narrator of the story. A Midwesterner and Yale graduate, he moves to West Egg in the summer of 1922 to learn the bond business and rents a modest bungalow beside Gatsby's mansion. Cousin to Daisy and an old acquaintance of Tom, he becomes the bridge between the novel's social worlds — and the one person Gatsby trusts. He prides himself on being 'one of the few honest people' he has ever known.",
  },
  {
    id: "jay-gatsby",
    type: "character",
    name: "Jay Gatsby",
    initials: "JG",
    color: "from-amber-400 to-yellow-600",
    tags: ["protagonist", "new money", "bootlegger", "west egg", "obsession"],
    aliases: ["Jay Gatsby", "James Gatz", "old sport", "Mr. Gatsby"],
    mentions: 287,
    summary:
      "A mysteriously wealthy young man who throws lavish parties, all in pursuit of rekindling his love for Daisy Buchanan.",
    description:
      "Born James Gatz to poor North Dakota farmers, Gatsby reinvented himself into a fabulously rich socialite through bootlegging and shadowy business with Meyer Wolfsheim. He hosts extravagant weekly parties at his West Egg mansion, hoping Daisy will one day wander in. His whole fortune and persona are a monument to a single dream: to repeat the past and win her back. His relentless, romantic idealism is both his greatness and his undoing.",
  },
  {
    id: "daisy-buchanan",
    type: "character",
    name: "Daisy Buchanan",
    initials: "DB",
    color: "from-rose-300 to-fuchsia-500",
    tags: ["east egg", "old money", "louisville", "nick's cousin"],
    aliases: ["Daisy", "Daisy Fay"],
    mentions: 198,
    summary:
      "Nick's cousin and Gatsby's lost love; beautiful, charming, and careless, married to the wealthy Tom Buchanan.",
    description:
      "Daisy Fay Buchanan is Gatsby's golden idol — a woman whose voice is 'full of money.' Charming and effervescent yet ultimately shallow and self-preserving, she chose the security of Tom's old-money world over waiting for Gatsby. Her reunion with Gatsby reignites their affair, but when tragedy strikes she retreats into her marriage, leaving others to pay for her carelessness.",
  },
  {
    id: "tom-buchanan",
    type: "character",
    name: "Tom Buchanan",
    initials: "TB",
    color: "from-stone-500 to-neutral-700",
    tags: ["east egg", "old money", "antagonist", "yale", "polo"],
    aliases: ["Tom", "Buchanan"],
    mentions: 156,
    summary:
      "Daisy's arrogant, hulking husband; a former Yale football star with old money, racist views, and a mistress.",
    description:
      "Tom Buchanan is a powerful, aggressive man of inherited wealth and casual cruelty. A former Yale football star, he keeps a mistress (Myrtle Wilson) while professing outrage at Daisy's affair. He espouses pseudo-scientific racism and uses his money and physical presence to dominate everyone around him. He embodies the entrenched arrogance of the established elite.",
  },
  {
    id: "jordan-baker",
    type: "character",
    name: "Jordan Baker",
    initials: "JB",
    color: "from-emerald-400 to-teal-600",
    tags: ["golfer", "east egg", "nick's love interest", "socialite"],
    aliases: ["Jordan", "Miss Baker"],
    mentions: 92,
    summary:
      "A cynical professional golfer and friend of Daisy who becomes romantically involved with Nick.",
    description:
      "Jordan Baker is a modern, self-sufficient 'new woman' of the 1920s — a professional golfer rumored to have cheated to win a tournament. Cool, dishonest, and aloof, she has a brief romance with Nick and helps orchestrate Gatsby and Daisy's reunion. Her worldly detachment mirrors the moral carelessness of her social set.",
  },
  {
    id: "myrtle-wilson",
    type: "character",
    name: "Myrtle Wilson",
    initials: "MW",
    color: "from-red-400 to-rose-600",
    tags: ["valley of ashes", "tom's mistress", "garage"],
    aliases: ["Myrtle"],
    mentions: 61,
    summary:
      "George Wilson's wife and Tom's mistress, desperate to escape the Valley of Ashes for a life of wealth.",
    description:
      "Myrtle Wilson is the vital, sensual wife of garage owner George Wilson and Tom Buchanan's mistress. She longs to rise above the grim Valley of Ashes and mistakes Tom's attention for a path into his world. Her affair and her tragic death in a hit-and-run set the novel's climax in motion.",
  },
  {
    id: "george-wilson",
    type: "character",
    name: "George Wilson",
    initials: "GW",
    color: "from-zinc-400 to-slate-600",
    tags: ["valley of ashes", "mechanic", "myrtle's husband"],
    aliases: ["George", "Wilson"],
    mentions: 44,
    summary:
      "A worn-down garage owner in the Valley of Ashes, husband of Myrtle, driven to despair by her death.",
    description:
      "George Wilson runs a failing garage in the Valley of Ashes beneath the eyes of Doctor T. J. Eckleburg. Exhausted and colorless, he is crushed by the discovery of his wife's affair and destroyed by her death. Misled into believing Gatsby was both her lover and killer, he commits the novel's final act of violence.",
  },
  {
    id: "meyer-wolfsheim",
    type: "character",
    name: "Meyer Wolfsheim",
    initials: "MW",
    color: "from-purple-400 to-violet-700",
    tags: ["gambler", "gangster", "new york", "1919 world series"],
    aliases: ["Wolfsheim", "Wolfshiem"],
    mentions: 18,
    summary:
      "A gambler and Gatsby's business associate, reputed to have fixed the 1919 World Series.",
    description:
      "Meyer Wolfsheim is a shadowy New York gambler and Gatsby's mentor in the criminal underworld, famously said to have fixed the 1919 World Series. He wears cufflinks made of human molars and represents the corrupt machinery beneath Gatsby's fortune. Tellingly, he refuses to attend Gatsby's funeral.",
  },
  // Locations
  {
    id: "west-egg",
    type: "location",
    name: "West Egg",
    initials: "WE",
    color: "from-amber-400 to-orange-600",
    tags: ["long island", "new money", "gatsby's mansion"],
    aliases: ["West Egg"],
    mentions: 47,
    summary:
      "The 'less fashionable' Long Island community of the newly rich, home to Gatsby and Nick.",
    description:
      "West Egg is the home of the nouveau riche — those with flashy, self-made fortunes and no inherited pedigree. Gatsby's gaudy imitation-Hôtel-de-Ville mansion and Nick's small bungalow sit here, across the bay from the old-money enclave of East Egg. It symbolizes ambition, spectacle, and social striving.",
  },
  {
    id: "east-egg",
    type: "location",
    name: "East Egg",
    initials: "EE",
    color: "from-emerald-400 to-green-700",
    tags: ["long island", "old money", "buchanans"],
    aliases: ["East Egg"],
    mentions: 33,
    summary:
      "The fashionable enclave of established, inherited wealth across the bay, home to Tom and Daisy.",
    description:
      "East Egg is the domain of old money — refined, established, and quietly contemptuous of the strivers across the water. The Buchanans' elegant Georgian Colonial mansion stands here. It represents inherited privilege, tradition, and the closed doors of the American aristocracy.",
  },
  {
    id: "valley-of-ashes",
    type: "location",
    name: "The Valley of Ashes",
    initials: "VA",
    color: "from-neutral-500 to-zinc-700",
    tags: ["desolation", "wilson's garage", "eckleburg"],
    aliases: ["Valley of Ashes"],
    mentions: 21,
    summary:
      "A grim industrial wasteland between West Egg and New York, watched over by Eckleburg's eyes.",
    description:
      "A desolate stretch of ash heaps and gray dust lying between the Eggs and Manhattan, presided over by the fading billboard eyes of Doctor T. J. Eckleburg. Home to the Wilsons, it embodies the moral and social decay hidden beneath the Jazz Age's glitter and the human cost of the rich's pursuit of pleasure.",
  },
  {
    id: "gatsby-mansion",
    type: "location",
    name: "Gatsby's Mansion",
    initials: "GM",
    color: "from-yellow-400 to-amber-600",
    tags: ["west egg", "parties", "spectacle"],
    aliases: ["Gatsby's house"],
    mentions: 38,
    summary:
      "Gatsby's enormous West Egg estate, the site of his legendary summer parties.",
    description:
      "A colossal, factual imitation of a French château, complete with a tower, marble pool, and forty acres of lawn. Every Saturday night it blazes with music and hundreds of uninvited guests. The mansion is a stage built entirely to attract Daisy's attention across the bay.",
  },
  {
    id: "plaza-hotel",
    type: "location",
    name: "The Plaza Hotel",
    initials: "PH",
    color: "from-rose-400 to-red-600",
    tags: ["manhattan", "confrontation", "chapter vii"],
    aliases: ["The Plaza"],
    mentions: 9,
    summary:
      "The Manhattan hotel where Tom and Gatsby's rivalry erupts into a decisive confrontation.",
    description:
      "In a sweltering suite at the Plaza Hotel, the tension between Tom and Gatsby finally boils over. Tom exposes Gatsby's bootlegging past and forces Daisy to choose — a confrontation that shatters Gatsby's dream and sets the tragic ending in motion.",
  },
  // Lore
  {
    id: "green-light",
    type: "lore",
    name: "The Green Light",
    initials: "GL",
    color: "from-green-400 to-emerald-600",
    tags: ["symbol", "hope", "daisy's dock", "the future"],
    mentions: 7,
    summary:
      "The green light at the end of Daisy's dock — Gatsby's beacon of hope and longing.",
    description:
      "The green light burning at the end of the Buchanans' dock is the novel's central symbol. To Gatsby it represents Daisy and the future he reaches for across the water. More broadly it stands for the American Dream itself — the ever-receding 'orgastic future' we strain toward but can never grasp.",
  },
  {
    id: "eckleburg-eyes",
    type: "lore",
    name: "Eyes of Doctor T. J. Eckleburg",
    initials: "TJ",
    color: "from-cyan-400 to-blue-600",
    tags: ["symbol", "billboard", "valley of ashes", "god"],
    mentions: 6,
    summary:
      "A faded billboard of giant spectacled eyes overlooking the Valley of Ashes.",
    description:
      "An old oculist's billboard — a pair of enormous blue eyes behind yellow spectacles — broods over the Valley of Ashes. To the grieving George Wilson the eyes become the eyes of God, a silent, all-seeing judgment on the moral emptiness of the world below.",
  },
  {
    id: "american-dream",
    type: "lore",
    name: "The American Dream",
    initials: "AD",
    color: "from-red-400 via-white to-blue-500",
    tags: ["theme", "self-invention", "class", "money"],
    summary:
      "The novel's central theme: the promise — and corruption — of self-made success.",
    description:
      "Gatsby's rise from James Gatz to fabulous wealth embodies the American Dream of self-invention. Fitzgerald presents that dream as both intoxicating and hollow: material success cannot buy love, class, or the past, and the pursuit of it leaves ruin in its wake.",
  },
  {
    id: "prohibition",
    type: "lore",
    name: "Prohibition & Bootlegging",
    initials: "PB",
    color: "from-amber-500 to-orange-700",
    tags: ["1920s", "crime", "gatsby's fortune"],
    summary:
      "The 1920s ban on alcohol that fueled organized crime — and Gatsby's hidden fortune.",
    description:
      "The Eighteenth Amendment's ban on alcohol created a vast black market that made bootleggers rich overnight. Gatsby's fortune, built with Wolfsheim through drugstores selling illegal liquor, ties his glittering new-money world directly to organized crime.",
  },
  // Others
  {
    id: "jazz-age",
    type: "other",
    name: "The Jazz Age",
    initials: "JA",
    color: "from-fuchsia-400 to-purple-600",
    tags: ["1922", "setting", "roaring twenties"],
    summary:
      "The exuberant, morally loose cultural era of 1920s America in which the novel is set.",
    description:
      "The Roaring Twenties: a post-war boom of jazz, cocktails, fast cars, and loosened social codes. Fitzgerald, who coined the term 'Jazz Age,' captures both its dazzling energy and the spiritual emptiness humming beneath the parties.",
  },
  {
    id: "the-automobile",
    type: "other",
    name: "The Automobile",
    initials: "AU",
    color: "from-yellow-400 to-amber-600",
    tags: ["symbol", "carelessness", "gatsby's car"],
    summary:
      "Motorcars as symbols of reckless wealth — culminating in the fatal accident.",
    description:
      "Cars race through the novel as emblems of the era's speed and carelessness. Gatsby's opulent yellow Rolls-Royce is a showpiece of his wealth and, ultimately, the instrument of Myrtle's death — the reckless machine that drives the tragedy home.",
  },
];

const gatsby: Novel = {
  id: "the-great-gatsby",
  title: "The Great Gatsby",
  author: "F. Scott Fitzgerald",
  updated: "Jul 10",
  sortKey: 3,
  synopsis:
    "A bond salesman new to Long Island is drawn into the dazzling, doomed world of his mysterious neighbor Jay Gatsby, whose fortune and glittering parties conceal a single obsession: to win back the love he lost, Daisy Buchanan.",
  cover: "gatsby",
  codex: gatsbyCodex,
  chapters: gatsbyChapters,
};

export { gatsby };
export { trinitySeed as trinity } from "@/lib/novels/trinity-seed";

const cardinal: Novel = cardinalSeed;

export const novels: Novel[] = [gatsby, trinity, cardinal];

export function getNovel(id: string): Novel | undefined {
  return novels.find((n) => n.id === id);
}

export const codexOrder: { type: CodexType; label: string }[] = [
  { type: "character", label: "Characters" },
  { type: "location", label: "Locations" },
  { type: "lore", label: "Lore" },
  { type: "other", label: "Others" },
];
