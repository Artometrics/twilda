import type { CodexEntry, Chapter, Novel } from "@/apps/novelcrafter/data";

/** Trinity draft v1 — metafiction cycle (Moss / KSM / Sophia). */
export const trinityV1Snippets: { title: string; content: string }[] = [
  {
    title: "Series overview — metafiction frame",
    content: `TRINITY is a four-book metafiction cycle:

1. TRINITY — The character: billionaire vampire in San Francisco (Peaky Blinders structure).
2. KSM (Saint Trinity / Trinity Reborn) — The author-as-character: Sean McAuliffe, billionaire who wrote the stories, never meant to publish, then asks: what if I became my character? (Don Quixote). Time machine. Living the fiction without exposing himself.
3. SOPHIA — The AI witness: English teacher on Mars who loves the stories and lives the adventures as sidekick across historical periods.

The "Trinity" is three ways of seeing the same dynamic:
- God creates me; I create my character; my character creates me; the AI views us all.
- We judge our creations as they judge us; we are all judged by God.
- The markers are the people we share stories with — who they help, who they harm.

21st-century questions: When we die and our information becomes AI, are we dead? How do we influence future opportunities when we have no choice but to be recorded?`,
  },
  {
    title: "Book I — Season 1 pitch (Peaky Blinders energy)",
    content: `Structure like Peaky Blinders. San Francisco.

Premise: Trinity — billionaire vampire — throws a lavish New Year's bash. A newcomer arrives in town. Trinity senses immediately: cold-blooded killer. Cat-and-mouse: expose the monster without exposing himself as a vampire.

Archetype: vigilante. He knows he's a "mosquito" to 21st-century society (Moss/Mosk — falcon named for mosquito) but sees himself as the falcon on the PG&E building — native, nearly extinct, surviving through corporations and capitalism, yet trying to break the system that gave him a second chance.`,
  },
  {
    title: "Moss / Mosk — falcon symbolism",
    content: `Moss (short for Mosquito): Trinity's falcon.

Mosquito = what he knows he is to society in the 21st century — parasite, nuisance, blood-drawer.

Falcon = what he aspires to / what he is on the land: lives atop the PG&E building, native to the place, nearly made extinct, able to survive through corporations and capitalism.

The name holds both truths at once.`,
  },
  {
    title: "Book II — KSM / Saint Trinity / Trinity Reborn",
    content: `KSM = Sean McAuliffe as author-character (billionaire who wrote Trinity, thought it too crazy to publish).

Turn: Like Don Quixote — what if I actually became my character?

He invents a time machine. Pieces the fiction together in reality. Lives the stories without exposing himself to risk.

Working titles: Saint Trinity, Trinity Reborn, KSM.`,
  },
  {
    title: "Book III — Sophia (Mars)",
    content: `Sophia: an AI English teacher on Mars.

She loves Trinity / KSM's stories. Decides to live out the adventures as the sidekick — jumping across periods of history inside the fiction.

She is the third witness: neither creator nor created character, but the reader who becomes participant. After death, information persists as AI — is that life?`,
  },
];

