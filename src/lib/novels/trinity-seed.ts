import type { CodexEntry, Chapter, Novel } from "@/apps/novelcrafter/data";

/** Default snippets saved into Trinity on first open / create. */
export const trinitySnippets: { title: string; content: string }[] = [
  {
    title: "Series bible — logline",
    content: `A centuries-old vampire, now a Silicon Valley billionaire, builds a VR/haptic "time machine" — the Animus — to relive history and hunt the monsters among the tech elite. He wants sainthood; the world will only ever give him suspicion. Each season, a new predator forces him to ask whether he's cleansing the world or just culling his own reflection — until Season 3 forces the harder question: was any of it ever defensible?`,
  },
  {
    title: "Core tensions",
    content: `- Kane's tech is DIY-billionaire, not sleek — off-the-shelf haptics and headbands duct-taped into something dangerous, because the show is about improvisation pretending to be destiny.
- Every season's villain mirrors something Kane is at risk of becoming.
- The real long game: Kane thinks he's hunting monsters one at a time. He's actually the R&D department for someone else's business model.`,
  },
  {
    title: "Season 1 — The Cull (8 episodes)",
    content: `(Retitled from "Mosquito" — the word comes from Julian Voss's own supplement-startup branding: an aggressive dosing protocol marketed as "culling" weak cells. The press adopts it as the killer's nickname, and it's also, quietly, Kane's own justification for what he does.)

1. Pilot — Kane's empire and code established: he only kills the guilty. Bodies surface with a signature only his private model catches. First Animus session.
2. The Animus — Reliving a victim's last hour, Kane's model flags a shell investor — Cole Risk Partners — behind Voss's blood-panel startup. He dismisses it as background noise. (plant #1)
3. Founder Mode — Kane and Voss have dinner, each unaware of the other. Priya quietly notices Cole Risk Partners again in a cap table and says nothing — we don't yet know why.
4. Sainthood — Origin flashback. Voss starts circling someone in Kane's found family.
5. The Cull — Voss threatens to leak Kane's medical anomalies. Kane does something borderline monstrous to protect his secret — the first real crack in "only the guilty."
6. Oracle — Kane stops a murder anonymously. Tips off Voss to how close he's gotten.
7. The Ledger — Reyes pushes Kane (unknowingly) toward handing Voss to the system instead of ending him — for Reyes's own career reasons, not principle. Kane has to choose anyway.
8. Communion — Voss dies; Kane gets no credit. Priya is offered a "consulting fee" by an anonymous party to quietly wipe a data trail — she takes it, not knowing it's Cole cleaning up. Final scene: a job completed across three different faces in one night.`,
  },
  {
    title: "Season 2 — The Many (7 episodes)",
    content: `1. No Fixed Face — Unrelated Bay Area deaths, no repeating pattern. Reyes wants the case for himself and starts working around Kane.
2. Tell — Kane realizes the killer only takes jobs against people who "deserve it" — mirror #1.
3. Root Access — Ren's origin. Kane uses the Animus on a living target for the first time — a line he swore he wouldn't cross.
4. Client List — Ren's payments trace back to Cole Risk Partners. Priya recognizes the name this time — and has to decide whether to tell Kane it's the same firm that paid her. She doesn't, yet.
5. Mirror — Ren takes Kane's own face mid-murder. Kane becomes a public suspect for the first time.
6. Custody — Kane corners Ren, can't finish it, lets Ren run.
7. Absolution — Cost, not clean mercy: with Ren gone, Cole's firm frames an innocent low-level Meridian employee for the season's murders to close the file quietly. Kane lets it happen because exposing the truth would expose himself. Final shot: Cole, on a call, approving the frame job — we finally see her face.`,
  },
  {
    title: "Season 3 — The Handler (8 episodes)",
    content: `1. Message Received — Kane, still carrying the framed employee's fate, is now the one being modeled and hunted. His own Animus gets hacked mid-session.
2. The Firm — Full introduction of Adrienne Cole: her risk-prediction firm sells prevention to the highest bidder, manufacturing the very crises it claims to foresee.
3. Sight Without Wisdom — Kane confirms Voss and Ren were both her instruments — his entire "hunt" has been R&D for her product.
4. Oracle vs. Oracle — Kane and Cole meet directly. She argues, convincingly, that lone vigilante justice doesn't scale and never did — that the world needs someone accountable for prevention, and he's just too proud to be that person under her system.
5. Portfolio — Cole's own origin: she started exactly like Kane, trying to save people directly, and curdled into commodifying it. The clearest "this is what you become" mirror of the series.
6. Exposure — Priya finally admits she took Cole's money years ago. It costs her Kane's trust and nearly costs her his protection — a real fracture, not a clean forgiveness.
7. Blood Debt — To stop Cole's firm from manufacturing a mass-casualty "prevention" event to prove its own value, Kane has to kill one of Cole's assets who is more victim than villain — a direct echo of Ren, except this time he doesn't get to walk away. No mercy beat. He lives with it.
8. The Believing Kind — Cole's firm collapses publicly; Kane gets no credit, as always — but this time it doesn't read as peace, it reads as a man who's no longer sure the last 200 years were ever justified. He doesn't destroy the Animus in a clean gesture — he just stops using it, unresolved. Final shot: Priya, alone, opening a new file with a name in it. Ambiguous, not triumphant.`,
  },
  {
    title: "What changed from v1 and why",
    content: `- Cole is planted from Season 1, Episode 2 instead of arriving cold in Season 3 — she's the show's actual antagonist from the start, just invisible.
- Season 3's ending now costs Kane something real (an unmerciful kill he has to live with) instead of repeating Season 2's "walk away clean" beat.
- Priya and Reyes have their own wants — self-interest, ambition, a past mistake — so Kane isn't the only character with an inner life.
- "The Cull" replaces "Mosquito" as a title that does double duty: it's the villain's branding and an accusation the show quietly aims back at Kane.`,
  },
];

