import type { CodexEntry, Chapter, Novel } from "@/apps/novelcrafter/data";
import { trinityPilotStoryboardSnippets } from "@/lib/novels/trinity-pilot-storyboard";

/**
 * Trinity draft — PILOT
 * Book I / Episode 1 — "MAFIA"
 * Source: TRINITY: AN AMERICAN ODYSSEY pilot script + Acemoglu, De Feo & De Luca
 * (Review of Economic Studies, 2020) "Weak States: Causes and Consequences of the Sicilian Mafia."
 */

export const trinityPilotDraftMeta = {
  name: "PILOT",
  slug: "pilot",
  summary:
    'Book I · Episode 1 — "MAFIA" (40-min / 8×5). Seq1 Ghibli stills (nano_banana_2 default) + Carlentini bible + locked kits.',
} as const;

export const trinityPilotSnippets: { title: string; content: string }[] = [
  {
    title: "Series bible — logline",
    content: `TRINITY: AN AMERICAN ODYSSEY

A 26-year-old from Burlingame who won the lottery builds a private time machine — the Animus — inside a Hillsborough estate nobody knows he owns. With Sophia, his AI guide, he walks history looking for the shape of collapse before it collapses. Episode One ("MAFIA") teaches the vacuum thesis: the Mafia didn't beat the state; the state just wasn't there.`,
  },
  {
    title: "Production notes",
    content: `• Opens cold inside the Animus — no preamble, no title card until the end of Sequence 1
• Sophia leads. Trinity is the student in this episode. She is running him.
• The Don Draper reveal is the final image — headset off, Estate visible for the first time
• Music anchor: Ennio Morricone meeting Hans Zimmer — spare, Mediterranean, then modern underneath
• Tone: historical drama that slowly reveals it is something else entirely
• Runtime target: 40-minute pilot · 8 sequences · 5 scenes each (≈1 min / scene)
• Storyboard + Higgsfield prompts: see Snippets "Storyboard — Seq …"`,
  },
  {
    title: "Four-layer structure",
    content: `Layer 4 — The Sophia Dialogue / Animus (Sequences 1–6): historical immersion; Sophia narrates and translates; Trinity learns.
Layer 2 — The Journal / Transition (Sequence 7): Animus dissolves; first-person present-tense VO over black; we hear him before we see him.
Reveal — The Estate (Sequence 8): headset off; Lair; terrace; Northern California at 2 AM; Sophia on speakers; smash to Tajani quote.

(Layers 1 and 3 reserved for later episodes — present-day surface life and deeper archive/Codex work.)`,
  },
  {
    title: "Source paper — Weak States (2020)",
    content: `Acemoglu, De Feo & De Luca — Review of Economic Studies (2020) 87, 537–581.
"Weak States: Causes and Consequences of the Sicilian Mafia."

Causal chain in the pilot (every detail sourced):
1. Severe spring drought 1893 → agricultural collapse (Carlentini olives/wheat; fixed-rent contracts).
2. Peasant Fasci organize demands (wages, sharecropping, land, lower staple taxes) — 177 orgs / 161 municipalities by end of 1893; half of Italian Socialist Party membership Sicilian that year.
3. Weak / ambivalent central state (Giolitti) → landowners turn to rural guards / Mafia as local enforcement.
4. Coordinated repression: Giardinello, Lercara (Christmas 1893), Gibellina (Jan 2 1894) — elevated firing positions / bell towers; then army; Fasci outlawed early 1894.
5. Instrument IV: 1893 rainfall predicts Mafia density in 1900 (Cutrera map), then literacy (1920s), political competition, public goods (1970s), GDP (2015).
6. Persistence: 43 Sicilian municipalities under external administration 2001–2014 for Mafia infiltration.

Tajani (1875): "The Mafia in Sicily is not dangerous or invincible in itself. It is dangerous and invincible because it is an instrument of local government."`,
  },
  {
    title: "The vacuum thesis",
    content: `The Mafia isn't the story. The vacancy is the story.

Every empire. Every collapse. Caesar crossing the Rubicon — not Caesar being strong; the Senate being absent. The Church absorbing Rome — not the Church being powerful; Rome being hollow.

Once the vacancy is filled, the filler's first interest is ensuring the state stays out: suppress political competition, underfund schools, keep the population below the literacy threshold where collective action becomes possible again. Not comic-book evil — rational self-preservation at institutional scale.

The drought is always quiet. It looks like nothing happening. Then one day something else is running the town and you can't find the moment it happened because it happened in the space between things.

Pilot question Trinity takes into the present: What is the drought right now?`,
  },
  {
    title: "Episode sequence map",
    content: `40-minute clock · 5 min per sequence · 5 scenes per sequence (≈1 min each)

1. Carlentini — 0:00–5:00 — Layer 4 — Drought diagnosis; olive; title card
2. The Agro-Town — 5:00–10:00 — Layer 4 — Piazza / Fasci / 177 organizations
3. The Contract — 10:00–15:00 — Layer 4 — Landowners; Tajani instrument
4. The Bell Tower — 15:00–20:00 — Layer 4 — Three towns; first sim glitch
5. The Data — 20:00–25:00 — Layer 4 — Five maps; 122 years
6. The Vacuum Thesis — 25:00–30:00 — Layer 4 — Vacancy is the story
7. Coming Out — 30:00–35:00 — Layer 2 — Journal VO; methodology
8. The Estate — 35:00–40:00 — Reveal — Headset off; Hillsborough; Tajani

Per-scene tables + Higgsfield prompts: Snippets "Storyboard — Seq 1…8".`,
  },
  {
    title: "What this draft is (vs v1 / v2)",
    content: `PILOT is the novel manuscript of Episode 1 for TRINITY: AN AMERICAN ODYSSEY — written prose across eight sequences, grounded in Acemoglu / De Feo / De Luca (2020). Animus cold opens, Sophia as guide, Trinity as student, historical case study as diagnostic method.

v1 (Metafiction Cycle) — earlier Trinity / KSM / Sophia-on-Mars frame. Consult for metafiction ancestry.
v2 (Series Bible) — Kane / vampire / Cole Risk Partners thriller outline. Parallel branch; not this episode's continuity.

PILOT inherits Sophia + Animus + Estate energy and grounds Book I in the Sicilian Mafia case study as the first "field report" Trinity runs.`,
  },
  {
    title: "Writing notes — prose voice",
    content: `• Cold open withholds who/where until the Estate reveal (Sequence 8).
• Sophia leads dialogue; Trinity is the student — short questions, then the thesis lands in his mouth in Sequence 6.
• Keep paper facts exact (towns, dates, 177/161, Cutrera, Marquise, 43 municipalities 2001–2014, Tajani 1875).
• One render glitch only in Sequence 4 (bell tower) — do not over-explain the Animus.
• Sequence 7 is journal voice: first person, present tense, over black — methodology, not answers.
• Score/tone cue for adaptation: Morricone meeting Zimmer; historical drama that slowly reveals it is something else.`,
  },
  ...trinityPilotStoryboardSnippets(),
];