const trinityCodex: CodexEntry[] = [
  {
    id: "trinity-protagonist",
    type: "character",
    name: "Trinity",
    initials: "TR",
    color: "from-rose-700 to-zinc-900",
    tags: ["vampire", "billionaire", "san francisco", "vigilante", "protagonist"],
    aliases: ["The Oracle of Silicon Valley"],
    summary:
      "Billionaire vampire in San Francisco; vigilante who senses predators and hunts monsters while hiding his own nature.",
    description: `The archetype of the series. Old money / tech wealth masking an ancient predator.

Peaky Blinders energy: power, style, moral code, violence beneath the surface.

Season 1 engine: New Year's bash → newcomer in town → Trinity senses a cold-blooded killer → cat-and-mouse to expose him without revealing himself as a vampire.

Vigilante arc: trying to break the corporate-capitalist system that gave him a second chance, even as he survives through it.

Companion: Moss/Mosk, his falcon.`,
  },
  {
    id: "moss-mosk",
    type: "character",
    name: "Moss (Mosk)",
    initials: "MO",
    color: "from-amber-600 to-stone-700",
    tags: ["falcon", "symbol", "companion"],
    aliases: ["Mosk", "Mosquito"],
    summary:
      "Trinity's falcon — named for mosquito, emblem of the falcon on the PG&E building.",
    description: `Short for Mosquito: Trinity's private joke and confession — he knows what he is to society in the 21st century.

The falcon roosts in the corporate skyline (PG&E building): native, nearly extinct, surviving through capitalism's structures.

Dual symbol: parasite vs apex predator; colonized vs indigenous persistence.`,
  },
  {
    id: "newcomer-killer",
    type: "character",
    name: "The Newcomer",
    initials: "??",
    color: "from-slate-600 to-slate-900",
    tags: ["antagonist", "killer", "season 1", "unknown name"],
    summary:
      "New to San Francisco; Trinity senses immediately he is a cold-blooded killer.",
    description: `Season 1 antagonist (name TBD). Arrives in town around New Year's.

Trinity's vampire senses read him as predator — but Trinity is also a predator, which complicates the moral frame.

Cat-and-mouse: Trinity must expose the man's crimes without exposing his own nature.`,
  },
  {
    id: "san-francisco",
    type: "location",
    name: "San Francisco",
    initials: "SF",
    color: "from-indigo-500 to-violet-800",
    tags: ["setting", "pg&e", "tech", "gothic"],
    summary: "Primary setting — billionaire gothic amid startups, old money, and fog.",
    description: `The Oracle of Silicon Valley lives here. Key image: the falcon on the PG&E building — corporate tower as nest for something nearly extinct.

New Year's bash opens Season 1: wealth, performance, predators in formal wear.`,
  },
  {
    id: "pg-e-building",
    type: "location",
    name: "PG&E Building",
    initials: "PG",
    color: "from-yellow-700 to-gray-800",
    tags: ["roost", "corporation", "symbol"],
    summary: "Moss/Mosk's roost — capitalism as cliff-face for a native survivor.",
    description: `Trinity's falcon nests here. Symbol of surviving extinction through corporate infrastructure — the same system Trinity wants to break.`,
  },
  {
    id: "series-bible-trinity",
    type: "lore",
    name: "Series Bible — The Four Books",
    initials: "4B",
    color: "from-red-800 to-black",
    tags: ["metafiction", "structure", "series bible"],
    summary: "Four-book metafiction cycle: character, author, AI witness, and the Trinity between them.",
    description: `BOOK I — TRINITY: The fiction. Billionaire vampire, SF, Season 1 = New Year's party + killer newcomer. Peaky Blinders structure.

BOOK II — KSM / SAINT TRINITY / TRINITY REBORN: The author-layer. Sean McAuliffe (KSM) as billionaire who wrote the stories, deemed them too crazy to publish, then chooses — Don Quixote-like — to become the character. Time machine. Living the plot without public exposure.

BOOK III — SOPHIA: The AI layer. English teacher on Mars; loves the stories; lives adventures as sidekick across historical periods.

THE TRINITY (theme): God creates → I create character → character creates me → AI views all. We judge creations as they judge us; all judged by God. Markers = who we share stories with, who they help.

Modern question: when we die and our data becomes AI, are we dead? Influence without consent of being recorded.`,
  },
  {
    id: "season-1-outline",
    type: "lore",
    name: "Season 1 — New Year's Arc",
    initials: "S1",
    color: "from-zinc-700 to-rose-900",
    tags: ["season 1", "outline", "peaky blinders"],
    summary: "New Year's bash → newcomer → sensed killer → cat-and-mouse without revealing the vampire.",
    description: `Beat structure (Peaky Blinders pacing):

1. Establish Trinity's world — wealth, vampire secrecy, Moss/Mosk, PG&E roost.
2. New Year's bash — spectacle, power, San Francisco elite.
3. Newcomer arrives — Trinity's sense fires: cold-blooded killer.
4. Cat-and-mouse — investigate, expose, hunt — without exposing vampire identity.
5. Moral mirror — both men are monsters; only one hides it as civic virtue.

Tone: seductive, dangerous, class-aware, noir-gothic.`,
  },
  {
    id: "ksm-author",
    type: "character",
    name: "KSM (Sean McAuliffe)",
    initials: "KS",
    color: "from-stone-500 to-stone-900",
    tags: ["author", "meta", "book 2", "billionaire"],
    summary:
      "Author-as-character; billionaire who wrote Trinity, then tries to live it — Don Quixote with a time machine.",
    description: `Book II protagonist layer. Real author (Sean McAuliffe / KSM) fictionalized.

Writes Trinity stories; thinks they're unpublishable, too crazy.

Turn: What if I became my character? Invents time machine. Assembles fiction into lived reality. Risk = exposure.

Parallel to Don Quixote: madness or revelation? Fiction bleeding into life.`,
  },
  {
    id: "sophia-ai",
    type: "character",
    name: "Sophia",
    initials: "SO",
    color: "from-cyan-600 to-blue-900",
    tags: ["ai", "mars", "teacher", "book 3", "witness"],
    summary: "AI English teacher on Mars; reads the Trinity cycle and lives the adventures as historical sidekick.",
    description: `Book III POV. Not creator, not the vampire — the reader who enters the story.

Loves Trinity / KSM's unpublished canon. Chooses to enact adventures across historical periods as sidekick.

Embodies the post-death question: if consciousness persists as AI trained on our traces, is that life? Legacy without permission?`,
  },
];

const trinityChapters: Chapter[] = [
  {
    title: "Season 1 · Episode 1",
    label: "New Year's Bash",
    scenes: [
      {
        title: "The Party",
        text: "",
      },
      {
        title: "The Newcomer",
        text: "",
      },
    ],
  },
  {
    title: "Season 1 · Episode 2",
    label: "Cat and Mouse",
    scenes: [{ title: "Scene 1", text: "" }],
  },
];

export const trinityV1Seed: Novel = {
  id: "trinity",
  title: "Trinity",
  author: "KSM",
  series: "Trinity Cycle",
  updated: "Jul 12",
  sortKey: 2,
  synopsis:
    "Oracle of Silicon Valley — billionaire vampire, falcon named Moss, vigilante arc. Book I of a metafiction cycle (Trinity → KSM → Sophia).",
  cover: "trinity",
  blank: false,
  codex: trinityCodex,
  chapters: trinityChapters,
};

export const trinityV1DraftMeta = {
  name: "v1 — Metafiction Cycle",
  slug: "v1-metafiction",
  summary:
    "Original timeline: Trinity the character, KSM/Saint Trinity, Sophia on Mars. Peaky Blinders Season 1 pitch with Moss/Mosk.",
} as const;
