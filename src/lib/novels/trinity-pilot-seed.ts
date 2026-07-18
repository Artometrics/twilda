import type { CodexEntry, Chapter, Novel } from "@/apps/novelcrafter/data";

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
    'Book I · Episode 1 — "MAFIA." Cold open in the Animus: 1893 Sicily, drought, Fasci, vacuum thesis. Sophia leads; Trinity is the student. Ends with the Estate reveal.',
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
• Runtime target: 22-minute anime pilot · 8 sequences · four-layer structure`,
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
    content: `1. Carlentini — 0:00–2:45 — Layer 4 — Wheat field, olive on the ground, fixed rent
2. The Agro-Town — 2:45–6:30 — Layer 4 — Piazza, Fasci demands, 177 organizations
3. The Contract — 6:30–9:15 — Layer 4 — Landowner meeting; instrument handed bigger tasks
4. The Bell Tower — 9:15–12:30 — Layer 4 — Giardinello / Lercara / Gibellina; first sim glitch
5. The Data — 12:30–15:30 — Layer 4 — Five maps; Cutrera; Marquise; 122 years
6. The Vacuum Thesis — 15:30–18:00 — Layer 4 — Full conversation; "I think that's why I built you"
7. Coming Out — 18:00–20:15 — Layer 2 — Journal VO over black
8. The Estate — 20:15–22:00 — Reveal — Headset off; Hillsborough; Tajani smash`,
  },
  {
    title: "What this draft is (vs v1 / v2)",
    content: `PILOT is the production draft of Episode 1 for TRINITY: AN AMERICAN ODYSSEY — Animus cold opens, Sophia as guide, Trinity as student, historical case studies as diagnostic method.

v1 (Metafiction Cycle) — earlier Trinity / KSM / Sophia-on-Mars frame. Consult for metafiction ancestry.
v2 (Series Bible) — Kane / vampire / Cole Risk Partners thriller outline. Parallel branch; not this episode's continuity.

PILOT inherits Sophia + Animus + Estate energy and grounds Book I in the Sicilian Mafia case study as the first "field report" Trinity runs.`,
  },
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
        text: `Black screen. No title. No music.

Then: a sound. Wind moving through dry wheat. The kind of sound that means something is wrong with the wheat.

The image builds slowly — the way a memory surfaces. First the color: bone white, the color of Sicilian hillside in a drought year. Then the shape: terraced fields dropping toward the sea, olive trees with their silver leaves gone still, a village of flat-roofed white buildings clustered on the ridge above.

It is beautiful. It is also completely wrong. The wheat should be green. It is March. The wheat is the color of August.

A woman stands at the edge of a field. Period dress — 1890s Sicilian, practical, dark wool, the kind of clothes that absorb heat and don't complain about it. She is looking at the crops the way a doctor looks at a patient she already knows the prognosis for.

A man approaches up the path. He is dressed as a day laborer — rough linen, worn boots, dark hair. He stops beside her. They stand together looking at the field.

She speaks first. She always speaks first.`,
      },
      {
        title: "Fixed Rent",
        text: `SOPHIA
(in Italian-accented English, quietly, not performing)
Two years. 1892 was already bad. They told themselves it was temporary. That's what you do — you tell yourself it's temporary and you renew the contract and you eat less and you wait.

This is the third month with no rain. The yield this year will be half. Maybe less.

TRINITY
(looking at the wheat, not at her)
And the contracts?

SOPHIA
Fixed rent. One year. He pays the same whether the field produces or not. If it doesn't produce, he doesn't eat — but he still pays. That's the arrangement now. That's what they changed.

(she turns and walks into the field, stepping carefully between the rows)
Come. I want to show you something.

Trinity follows her into the wheat. The stalks brush his arms — dry, papery, wrong. The camera drops low and moves through the field with them, wheat filling the frame on both sides.

SOPHIA
The day laborers have it worse. At least the contract farmer has a contract. The day laborer gets hired in the morning if the estate needs hands. This year the estate doesn't need hands. The crop is half the size. The work is half the work.

(she crouches, picks up a fallen olive from the ground — dried, shriveled, still attached to its stem)
You know what the newspaper wrote about this town in October?

TRINITY
Tell me.