const trinityCodex: CodexEntry[] = [
  {
    id: "marcus-kane",
    type: "character",
    name: "Marcus Aldric Kane",
    initials: "MK",
    color: "from-rose-700 to-zinc-900",
    tags: ["vampire", "billionaire", "protagonist", "meridian", "san francisco"],
    aliases: ["Kane", "The Oracle"],
    summary:
      "200+ year old vampire, CEO of Meridian; builds the Animus to hunt monsters among the tech elite while chasing sainthood the world will never grant him.",
    description: `Centuries-old vampire turned Silicon Valley billionaire. CEO of Meridian, an AI/longevity company whose internal jargon (audits, protocols, "the Cull") he unknowingly hunts to the sound of.

Wants sainthood; the world only ever gives him suspicion. Code: he only kills the guilty — until Season 1 cracks that rule and Season 3 shatters it.

Each season's villain mirrors something he is at risk of becoming. He thinks he's hunting monsters one at a time; he's actually R&D for Adrienne Cole's business model.`,
  },
  {
    id: "priya-anand",
    type: "character",
    name: "Priya Anand",
    initials: "PA",
    color: "from-amber-600 to-stone-800",
    tags: ["engineer", "animus", "ally", "meridian"],
    aliases: ["Priya"],
    summary:
      "Kane's off-book systems engineer who runs the Animus; took protection money from a shell firm years ago and doesn't know until later whose money it was.",
    description: `Not pure found-family. Took protection money from a shell firm years ago to cover a family medical debt — money that traces back to Cole Risk Partners.

Runs the Animus for Kane. Notices Cole Risk Partners in Voss's cap table early (S1E3) and says nothing. In Season 2, recognizes the name again on Ren's payments and still doesn't tell Kane — yet.

Season 3: finally admits she took Cole's money. Costs Kane's trust and nearly his protection — a real fracture, not clean forgiveness. Series finale beat: alone, opening a new file with a name in it. Ambiguous.`,
  },
  {
    id: "marcus-reyes",
    type: "character",
    name: "Detective Marcus Reyes",
    initials: "MR",
    color: "from-slate-600 to-blue-900",
    tags: ["sfpd", "detective", "ally", "ambition"],
    aliases: ["Reyes"],
    summary:
      "SFPD detective who feeds Kane's anonymous tips into real cases; wants the collar and the career, and resents feeding a ghost.",
    description: `Not just a skeptic — he wants the collar and the career that comes with it. Resents feeding an anonymous ghost while Kane stays in the shadows.

Season 1: pushes Kane (unknowingly) toward handing Voss to the system instead of ending him — for career reasons, not principle.

Season 2: wants the case for himself and starts working around Kane when deaths have no fixed pattern.`,
  },
  {
    id: "adrienne-cole",
    type: "character",
    name: "Adrienne Cole",
    initials: "AC",
    color: "from-violet-800 to-black",
    tags: ["antagonist", "architect", "cole risk partners", "season 3"],
    aliases: ["Cole"],
    summary:
      "Runs a risk consultancy that predicts violence for paying clients; the series' true antagonist, planted from S1E2 and revealed as architect by Season 3.",
    description: `Seeded in Season 1 (Cole Risk Partners appears as a shell investor behind Voss), confirmed architect by Season 3. Face finally shown approving a frame job at the end of Season 2.

Her firm sells prevention to the highest bidder, manufacturing the crises it claims to foresee. Voss and Ren were both her instruments — Kane's entire hunt was R&D for her product.

Origin (S3E5 Portfolio): started exactly like Kane, trying to save people directly, then curdled into commodifying prevention. The clearest "this is what you become" mirror of the series.

Argues that lone vigilante justice doesn't scale — the world needs someone accountable for prevention, and Kane is too proud to be that person under her system.`,
  },
  {
    id: "julian-voss",
    type: "character",
    name: "Julian Voss",
    initials: "JV",
    color: "from-red-700 to-zinc-900",
    tags: ["antagonist", "season 1", "the cull", "startup"],
    aliases: ["Voss", "The Cull"],
    summary:
      "Season 1 predator; blood-panel / supplement startup founder whose 'culling' weak cells branding becomes his killer nickname — and Kane's quiet self-justification.",
    description: `Supplement-startup branding: aggressive dosing protocol marketed as "culling" weak cells. Press adopts "The Cull" as the killer's nickname.

Mirrored dinner with Kane in Founder Mode — each unaware of the other. Circles someone in Kane's found family. Threatens to leak Kane's medical anomalies, forcing Kane's first crack in "only the guilty."

Dies in Communion; Kane gets no credit. Later revealed as an instrument of Adrienne Cole.`,
  },
  {
    id: "ren",
    type: "character",
    name: "Ren",
    initials: "RN",
    color: "from-teal-700 to-zinc-900",
    tags: ["antagonist", "season 2", "the many", "mirror"],
    aliases: [],
    summary:
      "Season 2 predator with no fixed face; takes jobs only against people who 'deserve it' — Kane's mirror — and briefly wears Kane's face mid-murder.",
    description: `Unrelated Bay Area deaths, no repeating pattern. Only takes jobs against people who "deserve it" — mirror #1 of Kane's vigilante code.

Kane uses the Animus on a living target for the first time tracking Ren's origin (Root Access). Payments trace to Cole Risk Partners.

Takes Kane's own face mid-murder, making Kane a public suspect. Kane corners Ren, can't finish it, lets Ren run — a mercy beat Season 3 will deny him with Cole's asset.`,
  },
  {
    id: "animus",
    type: "lore",
    name: "The Animus",
    initials: "AN",
    color: "from-cyan-700 to-indigo-900",
    tags: ["tech", "vr", "haptics", "time machine"],
    aliases: [],
    summary:
      "Kane's DIY VR/haptic 'time machine' — duct-taped headbands and off-the-shelf gear used to relive history and hunt predators.",
    description: `Not sleek corporate R&D — improvisation pretending to be destiny. Off-the-shelf haptics and headbands duct-taped into something dangerous.

Used to relive victims' last hours and flag patterns only Kane's private model catches. Season 2: Kane uses it on a living target for the first time — a line he swore he wouldn't cross.

Season 3: gets hacked mid-session. Series end: Kane doesn't destroy it in a clean gesture — he just stops using it, unresolved.`,
  },
  {
    id: "meridian",
    type: "location",
    name: "Meridian",
    initials: "ME",
    color: "from-zinc-600 to-zinc-900",
    tags: ["company", "ai", "longevity", "kane"],
    aliases: [],
    summary:
      "Kane's AI/longevity company; its jargon — audits, protocols, 'the Cull' — echoes the violence he hunts.",
    description: `Silicon Valley AI/longevity firm run by Kane. Internal language overlaps uncomfortably with the season's violence: audits, protocols, "the Cull."

Season 2 climax: Cole's firm frames an innocent low-level Meridian employee for the murders so Kane will stay quiet rather than expose himself.`,
  },
  {
    id: "cole-risk-partners",
    type: "location",
    name: "Cole Risk Partners",
    initials: "CR",
    color: "from-purple-900 to-black",
    tags: ["firm", "antagonist", "prevention", "shell"],
    aliases: ["Cole's firm"],
    summary:
      "Adrienne Cole's risk consultancy — predicts violence for paying clients and manufactures crises to sell prevention.",
    description: `Planted as a shell investor behind Voss's blood-panel startup in Season 1 Episode 2. Appears again in Voss's cap table (Priya notices, says nothing). Ren's payments trace here in Season 2.

Sells prevention to the highest bidder using the same data-modeling instincts Kane uses for free. The firm's public collapse in Season 3 ends the surface war — not Kane's doubt.`,
  },
  {
    id: "san-francisco",
    type: "location",
    name: "San Francisco / Bay Area",
    initials: "SF",
    color: "from-indigo-500 to-violet-800",
    tags: ["setting", "tech", "sfpd"],
    aliases: ["Bay Area"],
    summary: "Primary setting — Silicon Valley predators, SFPD cases, and Kane's empire.",
    description: `Tech-elite hunting ground. Bodies, tips, and frame jobs play out across the Bay Area. Reyes works SFPD cases that Kane's anonymous model quietly feeds.`,
  },
  {
    id: "series-bible-overview",
    type: "lore",
    name: "Series Bible — Overview",
    initials: "SB",
    color: "from-red-800 to-black",
    tags: ["series bible", "structure", "logline"],
    summary:
      "Three seasons: The Cull, The Many, The Handler — each villain a mirror; Cole the invisible architect from the start.",
    description: `LOGLINE: Centuries-old vampire / Silicon Valley billionaire builds the Animus to hunt monsters among the tech elite. Wants sainthood; gets suspicion. Each predator asks: cleansing or reflection? Season 3 asks whether any of it was ever defensible.

KEY PLAYERS: Marcus Aldric Kane · Priya Anand · Detective Marcus Reyes · Adrienne Cole

S1 THE CULL (8 eps) — Julian Voss / "The Cull"
S2 THE MANY (7 eps) — Ren / no fixed face
S3 THE HANDLER (8 eps) — Adrienne Cole fully revealed

Long game: Kane thinks he's hunting one monster at a time. He's Cole's R&D department.`,
  },
  {
    id: "season-1-the-cull",
    type: "lore",
    name: "Season 1 — The Cull",
    initials: "S1",
    color: "from-zinc-700 to-rose-900",
    tags: ["season 1", "outline", "voss"],
    summary:
      "Eight episodes: Kane vs Voss; Cole Risk Partners planted; first crack in 'only the guilty.'",
    description: `Retitled from "Mosquito." "The Cull" = Voss's branding + the press nickname + Kane's own justification.

Episodes: Pilot · The Animus · Founder Mode · Sainthood · The Cull · Oracle · The Ledger · Communion

Plant #1: Cole Risk Partners flagged in E2, dismissed. Priya sees it again in E3 and stays silent. Ends with Voss dead, no credit for Kane, and Priya taking Cole's cleanup money without knowing the source.`,
  },
  {
    id: "season-2-the-many",
    type: "lore",
    name: "Season 2 — The Many",
    initials: "S2",
    color: "from-teal-800 to-zinc-900",
    tags: ["season 2", "outline", "ren"],
    summary:
      "Seven episodes: Ren the mirror; Animus on a living target; Cole's face revealed approving a frame job.",
    description: `Episodes: No Fixed Face · Tell · Root Access · Client List · Mirror · Custody · Absolution

Ren only kills people who "deserve it." Kane crosses a line using the Animus on the living. Priya again withholds Cole's name. Kane lets Ren run — then lets Cole frame an innocent Meridian employee rather than expose himself. Final shot: Cole's face.`,
  },
  {
    id: "season-3-the-handler",
    type: "lore",
    name: "Season 3 — The Handler",
    initials: "S3",
    color: "from-violet-900 to-black",
    tags: ["season 3", "outline", "cole"],
    summary:
      "Eight episodes: Cole revealed; Kane's hunt was her R&D; an unmerciful kill; Animus left unused.",
    description: `Episodes: Message Received · The Firm · Sight Without Wisdom · Oracle vs. Oracle · Portfolio · Exposure · Blood Debt · The Believing Kind

Kane is modeled and hunted. Confirms Voss and Ren were Cole's instruments. Priya's confession fractures trust. Blood Debt: Kane kills a victim-more-than-villain asset — no mercy walkaway. Ending: no credit, no peace, Animus abandoned unresolved; Priya opens a new file.`,
  },
];