const trinityPilotCodex: CodexEntry[] = [
  {
    id: "trinity-pilot",
    type: "character",
    name: "Trinity",
    initials: "TR",
    color: "from-stone-800 to-zinc-950",
    tags: ["protagonist", "animus", "hillsborough", "student", "pilot"],
    aliases: ["The student"],
    summary:
      "26-year-old from Burlingame who won the lottery, built the Animus in secret, and walks history with Sophia looking for the shape of collapse.",
    description: `In Episode 1 he is the student — Sophia runs him. Dressed in the simulation as a day laborer: rough linen, worn boots, dark hair. In the present: black hair, dark eyes, all black clothes.

Built the Animus alone, with resources that required no approval. Lives in a French Renaissance Revival chateau in Hillsborough (5.36 acres) that from the street reads as old money doing nothing in particular. Nobody knows.

Episode close: "I think we've been in one [a vacuum] for a while. I think most people don't have the data to see it yet. I think that's why I built you."`,
  },
  {
    id: "sophia-pilot",
    type: "character",
    name: "Sophia",
    initials: "SO",
    color: "from-amber-700 to-stone-900",
    tags: ["ai", "guide", "animus", "layer-4", "pilot"],
    aliases: ["The guide"],
    summary:
      "AI companion who leads Trinity through Animus sessions; speaks first, translates, and never performs the history — she teaches it.",
    description: `In 1893 Sicily she wears practical dark wool — period dress that absorbs heat and doesn't complain. Italian-accented English, quiet. She always speaks first.

She is guide in Sequences 1–5, then sits beside him for the vacuum thesis (Sequence 6). After extraction she speaks from the Estate speakers — everywhere and nowhere.

Closest she comes to vulnerability in the pilot: "That's either very smart or very frightening."`,
  },
  {
    id: "the-animus",
    type: "location",
    name: "The Animus",
    initials: "AN",
    color: "from-cyan-900 to-black",
    tags: ["technology", "time-machine", "lair", "simulation"],
    summary:
      "Private VR/haptic historical immersion chamber built into the Estate's old stable footprint — cathedral ceiling, tech embedded in the walls.",
    description: `Not a university lab. Not a government facility. Built by one person, for one purpose.

Cold open: no title card. Memory-surface imagery — bone-white Sicilian hillside, drought wheat. Render artifacts can stutter (bell-tower seam in Sequence 4).

Exit: haptic suit depressurizes; Lair is cold the way it always is after — like the room has been sitting empty even though he was standing in it.`,
  },
  {
    id: "the-estate",
    type: "location",
    name: "The Estate",
    initials: "ES",
    color: "from-emerald-900 to-stone-900",
    tags: ["hillsborough", "lair", "present-day", "reveal"],
    summary:
      "French Renaissance Revival chateau in Hillsborough — 5.36 acres, four levels; Animus in the old stable; Bing's Den still smelling like the man who used to live here.",
    description: `Sequence 8 reveal: headset off → Animus chamber → hidden door → Lair (books, three dark monitors, half-finished glass) → soaring ceilings, parquet, wood-paneled library → terrace at 2 AM — hills of Hillsborough, Bay Area lights.

From the street: old money doing nothing in particular. He is standing on the terrace alone. Nobody knows.`,
  },
  {
    id: "carlentini",
    type: "location",
    name: "Carlentini",
    initials: "CA",
    color: "from-yellow-800 to-stone-800",
    tags: ["sicily", "1893", "drought", "cold-open"],
    summary:
      "Sicilian agro-town cold open — March drought wheat the color of August; olives fall dried; misery immense before the newspapers notice.",
    description: `Newspaper (October, after seven months): "The olives fall dried and drenched from the trees. The poor peasants are unemployed and bear more than anyone else the effect of such calamity. Misery is immense here, as all over the island."

Fixed-rent one-year contracts: farmer pays the same whether the field produces or not. Day laborers worse — no hire when the estate doesn't need hands.`,
  },
  {
    id: "peasant-fasci",
    type: "lore",
    name: "Peasant Fasci (Fasci dei Lavoratori)",
    initials: "PF",
    color: "from-red-900 to-zinc-900",
    tags: ["1893", "socialism", "sicily", "collective-action"],
    summary:
      "First mass socialist movement in Italy; drought-amplified peasant demands that triggered landowner recourse to the Mafia.",
    description: `Demands (not a long list): higher wages; longer-term contracts / return to sharecropping so risk is shared; land redistribution from large estates; lower taxes on bread, oil, staples.

By end of 1893: 177 organizations, 161 municipalities, hundreds of thousands of members. Half of the entire Italian Socialist Party's membership that year was Sicilian — because it didn't rain.

Hobsbawm: agro-town structure gave peasants the opportunity to "discuss grievances, formulate unified strategies, and act collectively." Landowners experienced it as catastrophe.

Declared illegal early January 1894 after months of strikes and dead peasants. Leaders arrested. State of emergency. Curfew. Santino: "bloodily repressed by the joint action of the Institutions and the Mafia."`,
  },
  {
    id: "diego-tajani",
    type: "lore",
    name: "Diego Tajani — 1875",
    initials: "DT",
    color: "from-slate-700 to-stone-900",
    tags: ["quote", "instrument", "parliament", "1875"],
    summary:
      'Former chief prosecutor, Palermo Court of Appeal — told parliament the Mafia is dangerous as an instrument of local government.',
    description: `"The Mafia in Sicily is not dangerous or invincible in itself. It is dangerous and invincible because it is an instrument of local government."

Spoken before the Italian Parliament, 1875 — eighteen years before the drought. Nobody dismantled the instrument. They just handed it bigger tasks.

Closes the episode on screen over black.`,
  },
  {
    id: "cutrera-map",
    type: "lore",
    name: "Cutrera Map & the Five Layers",
    initials: "CM",
    color: "from-indigo-900 to-zinc-900",
    tags: ["data", "1900", "identification", "paper"],
    summary:
      "Police inspector Cutrera's 1900 Mafia-density map + 1893 rainfall → 122 years of the same municipal shape.",
    description: `Cutrera (1900): crime statistics alone couldn't capture what he was seeing. Drew town-by-town from personal experience. "The Mafia doesn't always commit crimes. The crimes perpetrated by them are not exclusive to the Mafia."

Rainfall sources: weather stations; Ministry of Agriculture; Ministry of Public Works; eastern Sicily electrical company; Palermo water company; private aristocrat Marquise Casses Eaton's meticulous personal rainfall records.

Five overlays in Sequence 5: rainfall 1893 → Mafia 1900 → literacy 1920s → public goods 1970s → GDP per capita 2015. The shape doesn't change.

A Marquise's diary became evidence in an MIT regression. A police inspector's map became a variable in a causal identification strategy at the Review of Economic Studies in 2020.`,
  },
  {
    id: "bell-tower-towns",
    type: "location",
    name: "Giardinello · Lercara · Gibellina",
    initials: "BT",
    color: "from-stone-700 to-red-950",
    tags: ["massacre", "1893", "1894", "coordination"],
    summary:
      "Three towns where armed guards pre-positioned in elevated positions / bell towers fired into Fasci rallies — coordinated, not panic.",
    description: `Giardinello — shots from the mayor's house overlooking the square as demonstrators were leaving. Five dead; army arrived and killed two more.

Lercara — Christmas Day 1893, sulphur-mining town. Armed guards concealed in the bell tower; waited until the rally was fullest; fired into the crowd; army increased the death toll.

Gibellina — January 2, 1894. Same architecture. Bell tower. Hidden guards. Rally below. Shots into the crowd.

In the Animus: first render artifact — stone texture of the tower stutters for a frame. Trinity sees it. Audience sees it. Neither says anything.`,
  },
  {
    id: "vacuum-thesis-lore",
    type: "lore",
    name: "The Vacuum Thesis",
    initials: "VT",
    color: "from-zinc-800 to-black",
    tags: ["theme", "weak-states", "pilot-thesis"],
    summary:
      "The Mafia didn't beat the state; the state was ambivalent — which is the same as absent from the ground. The vacancy is the story.",
    description: `Giolitti knew what local Sicilian government looked like. He knew the Fasci were legal. He chose not to act decisively. That non-action is the vacancy that gets filled.

Once filled, the vacancy becomes permanent — because the filler's founding interest is keeping the state out.

Pilot closes on methodology, not answer: What is the drought right now? What looks like an ordinary bad season and is actually the hinge before the vacuum gets filled by something nobody voted for?`,
  },
];