SOPHIA
"The olives fall dried and drenched from the trees. The poor peasants are unemployed and bear more than anyone else the effect of such calamity. Misery is immense here, as all over the island."

(she sets the olive back on the ground)
That was October. The drought hit in March. They lived with this for seven months before anyone wrote it down.

Trinity looks at the olive on the ground. The camera holds on it.

CUT TO: TITLE CARD — white serif text on black.

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
        text: `They walk out of the field and into the village. Narrow streets — whitewashed walls, terracotta, the smell of stone that hasn't seen rain. The piazza opens up ahead.

It is full. Not a market crowd — a meeting crowd. Men standing in clusters, talking low. Women in doorways watching. Children running between legs. The agro-town at midday, everyone home because there is no work to go to.

SOPHIA
(walking, not stopping)
This is the thing the landowners didn't understand when they designed these towns. They concentrated the labor to make harvest easier. Call everyone from the piazza at dawn, walk out together, work the estate, walk back. Efficient.

TRINITY
They put them all in the same room.

SOPHIA
Every day. With nothing to do in the off-season. Nothing to do this year because the crop failed.

(she pauses at the edge of the piazza, watching the crowd)
Hobsbawm wrote that the agro-town structure gave the peasants the opportunity to "discuss grievances, formulate unified strategies, and act collectively." He meant it as analysis. The landowners experienced it as catastrophe.`,
      },
      {
        title: "Because It Didn't Rain",
        text: `A man climbs onto a wooden crate at the center of the piazza. He is not a performer — he has the careful stillness of someone who has thought hard about what he is about to say and decided to say it anyway. He begins to read from a paper.

SOPHIA
(translating quietly)
Higher wages. Longer-term contracts — back to sharecropping so the risk is shared. Land redistribution from the large estates. And lower taxes on bread, oil, the staples.

This is what they want. It is not a long list.

TRINITY
And the response?

SOPHIA
The landowners call it socialism. They write to Rome asking for the army. The central government is — ambivalent. The prime minister knows the Fasci are organizing legally. He has even used them as a political lever against his opponents.

(she looks at Trinity)
Rome is not coming. The landowners understand this by the end of the year. And then they make a different call.

TRINITY
How many of these towns?

SOPHIA
By the end of 1893 — 177 organizations. 161 municipalities. Hundreds of thousands of members. Half of the entire Italian Socialist Party's membership that year was Sicilian.

(she lets that land)
Half of a national party. From one island. Because it didn't rain.

Trinity looks at the man on the crate. The crowd listening. The complete quiet of people hearing something said out loud that they've been thinking for years.

TRINITY
What's his name?

SOPHIA
It doesn't matter. He'll be arrested in January.`,
      },
    ],
  },
  {
    title: "Sequence 3",
    label: "The Contract",
    scenes: [
      {
        title: "Frightened Men Doing Arithmetic",
        text: `Interior. A landowner's estate house — cool, dark, high-ceilinged. A different world from the piazza. Maps on the walls. Account ledgers. The smell of money that is not currently worried about the harvest because it doesn't have to be.

Sophia and Trinity stand at the edge of the room, observers. Around a large table: three men. Estate managers. Rural bourgeoisie. They are not villains in the operatic sense. They are frightened men doing arithmetic.

SOPHIA
(quiet, for Trinity's ears)
The tax structure is the tell. Indirect taxes on staple consumption in Sicily are twice the national average. Taxes on land and buildings — one third the national average. The councils set the tax rates. The councils are controlled by these men.

(she nods toward the table)
During the drought, several municipalities obtained special authorization from Rome to raise the indirect taxes even further — above the national statutory ceiling. The people with nothing are being taxed harder because the system needs revenue and they are the only ones it can reach.

One of the men at the table speaks. Low, deliberate. The camera doesn't translate — we watch his face, not his words.

TRINITY
What is he saying?

SOPHIA
He's saying the government won't help. He's saying the strikes are spreading. He's saying the Fasci have affiliated with the Socialist Party and that changes the politics. He's saying he has an estate to protect and children to feed and he needs this resolved.

He's saying he knows someone.

The man at the head of the table nods once. The conversation ends. The other two men stand.`,
      },
      {
        title: "An Instrument of Local Government",
        text: `TRINITY
(quietly)
They didn't want to do this.

SOPHIA
They told themselves that. Most of them. The rural guards were already there — already embedded in the estate system, already performing enforcement functions. What changed in 1893 was the scale of what they were asked to do.

(she turns to face Trinity directly)
The former chief prosecutor at the Palermo Court of Appeal said it before parliament in 1875. Eighteen years before any of this. He said: "The Mafia in Sicily is not dangerous or invincible in itself. It is dangerous and invincible because it is an instrument of local government."

He said that in 1875. Nobody dismantled the instrument. They just handed it bigger tasks.

Trinity looks at the table where the men were sitting. Empty now. A ledger still open. Numbers that will balance on someone else's suffering.`,
      },
    ],
  },
  {
    title: "Sequence 4",
    label: "The Bell Tower",
    scenes: [
      {
        title: "Where Are They?",
        text: `Exterior. The central square of Giardinello. The piazza is full — a rally, hundreds of people, voices layered over each other, a crowd that has crossed from grievance into something that feels like momentum.

Sophia and Trinity stand at the edge. Trinity is watching the crowd. Then he does something the audience has not seen him do before — he looks up.

He looks at the buildings surrounding the square. The walls. The windows. The church.

The bell tower.

TRINITY
(still looking up)
Where are they?

Sophia follows his gaze. A long beat.

SOPHIA
The paper documents it in three locations. Giardinello — shots from the mayor's house overlooking the square as the demonstrators were leaving. Five dead. Then the army arrived and killed two more.

(she doesn't look away from the tower)
Lercara. Christmas Day, 1893. A sulphur-mining town. Armed guards concealed in the bell tower. They waited until the rally was at its fullest and then fired into the crowd below. Then the army came and increased the death toll.

Gibellina. January 2nd, 1894. The same architecture. Bell tower. Hidden guards. Rally below. Shots into the crowd.

TRINITY
The same setup. Three towns.

SOPHIA
It's not panic. It's not spontaneous. Someone pre-positioned armed men in elevated positions above public squares before the crowds gathered. This is coordination.

(she finally looks at him)
The bell tower sees the whole piazza. The crowd doesn't see the bell tower until it's too late.`,
      },
      {
        title: "Joint Action",
        text: `In the simulation, the crowd below them continues — alive, loud, completely unaware. Trinity watches them. The camera moves slowly up the exterior of the bell tower. Reaches the opening at the top. Holds.

We don't see what's inside.

Then — just for a frame, barely perceptible — the stone texture of the tower stutters. A render artifact. A seam in the simulation showing through.

Trinity sees it. The audience sees it. Neither says anything.

The simulation continues.

SOPHIA
By early January 1894 — after months of strikes, rallies, dead peasants — the Fasci were declared illegal. Leaders arrested. State of emergency. Curfew.

(quietly)
The historian Santino wrote that the movement was "bloodily repressed by the joint action of the Institutions and the Mafia."

Joint action. Together.`,
      },
    ],
  },
  {
    title: "Sequence 5",
    label: "The Data",
    scenes: [
      {
        title: "Five Maps",
        text: `The simulation shifts — not ends, but transforms. The piazza desaturates, stills. The crowd freezes mid-motion like a paused film. The sky goes to a neutral grey.

And then data begins to appear — overlaid on the frozen historical world like a transparency laid over a photograph.

A rainfall map of Sicily. Municipality by municipality. The darker the color, the less rain fell in the spring of 1893.

Then a second layer materializes over it — Mafia presence, 1900. Town by town, coded by density: no presence, little presence, significant presence, major presence.

The shapes align. Almost perfectly.

SOPHIA
(narrating, moving through the frozen crowd as if through a museum)
The researchers sourced the rainfall data from weather stations across the island. The Ministry of Agriculture. The Ministry of Public Works. An electrical company in eastern Sicily. A water company in Palermo.

(she pauses)
And a private aristocrat — the Marquise Casses Eaton — who kept meticulous personal rainfall records on her property.

TRINITY
(he almost smiles)
A Marquise's diary became evidence in an MIT regression.

SOPHIA
A hundred and twenty years later. Yes.`,
      },
      {
        title: "The Thread Is Still Attached",
        text: `(she continues walking through the frozen scene)
The Mafia density map came from a police inspector named Cutrera. 1900. He wrote that crime statistics alone couldn't capture what he was seeing — the Mafia didn't always commit crimes in the measurable sense. So he drew the map from personal experience and appraisal, town by town. His own judgment. He said: "The Mafia doesn't always commit crimes. The crimes perpetrated by them are not exclusive to the Mafia."

A police inspector describing something that officially didn't exist. Drawing a map of it. In 1900. That map became a variable in a causal identification strategy at the Review of Economic Studies in 2020.

A third layer materializes: literacy rates, 1920s. The same shape, darker where the Mafia was densest.

A fourth: public goods coverage, 1970s. Same shape.

A fifth: GDP per capita, 2015.

Five maps. One hundred and twenty-two years. The shape doesn't change.

TRINITY
One drought.

SOPHIA
One spring. March to May, 1893. Rainfall below the sixty-year average in the affected districts. That variable — that season — predicts organized crime in 1900, literacy suppression in the 1920s, political competition in the 1950s, infrastructure gaps in the 1970s, and economic underdevelopment in 2015.

(she stops and faces him)
The cause and the consequence are separated by the full length of a human life. A child born in 1910 in a municipality where the drought was severe was measurably less likely to learn to read by 1925. That child had no idea why. Their parents had no idea why. The thread was invisible without the complete dataset.

Most people never get the complete dataset.

TRINITY
(looking at the overlaid maps)
That's always the problem. That's always been the problem.

He walks through the frozen crowd, through the overlaid data, touching nothing.

TRINITY
Between 2001 and 2014 — the Italian government placed forty-three Sicilian municipalities under direct external administration. To remove Mafia infiltration from local government. From public contracts.

Not 1901. 2001.

SOPHIA
The thread is still attached.`,
      },
    ],
  },
  {
    title: "Sequence 6",
    label: "The Vacuum Thesis",
    scenes: [
      {
        title: "The Vacancy Is the Story",
        text: `The data layers fade. The simulation restores — color, sound, motion. They are back in the piazza, mid-afternoon. The crowd from the rally has dispersed. The crate is abandoned in the center of the square. The man who was standing on it is gone.

Trinity sits on the steps of the church. Sophia sits beside him — not the guide position now, the beside-him position.

TRINITY
The Mafia didn't beat the state. The state just wasn't there.

SOPHIA
The state was ambivalent. Which is the same thing as absent, from the ground level. Giolitti knew what local Sicilian government looked like. He knew the Fasci were legal. He chose not to act decisively. That choice — that non-action — is the vacancy that gets filled.

TRINITY
Tajani said it in 1875. Eighteen years before. The instrument was already there. They just handed it bigger tasks.

SOPHIA
And once the Mafia filled the vacancy, the vacancy became permanent. Because the Mafia's first interest — its foundational operating principle — is ensuring the state stays out. Suppress the political competition. Control the vote. Underfund the schools. Keep the population below the literacy threshold where collective action becomes possible again.

It's not evil in the comic book sense. It's rational. It's self-preservation running at institutional scale.

TRINITY
Every empire. Every collapse. Caesar crossing the Rubicon — that's not Caesar being strong. That's the Senate being absent. The Church absorbing Rome — not the Church being powerful. Rome being hollow. The Mafia isn't the story. The vacancy is the story.`,
      },
      {
        title: "That's Why I Built You",
        text: `(he looks at the empty crate in the center of the square)
The drought is always quiet. The drought looks like nothing happening. A dry spring. Some crops underperforming. People tightening their belts. And then one day you look up and something else is running the town and you can't find the moment it happened because it happened in the space between things.

SOPHIA
(carefully)
And you think we're in one.

Trinity doesn't answer immediately. He watches a child cross the empty piazza — running, indifferent to history, alive in 1893 with no knowledge of 1970.

TRINITY
I think we've been in one for a while. I think most people don't have the data to see it yet.

(he stands)
I think that's why I built you.

SOPHIA
(a beat — the closest she comes to vulnerability)
That's either very smart or very frightening.

TRINITY
It's both. That's kind of the whole thesis.

(he looks at her — direct, for the first time in the episode)
Pull me out. I need to write this down before I lose it.`,
      },
    ],
  },
  {
    title: "Sequence 7",
    label: "Coming Out",
    scenes: [
      {
        title: "Journal — After the Animus",
        text: `The Animus dissolves.

Not dramatically — the way a dream ends. The wheat fields go last. The color drains. The stone goes. The sound of wind through dry grain fades to silence.

Black.

Then: the sound of a different room. Climate-controlled air. The hum of servers. The soft release of a haptic suit depressurizing.

We hear him breathe.

His voice — narrating, first person, present tense:

TRINITY (V.O.)
Out of the Animus. The Lair is cold the way it always is after — like the room has been sitting empty even though I've been standing in it.

Here is what I know now that I didn't know two hours ago:

The Mafia paper isn't a history paper. It's a diagnostic. It's showing you how to read the shape of a collapse before it collapses — in the data, in the weather, in the absence of things that should be there but aren't.

The question I'm sitting with is this: what is the drought right now? What is the thing that looks like nothing — that feels like an ordinary bad season — that is actually the hinge point? The moment before the vacuum gets filled by something nobody voted for?

I don't have the answer yet.

I have the methodology.

That's enough for tonight.

The camera remains on black through this entire narration. We hear him — but we don't see him yet.

The narration ends.

Silence.

Then the sound of footsteps on hardwood.`,
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

We see him for the first time as himself — not the day laborer, not the man in the simulation. Black hair. Dark eyes. All black clothes. The headset in his hand.

The camera pulls back slowly.

The Animus chamber. Full reveal. Enormous — cathedral ceiling height, converted from the original stable footprint of something very old and very expensive. The technology is embedded in the walls, invisible until you know what you're looking at. This is not a university lab. This is not a government facility. This was built by one person, for one purpose, with resources that required no approval from anyone.

He sets the headset on a table. Looks at his hand for a moment — the same gesture he made in the simulation when the texture stuttered. Checking that he's back. He always checks.

He walks out of the Animus chamber. Through a hidden door. Into a private study — the Lair. Books floor to ceiling. A desk with three monitors, dark. A half-finished glass of something. Papers.

He doesn't stop. He walks through the Lair and out.

And then the house opens.

Soaring ceilings. Hardwood parquet floors catching the last of the night light. Crown molding. A wood-paneled library — Bing's Den, still called that, still smelling like the man who used to live here. Multiple terraces visible through tall windows.

He walks to one of them. Opens the door. Steps out.`,
      },
      {
        title: "Nobody Knows",
        text: `Northern California at 2 AM. The hills of Hillsborough. The lights of the Bay Area spread below. Cold, clear, completely still.

He stands there.

His phone buzzes on the terrace railing. He looks at it. Doesn't pick it up.

Sophia's voice comes from inside — from a speaker, from everywhere, from nowhere:

SOPHIA
You're not going to answer that?

TRINITY
They don't know what they're asking.

He picks up the phone. Looks at the screen. A news notification — something about AI regulation, a congressional hearing, a company acquiring something it shouldn't.

He sets it face-down on the railing.

Looks out at the lights.

The camera pulls back through the open terrace door. Through the library. Through the soaring ceilings. Back through the Lair. Back to the Animus chamber — now dark, the headset on the table, the wheat fields of 1893 Sicily gone.

It holds on the headset.

Then the camera begins to rise — up through the ceiling, through the floors, up through the roof of the estate. The French Renaissance Revival chateau from above. 5.36 acres. Four levels. The old stable footprint where the Animus lives. The riding track, still visible in the grounds.

From the street it reads as old money doing nothing in particular.

He is standing on the terrace. Alone. A 26-year-old from Burlingame who won the lottery and built a time machine and told nobody.

Nobody knows.

SMASH CUT TO BLACK.

Over black — one line of text, white, serif, centered:

"The Mafia in Sicily is not dangerous or invincible in itself.
It is dangerous and invincible because it is an instrument of local government."
— Diego Tajani, Chief Prosecutor, Palermo Court of Appeal
Spoken before the Italian Parliament, 1875

Hold.

Then:

TRINITY: AN AMERICAN ODYSSEY
Episode One — "MAFIA"

FADE OUT.`,
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