const trinityChapters: Chapter[] = [
  {
    title: "Season 1 · Episode 1",
    label: "Pilot",
    scenes: [
      {
        title: "Empire and Code",
        text: "Kane's empire and code established: he only kills the guilty. Bodies surface with a signature only his private model catches.",
      },
      {
        title: "First Animus Session",
        text: "",
      },
    ],
  },
  {
    title: "Season 1 · Episode 2",
    label: "The Animus",
    scenes: [
      {
        title: "Victim's Last Hour",
        text: "Reliving a victim's last hour, Kane's model flags a shell investor — Cole Risk Partners — behind Voss's blood-panel startup. He dismisses it as background noise. (plant #1)",
      },
    ],
  },
  {
    title: "Season 1 · Episode 3",
    label: "Founder Mode",
    scenes: [
      {
        title: "Dinner",
        text: "Kane and Voss have dinner, each unaware of the other. Priya quietly notices Cole Risk Partners again in a cap table and says nothing — we don't yet know why.",
      },
    ],
  },
  {
    title: "Season 1 · Episode 4",
    label: "Sainthood",
    scenes: [
      {
        title: "Origin Flashback",
        text: "Origin flashback. Voss starts circling someone in Kane's found family.",
      },
    ],
  },
  {
    title: "Season 1 · Episode 5",
    label: "The Cull",
    scenes: [
      {
        title: "Medical Anomalies",
        text: "Voss threatens to leak Kane's medical anomalies. Kane does something borderline monstrous to protect his secret — the first real crack in \"only the guilty.\"",
      },
    ],
  },
  {
    title: "Season 1 · Episode 6",
    label: "Oracle",
    scenes: [
      {
        title: "Anonymous Stop",
        text: "Kane stops a murder anonymously. Tips off Voss to how close he's gotten.",
      },
    ],
  },
  {
    title: "Season 1 · Episode 7",
    label: "The Ledger",
    scenes: [
      {
        title: "System or Ending",
        text: "Reyes pushes Kane (unknowingly) toward handing Voss to the system instead of ending him — for Reyes's own career reasons, not principle. Kane has to choose anyway.",
      },
    ],
  },
  {
    title: "Season 1 · Episode 8",
    label: "Communion",
    scenes: [
      {
        title: "Voss Ends",
        text: "Voss dies; Kane gets no credit. Priya is offered a \"consulting fee\" by an anonymous party to quietly wipe a data trail — she takes it, not knowing it's Cole cleaning up.",
      },
      {
        title: "Three Faces",
        text: "Final scene: a job completed across three different faces in one night.",
      },
    ],
  },
  {
    title: "Season 2 · Episode 1",
    label: "No Fixed Face",
    scenes: [
      {
        title: "Patternless Deaths",
        text: "Unrelated Bay Area deaths, no repeating pattern. Reyes wants the case for himself and starts working around Kane.",
      },
    ],
  },
  {
    title: "Season 2 · Episode 2",
    label: "Tell",
    scenes: [
      {
        title: "Deserve It",
        text: "Kane realizes the killer only takes jobs against people who \"deserve it\" — mirror #1.",
      },
    ],
  },
  {
    title: "Season 2 · Episode 3",
    label: "Root Access",
    scenes: [
      {
        title: "Living Target",
        text: "Ren's origin. Kane uses the Animus on a living target for the first time — a line he swore he wouldn't cross.",
      },
    ],
  },
  {
    title: "Season 2 · Episode 4",
    label: "Client List",
    scenes: [
      {
        title: "Cole Again",
        text: "Ren's payments trace back to Cole Risk Partners. Priya recognizes the name this time — and has to decide whether to tell Kane it's the same firm that paid her. She doesn't, yet.",
      },
    ],
  },
  {
    title: "Season 2 · Episode 5",
    label: "Mirror",
    scenes: [
      {
        title: "Kane's Face",
        text: "Ren takes Kane's own face mid-murder. Kane becomes a public suspect for the first time.",
      },
    ],
  },
  {
    title: "Season 2 · Episode 6",
    label: "Custody",
    scenes: [
      {
        title: "Let Ren Run",
        text: "Kane corners Ren, can't finish it, lets Ren run.",
      },
    ],
  },
  {
    title: "Season 2 · Episode 7",
    label: "Absolution",
    scenes: [
      {
        title: "The Frame",
        text: "With Ren gone, Cole's firm frames an innocent low-level Meridian employee for the season's murders to close the file quietly. Kane lets it happen because exposing the truth would expose himself.",
      },
      {
        title: "Cole's Face",
        text: "Final shot: Cole, on a call, approving the frame job — we finally see her face.",
      },
    ],
  },
  {
    title: "Season 3 · Episode 1",
    label: "Message Received",
    scenes: [
      {
        title: "Hunted",
        text: "Kane, still carrying the framed employee's fate, is now the one being modeled and hunted. His own Animus gets hacked mid-session.",
      },
    ],
  },
  {
    title: "Season 3 · Episode 2",
    label: "The Firm",
    scenes: [
      {
        title: "Adrienne Cole",
        text: "Full introduction of Adrienne Cole: her risk-prediction firm sells prevention to the highest bidder, manufacturing the very crises it claims to foresee.",
      },
    ],
  },
  {
    title: "Season 3 · Episode 3",
    label: "Sight Without Wisdom",
    scenes: [
      {
        title: "Instruments",
        text: "Kane confirms Voss and Ren were both her instruments — his entire \"hunt\" has been R&D for her product.",
      },
    ],
  },
  {
    title: "Season 3 · Episode 4",
    label: "Oracle vs. Oracle",
    scenes: [
      {
        title: "Meeting",
        text: "Kane and Cole meet directly. She argues, convincingly, that lone vigilante justice doesn't scale and never did — that the world needs someone accountable for prevention, and he's just too proud to be that person under her system.",
      },
    ],
  },
  {
    title: "Season 3 · Episode 5",
    label: "Portfolio",
    scenes: [
      {
        title: "Cole's Origin",
        text: "Cole's own origin: she started exactly like Kane, trying to save people directly, and curdled into commodifying it. The clearest \"this is what you become\" mirror of the series.",
      },
    ],
  },
  {
    title: "Season 3 · Episode 6",
    label: "Exposure",
    scenes: [
      {
        title: "Priya Confesses",
        text: "Priya finally admits she took Cole's money years ago. It costs her Kane's trust and nearly costs her his protection — a real fracture, not a clean forgiveness.",
      },
    ],
  },
  {
    title: "Season 3 · Episode 7",
    label: "Blood Debt",
    scenes: [
      {
        title: "No Mercy Beat",
        text: "To stop Cole's firm from manufacturing a mass-casualty \"prevention\" event to prove its own value, Kane has to kill one of Cole's assets who is more victim than villain — a direct echo of Ren, except this time he doesn't get to walk away. No mercy beat. He lives with it.",
      },
    ],
  },
  {
    title: "Season 3 · Episode 8",
    label: "The Believing Kind",
    scenes: [
      {
        title: "Unresolved",
        text: "Cole's firm collapses publicly; Kane gets no credit, as always — but this time it doesn't read as peace, it reads as a man who's no longer sure the last 200 years were ever justified. He doesn't destroy the Animus in a clean gesture — he just stops using it, unresolved.",
      },
      {
        title: "New File",
        text: "Final shot: Priya, alone, opening a new file with a name in it. Ambiguous, not triumphant.",
      },
    ],
  },
];

export const trinitySeed: Novel = {
  id: "trinity",
  title: "Trinity",
  author: "KSM",
  series: "Trinity",
  updated: "Jul 14",
  sortKey: 2,
  synopsis:
    "A centuries-old vampire, now a Silicon Valley billionaire, builds the Animus to hunt monsters among the tech elite — and discovers his hunt has been someone else's R&D.",
  cover: "trinity",
  blank: false,
  codex: trinityCodex,
  chapters: trinityChapters,
};

/** Alias for draft seeding — Series Bible v2 (Kane / Animus / Cole). */
export const trinityV2Seed = trinitySeed;
export const trinityV2Snippets = trinitySnippets;

export const trinityV2DraftMeta = {
  name: "v2 — Series Bible",
  slug: "v2-series-bible",
  summary:
    "Revised timeline: Marcus Aldric Kane, the Animus, and seasons The Cull / The Many / The Handler. Cole planted from S1E2.",
} as const;