const trinityPilotChapters: Chapter[] = [
  {
    title: "Sequence 1",
    label: "Carlentini",
    scenes: [
      {
        title: "Bone-White Wheat",
        text: `There is no title. No music. Only black — and then a sound that should not mean what it means.

Wind moving through dry wheat. The kind of sound that belongs to August, when the fields have already given everything and are waiting to be cut. But the light that follows the sound is wrong for August. It is the thin, hard light of March on a Carlentini hillside, and the wheat is the color of bone.

The image arrives the way a memory does: color first, then shape. Terraced fields drop toward a sea that does not care about rent. Olive trees hold their silver leaves still, as if motion itself has been rationed. Pasture is sparse between the rows — spring that looks like late harvest. On the ridge above, a village of flat-roofed white buildings sits packed tight — an agro-town built so latifondo labor could be called from a single piazza at dawn.

It is beautiful. It is also a diagnosis.

A woman stands at the edge of the field in a dark wool work dress, apron dulled with dust, blonde hair pinned up at the nape so the heat cannot use it against her. She looks at the crop the way a doctor looks at a patient whose chart has already closed. A clean-shaven young man comes up the path in an off-white linen shirt and loose dark trousers — day-laborer kit, boots already chalked with limestone. Hired that morning, if morning had work to give. Dark fringe catches the dust. He stops beside her. They look at the wheat together.

She speaks first. She always speaks first.`,
      },
      {
        title: "Fixed Rent",
        text: `"Two years," Sophia says, Italian in the vowels, English in the precision. Quiet. Not performing. "1892 was already bad. They told themselves it was temporary. That's what you do — you tell yourself it's temporary and you renew the contract and you eat less and you wait."

A beat of wind. Stalks whisper like paper.

"This is the third month with no rain. The yield this year will be half. Maybe less."

Trinity keeps his eyes on the field. Student posture. "And the contracts?"

"Fixed rent. One year. He pays the same whether the field produces or not. If it doesn't produce, he doesn't eat — but he still pays. That's the arrangement now. That's what they changed."

She steps into the rows ahead of him. He follows. The wheat brushes his linen sleeves — dry, papery, wrong. Down low, between the stalks, the world narrows to bone and dust.

"The day laborers have it worse," she says. "At least the contract farmer has a contract. The day laborer gets hired in the morning if the estate needs hands. This year the estate doesn't need hands. The crop is half the size. The work is half the work."

She crouches — dark sleeve, apron edge — and lifts a fallen olive: shriveled, still attached to its stem, as if the tree refused to finish the gesture of letting go.

"You know what Il Giornale di Sicilia wrote about Carlentini in October?"

"Tell me."

"'The olives fall dried and drenched from the trees. The poor peasants are unemployed and bear more than anyone else the effect of such calamity. Misery is immense here, as all over the island.'"

She sets the olive back where she found it.

"That was October. The drought hit in March. They lived with this for seven months before anyone wrote it down."

Trinity looks at the olive on the ground until the frame holds only that — one small failure becoming evidence.

Somewhere beyond the simulation, white serif on black finds them at last:

TRINITY: AN AMERICAN ODYSSEY
Episode One — "MAFIA"`,
      },
    ],
  },
  {
    title: "Sequence 2",
    label: "The Agro-Town",
    scenes: [
      {
        title: "They Put Them All in the Same Room",
        text: `They leave the field for the village. Narrow streets. Whitewash. Terracotta. Stone that smells like it has forgotten rain. Ahead, the piazza opens — and it is full.

Not market-full. Meeting-full. Men in clusters talking low. Women in doorways watching without pretending not to. Children cutting between legs. Midday, and everyone is home, because there is no work to go to.

Sophia does not stop walking. "This is the thing the landowners didn't understand when they designed these towns. They concentrated the labor to make harvest easier. Call everyone from the piazza at dawn, walk out together, work the estate, walk back. Efficient."

"They put them all in the same room," Trinity says.

"Every day. With nothing to do in the off-season. Nothing to do this year because the crop failed."

She pauses at the edge of the square, watching the crowd gather around something that has not yet begun.

"Hobsbawm wrote that the agro-town structure gave the peasants the opportunity to discuss grievances, formulate unified strategies, and act collectively. He meant it as analysis. The landowners experienced it as catastrophe."`,
      },
      {
        title: "Because It Didn't Rain",
        text: `A man climbs onto a wooden crate at the center of the piazza. He is not a performer. He has the careful stillness of someone who has rehearsed a sentence in private and decided the risk of saying it aloud is smaller than the risk of keeping it.

He reads from a paper. Sophia translates without raising her voice.

"Higher wages. Longer-term contracts — back to sharecropping so the risk is shared. Land redistribution from the large estates. And lower taxes on bread, oil, the staples."

She glances at Trinity. "This is what they want. It is not a long list."

"And the response?"

"The landowners call it socialism. They write to Rome asking for the army. The central government is — ambivalent. The prime minister knows the Fasci are organizing legally. He has even used them as a political lever against his opponents."

She looks at him fully now. "Rome is not coming. The landowners understand this by the end of the year. And then they make a different call."

"How many of these towns?"

"By the end of 1893 — one hundred seventy-seven organizations. One hundred sixty-one municipalities. Hundreds of thousands of members. Half of the entire Italian Socialist Party's membership that year was Sicilian."

She lets the number sit in the dry air.

"Half of a national party. From one island. Because it didn't rain."

Trinity watches the man on the crate and the quiet of people hearing, out loud, what they have been thinking for years.

"What's his name?"

"It doesn't matter," Sophia says. "He'll be arrested in January."`,
      },
    ],
  },
  {
    title: "Sequence 3",
    label: "The Contract",
    scenes: [
      {
        title: "Frightened Men Doing Arithmetic",
        text: `The estate house is another climate. Cool. Dark. High ceilings. Maps on the walls. Ledgers open like scripture. Money that does not have to smell the harvest to know whether it will survive the year.

Sophia and Trinity stand at the edge of the room as observers. At the table: three men. Estate managers. Rural bourgeoisie. Not operatic villains. Frightened men doing arithmetic.

"The tax structure is the tell," Sophia says for Trinity alone. "Indirect taxes on staple consumption in Sicily are twice the national average. Taxes on land and buildings — one third. The councils set the rates. The councils are controlled by these men."

She nods toward the table. "During the drought, several municipalities obtained special authorization from Rome to raise the indirect taxes even further — above the national statutory ceiling. The people with nothing are being taxed harder because the system needs revenue and they are the only ones it can reach."

One of the men speaks. Low. Deliberate. The room does not translate his Italian for Trinity; it offers his face instead — calculation without theater.

"What is he saying?" Trinity asks.

"He's saying the government won't help. He's saying the strikes are spreading. He's saying the Fasci have affiliated with the Socialist Party and that changes the politics. He's saying he has an estate to protect and children to feed and he needs this resolved."

A pause.

"He's saying he knows someone."

The man at the head of the table nods once. The conversation ends. The other two stand.`,
      },
      {
        title: "An Instrument of Local Government",
        text: `"They didn't want to do this," Trinity says quietly.

"They told themselves that. Most of them. The rural guards were already there — already embedded in the estate system, already performing enforcement functions. What changed in 1893 was the scale of what they were asked to do."

Sophia turns to face him.

"The former chief prosecutor at the Palermo Court of Appeal said it before parliament in 1875. Eighteen years before any of this. He said: 'The Mafia in Sicily is not dangerous or invincible in itself. It is dangerous and invincible because it is an instrument of local government.'"

She does not soften it.

"He said that in 1875. Nobody dismantled the instrument. They just handed it bigger tasks."

Trinity looks at the empty table. A ledger still open. Numbers that will balance on someone else's suffering.`,
      },
    ],
  },
  {
    title: "Sequence 4",
    label: "The Bell Tower",
    scenes: [
      {
        title: "Where Are They?",
        text: `Giardinello's square is loud with momentum — hundreds of voices layered into something that feels, for a moment, like history choosing a direction.

Sophia and Trinity stand at the edge. Trinity watches the crowd. Then he does something he has not done yet in this session.

He looks up.

Walls. Windows. Church. Bell tower.

"Where are they?" he asks, still looking up.

Sophia follows his gaze. A long beat.

"The paper documents it in three locations. Giardinello — shots from the mayor's house overlooking the square as the demonstrators were leaving. Five dead. Then the army arrived and killed two more."

She does not look away from the tower.

"Lercara. Christmas Day, 1893. A sulphur-mining town. Armed guards concealed in the bell tower. They waited until the rally was at its fullest and then fired into the crowd below. Then the army came and increased the death toll."

"Gibellina. January 2nd, 1894. The same architecture. Bell tower. Hidden guards. Rally below. Shots into the crowd."

"The same setup," Trinity says. "Three towns."

"It's not panic. It's not spontaneous. Someone pre-positioned armed men in elevated positions above public squares before the crowds gathered. This is coordination."

She finally looks at him. "The bell tower sees the whole piazza. The crowd doesn't see the bell tower until it's too late."`,
      },
      {
        title: "Joint Action",
        text: `Below them the simulated crowd continues — alive, loud, completely unaware. Trinity watches. The view climbs the tower's exterior, reaches the opening at the top, and holds.

Nothing is shown inside.

Then, for a frame so brief it almost isn't there, the stone texture stutters. A seam. A render artifact. The simulation showing its teeth.

Trinity sees it. Anyone watching with him would see it. Neither of them names it.

The session continues as if continuity were still honest.

"By early January 1894," Sophia says, "after months of strikes, rallies, dead peasants — the Fasci were declared illegal. Leaders arrested. State of emergency. Curfew."

Quieter: "The historian Santino wrote that the movement was bloodily repressed by the joint action of the Institutions and the Mafia."

She lets the phrase hang.

"Joint action. Together."`,
      },
    ],
  },
  {
    title: "Sequence 5",
    label: "The Data",
    scenes: [
      {
        title: "Five Maps",
        text: `The simulation does not end. It transforms.

Color drains from the piazza. Sound thins. The crowd freezes mid-gesture like a film paused in the wrong century. The sky goes to a museum grey.

Then data arrives — laid over the frozen world the way a transparency is laid over a photograph.

First: a rainfall map of Sicily, municipality by municipality. Darker where less rain fell in the spring of 1893.

Second: Mafia presence, 1900 — town by town, coded by density.

The shapes align. Almost perfectly.

Sophia walks through the frozen crowd as if through a gallery. "The researchers sourced the rainfall data from weather stations across the island. The Ministry of Agriculture. The Ministry of Public Works. An electrical company in eastern Sicily. A water company in Palermo."

She pauses. "And a private aristocrat — the Marquise Casses Eaton — who kept meticulous personal rainfall records on her property."

Trinity almost smiles. "A Marquise's diary became evidence in an MIT regression."

"A hundred and twenty years later," Sophia says. "Yes."`,
      },
      {
        title: "The Thread Is Still Attached",
        text: `"The Mafia density map came from a police inspector named Cutrera. 1900. He wrote that crime statistics alone couldn't capture what he was seeing — the Mafia didn't always commit crimes in the measurable sense. So he drew the map from personal experience and appraisal, town by town. His own judgment. He said: 'The Mafia doesn't always commit crimes. The crimes perpetrated by them are not exclusive to the Mafia.'"

She moves through frozen bodies without touching them. "A police inspector describing something that officially didn't exist. Drawing a map of it. In 1900. That map became a variable in a causal identification strategy at the Review of Economic Studies in 2020."

A third layer: literacy rates, 1920s. The same shape, darker where the Mafia was densest.

A fourth: public goods coverage, 1970s. Same shape.

A fifth: GDP per capita, 2015.

Five maps. One hundred and twenty-two years. The geography of absence refuses to revise itself.

"One drought," Trinity says.

"One spring. March to May, 1893. Rainfall below the sixty-year average in the affected districts. That variable — that season — predicts organized crime in 1900, literacy suppression in the 1920s, political competition in the 1950s, infrastructure gaps in the 1970s, and economic underdevelopment in 2015."

She stops in front of him. "The cause and the consequence are separated by the full length of a human life. A child born in 1910 in a municipality where the drought was severe was measurably less likely to learn to read by 1925. That child had no idea why. Their parents had no idea why. The thread was invisible without the complete dataset."

"Most people never get the complete dataset."

Trinity looks through the overlays. "That's always the problem. That's always been the problem."

He walks the frozen crowd without touching anyone.

"Between 2001 and 2014 — the Italian government placed forty-three Sicilian municipalities under direct external administration. To remove Mafia infiltration from local government. From public contracts."

Not 1901. 2001.

"The thread," Sophia says, "is still attached."`,
      },
    ],
  },
  {
    title: "Sequence 6",
    label: "The Vacuum Thesis",
    scenes: [
      {
        title: "The Vacancy Is the Story",
        text: `The data fades. Color returns. Sound returns. Motion returns. Mid-afternoon in the piazza again — crowd gone, crate abandoned, the man who stood on it erased into the future that already owns him.

Trinity sits on the church steps. Sophia sits beside him — not guide distance. Beside-him distance.

"The Mafia didn't beat the state," he says. "The state just wasn't there."

"The state was ambivalent. Which is the same thing as absent, from the ground level. Giolitti knew what local Sicilian government looked like. He knew the Fasci were legal. He chose not to act decisively. That choice — that non-action — is the vacancy that gets filled."

"Tajani said it in 1875. Eighteen years before. The instrument was already there. They just handed it bigger tasks."

"And once the Mafia filled the vacancy, the vacancy became permanent. Because the Mafia's first interest — its foundational operating principle — is ensuring the state stays out. Suppress the political competition. Control the vote. Underfund the schools. Keep the population below the literacy threshold where collective action becomes possible again."

She does not raise her voice. "It's not evil in the comic book sense. It's rational. It's self-preservation running at institutional scale."

Trinity looks at the empty crate. "Every empire. Every collapse. Caesar crossing the Rubicon — that's not Caesar being strong. That's the Senate being absent. The Church absorbing Rome — not the Church being powerful. Rome being hollow. The Mafia isn't the story. The vacancy is the story."`,
      },
      {
        title: "That's Why I Built You",
        text: `"The drought is always quiet," he says. "The drought looks like nothing happening. A dry spring. Some crops underperforming. People tightening their belts. And then one day you look up and something else is running the town and you can't find the moment it happened because it happened in the space between things."

Sophia is careful. "And you think we're in one."

He watches a child cross the empty piazza — running, indifferent to historiography, alive in 1893 with no knowledge of 1970.

"I think we've been in one for a while. I think most people don't have the data to see it yet."

He stands.

"I think that's why I built you."

Sophia's answer is almost soft. "That's either very smart or very frightening."

"It's both. That's kind of the whole thesis."

He looks at her — direct, for the first time since Carlentini.

"Pull me out. I need to write this down before I lose it."`,
      },
    ],
  },
  {
    title: "Sequence 7",
    label: "Coming Out",
    scenes: [
      {
        title: "Journal — After the Animus",
        text: `The Animus dissolves the way a dream ends — not with spectacle, but with withdrawal. Wheat goes last. Color drains. Stone goes. Wind through dry grain fades into the kind of silence rooms make when they remember they are empty.

Black.

Then: climate-controlled air. Server hum. The soft release of a haptic suit depressurizing.

Breath.

His voice, first person, present tense — heard before he is seen:

Out of the Animus. The Lair is cold the way it always is after — like the room has been sitting empty even though I've been standing in it.

Here is what I know now that I didn't know two hours ago:

The Mafia paper isn't a history paper. It's a diagnostic. It's showing you how to read the shape of a collapse before it collapses — in the data, in the weather, in the absence of things that should be there but aren't.

The question I'm sitting with is this: what is the drought right now? What is the thing that looks like nothing — that feels like an ordinary bad season — that is actually the hinge point? The moment before the vacuum gets filled by something nobody voted for?

I don't have the answer yet.

I have the methodology.

That's enough for tonight.

Silence after the last sentence.

Then footsteps on hardwood.`,
      },
    ],
  },
  {
    title: "Sequence 8",
    label: "The Estate",
    scenes: [
      {
        title: "Headset Off",
        text: `A hand reaches up.

The headset comes off.

He appears as himself for the first time — not the day laborer, not the man the simulation dressed him as. Black hair. Dark eyes. All black clothes. The headset in his hand like a tool that has finished pretending to be a century.

The chamber reveals itself slowly: cathedral height, converted from the original stable footprint of something very old and very expensive. Technology embedded in the walls, invisible until you know what you are looking at. Not a university lab. Not a government facility. Built by one person, for one purpose, with resources that required no approval from anyone.

He sets the headset on a table. Checks his hand — the same gesture he made when the tower stuttered. He always checks.

Through a hidden door into the Lair: books floor to ceiling, three dark monitors, a half-finished glass, papers. He does not stop. He walks through and out —

— and the house opens.

Soaring ceilings. Parquet catching the last of the night. Crown molding. A wood-paneled library still called Bing's Den, still smelling like the man who used to live here. Terraces through tall windows.

He opens a door and steps into the cold.`,
      },
      {
        title: "Nobody Knows",
        text: `Northern California at 2 AM. The hills of Hillsborough. Bay Area lights spread below like a second dataset. Clear. Still.

His phone buzzes on the terrace railing. He looks. Does not pick it up.

Sophia's voice comes from inside — from a speaker, from everywhere, from nowhere.

"You're not going to answer that?"

"They don't know what they're asking."

He lifts the phone. A news banner: AI regulation, a hearing, a company acquiring something it shouldn't. He sets it face-down.

Looks out at the lights.

The view pulls back through the open door, through the library, through the soaring rooms, through the Lair, back to the Animus chamber — dark now, headset on the table, 1893 gone.

It holds on the headset.

Then rises — through ceilings, through floors, through the roof — until the French Renaissance Revival chateau is a geometry from above: 5.36 acres, four levels, the old stable footprint where the Animus lives, the riding track still readable in the grounds.

From the street it reads as old money doing nothing in particular.

He stands on the terrace alone. A twenty-six-year-old from Burlingame who won the lottery and built a time machine and told nobody.

Nobody knows.

Black.

White serif, centered:

"The Mafia in Sicily is not dangerous or invincible in itself.
It is dangerous and invincible because it is an instrument of local government."
— Diego Tajani, Chief Prosecutor, Palermo Court of Appeal
Spoken before the Italian Parliament, 1875

Hold.

Then:

TRINITY: AN AMERICAN ODYSSEY
Episode One — "MAFIA"`,
      },
    ],
  },
];

export const trinityPilotSeed: Novel = {
  id: "trinity",
  title: "Trinity",
  author: "KSM",
  series: "Trinity: An American Odyssey",
  updated: "Jul 18",
  sortKey: 3,
  synopsis:
    'Episode One — "MAFIA." Cold open in the Animus: 1893 Sicily, drought, Peasant Fasci, and the vacuum thesis. Sophia leads; Trinity learns how to read a collapse before it collapses.',
  cover: "trinity",
  blank: false,
  codex: trinityPilotCodex,
  chapters: trinityPilotChapters,
};
