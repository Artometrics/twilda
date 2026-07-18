import type { CodexEntry, Chapter, Novel } from "@/apps/novelcrafter/data";

/**
 * Trinity draft — PILOT
 * Book I / Episode 1 — "MAFIA"
 * Source: 22-minute anime pilot script + Acemoglu, De Feo & De Luca (2020),
 * "Weak States: Causes and Consequences of the Sicilian Mafia" (Restud).
 */

export const trinityPilotSnippets: { title: string; content: string }[] = [
  {
    title: "PILOT — logline",
    content: `TRINITY: AN AMERICAN ODYSSEY — Book I / Episode 1 — "MAFIA"

A 26-year-old from Burlingame who won the lottery and built a private time machine — the Animus — runs Sicily 1893 with Sophia as guide. One drought season teaches him how vacuums get filled: Peasant Fasci rise, Rome stays ambivalent, landowners hand the rural guards bigger tasks, and the shape of that choice still shows up in literacy, public goods, and GDP a century later.

Tone: historical drama that slowly reveals it is something else entirely.
Music: Ennio Morricone meeting Hans Zimmer — spare, Mediterranean, then modern underneath.
Cold open inside the Animus. No title card until after Carlentini. Don Draper reveal (headset off, Estate visible) is the final image.`,
  },
  {
    title: "Four-layer structure",
    content: `Layer 4 — The Sophia Dialogue / Animus (Sequences 1–6): Sicily 1893 as lived simulation. Sophia leads; Trinity is the student.

Layer 2 — The Journal / Transition (Sequence 7): Animus dissolves; first-person V.O. over black. We hear him before we see him.

Reveal — The Estate (Sequence 8): Headset off. Hillsborough. Sophia on speakers. Phone buzzes with AI regulation news. Smash cut to Tajani 1875 quote.

Production rule: Sophia always speaks first. Trinity is running him — she is running the lesson.`,
  },
  {
    title: "Source paper — one-page bible",
    content: `Acemoglu, De Feo & De Luca (2020). "Weak States: Causes and Consequences of the Sicilian Mafia." Review of Economic Studies 87: 537–581.

Causal chain:
1. Spring 1893 drought → severe agricultural collapse (yield ~half; already bad in 1892).
2. Peasant Fasci surge — by end of 1893: 177 organizations, 161 municipalities, hundreds of thousands of members; half of Italian Socialist Party membership that year was Sicilian.
3. Weak / ambivalent central state (Giolitti) does not suppress or reform decisively.
4. Landowners & rural bourgeoisie turn to rural guards / Mafia as instrument of local government.
5. Instrumental-variables result: drought severity in 1893 predicts Mafia density in 1900 (Cutrera map), then literacy & public goods in 1910s–20s, political competition, and weaker but persistent long-run gaps.

Key line (Tajani, 1875, before Parliament): "The Mafia in Sicily is not dangerous or invincible in itself. It is dangerous and invincible because it is an instrument of local government."

Every town, death, tax fact, and data source in the pilot is drawn from this paper.`,
  },
  {
    title: "Vacuum thesis (episode thesis)",
    content: `The Mafia didn't beat the state. The state just wasn't there — or was ambivalent, which is the same thing from the ground.

Once a vacancy is filled by a private enforcement order, the vacancy becomes permanent: suppress political competition, control the vote, underfund schools, keep literacy below the threshold where collective action becomes possible again.

It's not comic-book evil. It's rational self-preservation at institutional scale.

Trinity's leap: Every empire, every collapse — the drought is always quiet. The drought looks like nothing happening. Then one day something else is running the town and you can't find the moment it happened because it happened in the space between things.

Episode question he walks out with: What is the drought right now?`,
  },
  {
    title: "Sequence map (22:00)",
    content: `1. Carlentini — 0:00–2:45 — drought wheat, fixed-rent contracts, newspaper olive quote
2. The Agro-Town — 2:45–6:30 — piazza organizing, Fasci demands, 177 orgs
3. The Contract — 6:30–9:15 — estate house, tax structure, "he knows someone"
4. The Bell Tower — 9:15–12:30 — Giardinello / Lercara / Gibellina; first sim glitch
5. The Data — 12:30–15:30 — five map layers; Cutrera; Marquise Casses Eaton; 122 years
6. The Vacuum Thesis — 15:30–18:00 — full conversation; "that's why I built you"
7. Coming Out — 18:00–20:15 — journal V.O. over black
8. The Estate — 20:15–22:00 — headset off; Hillsborough; Tajani card`,
  },
  {
    title: "Journal entry — post-Animus (Seq 7 standalone)",
    content: `Out of the Animus. The Lair is cold the way it always is after — like the room has been sitting empty even though I've been standing in it.

Here is what I know now that I didn't know two hours ago:

The Mafia paper isn't a history paper. It's a diagnostic. It's showing you how to read the shape of a collapse before it collapses — in the data, in the weather, in the absence of things that should be there but aren't.

The question I'm sitting with is this: what is the drought right now? What is the thing that looks like nothing — that feels like an ordinary bad season — that is actually the hinge point? The moment before the vacuum gets filled by something nobody voted for?

I don't have the answer yet.
I have the methodology.
That's enough for tonight.`,
  },
];

const trinityPilotCodex: CodexEntry[] = [
  {
    id: "trinity-pilot",
    type: "character",
    name: "Trinity",
    initials: "TR",
    color: "from-zinc-800 to-rose-950",
    tags: ["protagonist", "animus", "hillsborough", "student-this-episode"],
    aliases: ["The student"],
    summary:
      "26-year-old from Burlingame who built a private Animus on a Hillsborough estate; student in Episode 1 — Sophia runs him.",
    description: `Not the vampire myth in this draft — the American Odyssey frame. Lottery wealth. Built a time machine and told nobody. Lives in a French Renaissance Revival chateau (5.36 acres, four levels; Animus in the old stable footprint).

In Episode 1 he is the student. Sophia leads. He asks the questions that open the vacuum thesis. Final image: headset off, terrace at 2 AM, Bay Area lights, phone face-down with AI regulation news.

Always checks his hand after a simulation glitch — same gesture in Sicily and in the Lair.`,
  },
  {
    id: "sophia-pilot",
    type: "character",
    name: "Sophia",
    initials: "SO",
    color: "from-cyan-700 to-slate-900",
    tags: ["guide", "ai", "animus", "dialogue"],
    aliases: [],
    summary:
      "Animus guide who leads Episode 1; Italian-accented English in-sim; speaker voice at the Estate. She always speaks first.",
    description: `Layer 4: period dress, 1890s Sicilian practical wool — walks Trinity through Carlentini, the agro-town, the estate house, the bell towers, the data overlays.

She translates the piazza speaker. She quotes the newspaper, Tajani, Santino, Hobsbawm. She is not performing; she is teaching.

Closest she comes to vulnerability: "That's either very smart or very frightening" when he says he built her to see the drought.

At the Estate: voice from speakers — everywhere and nowhere. "You're not going to answer that?"`,
  },
  {
    id: "the-animus",
    type: "lore",
    name: "The Animus",
    initials: "AN",
    color: "from-amber-800 to-zinc-950",
    tags: ["technology", "time-machine", "haptics", "layer-4"],
    aliases: ["the simulation"],
    summary:
      "Private VR/haptic historical simulation built into the Estate's old stable; cathedral ceiling, tech embedded in walls.",
    description: `Not a university lab. Not a government facility. Built by one person, for one purpose, with resources that required no approval.

Episode 1 rule: open cold inside it — no preamble. First fracture: stone texture of the Giardinello bell tower stutters for a frame. Trinity sees it. Audience sees it. Neither says anything.

Coming out: climate-controlled air, server hum, haptic suit depressurizing. Wheat fields go last.`,
  },
  {
    id: "the-estate",
    type: "location",
    name: "The Estate (Hillsborough)",
    initials: "ES",
    color: "from-stone-600 to-emerald-950",
    tags: ["hillsborough", "lair", "reveal", "setting"],
    aliases: ["Bing's Den", "the Lair"],
    summary:
      "French Renaissance Revival chateau in Hillsborough — Animus in old stable, Lair study, Bing's Den library, terrace over the Bay.",
    description: `From the street: old money doing nothing in particular. Inside: soaring ceilings, hardwood parquet, crown molding, wood-paneled library still smelling like the man who used to live here (Bing's Den). Multiple terraces. Riding track still visible in the grounds.

Sequence 8 path: Animus chamber → hidden door → Lair (books, three dark monitors, half-finished glass) → house opens → terrace at 2 AM → Northern California hills and Bay lights.`,
  },
  {
    id: "carlentini",
    type: "location",
    name: "Carlentini",
    initials: "CA",
    color: "from-yellow-800 to-stone-900",
    tags: ["sicily", "1893", "drought", "cold-open"],
    aliases: [],
    summary:
      "Cold-open town — drought wheat in March the color of August; Il Giornale di Sicilia olive quote (Oct 1893).",
    description: `Bone-white Sicilian hillside in a drought year. Terraced fields toward the sea. Olive trees still. Flat-roofed white village on the ridge.

Newspaper (Oct 1893): "The olives fall dried and drenched from the trees... Misery is immense here, as all over the island." Drought hit in March — seven months before anyone wrote it down.

Paper: yield ~half; already bad in 1892; fixed one-year rents; day laborers with no morning hire.`,
  },
  {
    id: "peasant-fasci",
    type: "lore",
    name: "Peasant Fasci (Fasci dei Lavoratori)",
    initials: "PF",
    color: "from-red-800 to-amber-950",
    tags: ["1893", "socialism", "collective-action", "history"],
    aliases: ["the Fasci"],
    summary:
      "First mass socialist movement in Italy; drought of 1893 as major impetus; demands wages, contracts, land, lower staple taxes.",
    description: `First leagues 1891 (urban workers/artisans). Peasant orgs late 1892; drought 1893 is the surge.

Demands: higher wages; longer-term contracts / return to sharecropping; land redistribution from large estates; lower indirect taxes on bread, oil, staples.

By end of 1893: 177 organizations in 161 municipalities; hundreds of thousands of members; majority affiliated with Socialist Party. At first National Congress of Italian Socialist Party (1893), half of party members were from Sicily.

Declared illegal early January 1894 — leaders arrested, state of emergency, curfew. Santino: "bloodily repressed by the joint action of the Institutions and the Mafia."`,
  },
  {
    id: "giardinello-bell-tower",
    type: "location",
    name: "The Bell Towers",
    initials: "BT",
    color: "from-stone-700 to-red-950",
    tags: ["giardinello", "lercara", "gibellina", "massacre", "coordination"],
    aliases: ["Giardinello", "Lercara", "Gibellina"],
    summary:
      "Three coordinated massacre architectures: elevated firing positions over piazzas — Giardinello, Lercara (Christmas 1893), Gibellina (Jan 2 1894).",
    description: `Giardinello: shots from the mayor's house overlooking the square as demonstrators were leaving — five dead; army killed two more.

Lercara (sulphur-mining town): Christmas Day 1893 — armed guards concealed in the bell tower; waited until rally fullest; fired; army increased toll.

Gibellina: January 2, 1894 — same architecture.

Trinity's read: not panic. Pre-positioned men in elevated positions. Coordination.

First Animus glitch: stone texture of the tower stutters.`,
  },
  {
    id: "cutrera-map",
    type: "lore",
    name: "Cutrera Map (Mafia 1900)",
    initials: "CM",
    color: "from-violet-900 to-zinc-950",
    tags: ["data", "1900", "instrumental-variable", "source"],
    aliases: ["Mafia1900"],
    summary:
      "Police inspector Cutrera's 1900 town-by-town appraisal of Mafia density — not crime counts; became the Restud outcome variable.",
    description: `Cutrera: "The Mafia density cannot be represented with numbers [of crimes]... the Mafia does not always commit crimes, and... the crimes perpetrated by them are not exclusive of the Mafia." Personal appraisal, town by town.

Coded 0–3 (none / little / significant / major). A map of something that officially didn't exist — later a causal identification variable in Acemoglu et al. 2020.`,
  },
  {
    id: "drought-1893",
    type: "lore",
    name: "Drought of Spring 1893",
    initials: "D3",
    color: "from-amber-700 to-yellow-950",
    tags: ["instrument", "rainfall", "critical-juncture"],
    aliases: ["the drought", "the quiet hinge"],
    summary:
      "March–May 1893 rainfall shock — the paper's instrument; predicts Fasci location, Mafia 1900, and long-run underdevelopment.",
    description: `Relative rainfall from Eredia (1918): Ministry of Agriculture, Public Works, Electrical Society of Eastern Sicily, Palermo Aqueduct, and private aristocrat Marquise Casses Eaton's personal records.

Paper shows rainfall before 1892 and after 1893 does not have the same effect — critical juncture + Fasci mobilization.

In the Animus "Data" sequence: five overlays — rainfall 1893 → Mafia 1900 → literacy 1920s → public goods 1970s → GDP per capita 2015. The shape doesn't change.

Between 2001 and 2014: forty-three Sicilian municipalities under external administration for Mafia infiltration. "The thread is still attached."`,
  },
  {
    id: "diego-tajani",
    type: "character",
    name: "Diego Tajani",
    initials: "DT",
    color: "from-slate-600 to-stone-900",
    tags: ["1875", "quote", "prosecutor", "history"],
    aliases: [],
    summary:
      "Former chief prosecutor, Palermo Court of Appeal — 1875 Parliament: Mafia dangerous as instrument of local government.",
    description: `Spoken eighteen years before the Fasci crisis. Nobody dismantled the instrument. In 1893 they handed it bigger tasks.

Episode end card — white serif on black — his full quote. Hold. Then series title.`,
  },
  {
    id: "vacuum-thesis-lore",
    type: "lore",
    name: "The Vacuum Thesis",
    initials: "VT",
    color: "from-rose-900 to-black",
    tags: ["theme", "thesis", "weak-states", "episode-1"],
    aliases: ["weak states"],
    summary:
      "Episode 1 thesis: vacancy, not strength, is the story — drought is quiet; private order fills the gap and makes the gap permanent.",
    description: `Trinity: "The Mafia isn't the story. The vacancy is the story."

Caesar / Church / Mafia — same shape: not the new power being strong; the prior order being hollow.

Operating principle of the filler: keep the state out. Suppress competition. Starve literacy. Prevent the next collective action.

Contemporary hinge he won't name yet — AI regulation notification on the terrace. Methodology without answer. That's the pilot's last beat.`,
  },
  {
    id: "book-i-mafia",
    type: "lore",
    name: "Book I — MAFIA (Pilot)",
    initials: "B1",
    color: "from-red-900 to-zinc-950",
    tags: ["book-1", "pilot", "outline", "american-odyssey"],
    summary:
      "First book of Trinity: An American Odyssey — Sicily 1893 Animus lesson that teaches Trinity how to read a collapse.",
    description: `Working title for the draft: PILOT.
Episode title: "MAFIA".
Form: 22-minute anime pilot structure novelized into eight sequences / chapters.

What this book must do:
1. Establish Sophia leads / Trinity learns.
2. Teach the causal chain from the Restud paper without becoming a lecture — olive on the ground, man on the crate, empty ledger, bell tower, five maps.
3. Land the vacuum thesis in dialogue, then in journal, then in the Estate reveal.
4. End on Tajani 1875 — the instrument was already there.

Next books (TBD): other historical "droughts" — other vacuums — until the contemporary hinge comes into focus.`,
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

A woman stands at the edge of a field. Period dress — 1890s Sicilian, practical, dark wool. She is looking at the crops the way a doctor looks at a patient she already knows the prognosis for.

A man approaches up the path. Day laborer clothes — rough linen, worn boots, dark hair. He stops beside her. They stand together looking at the field.

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

(she turns and walks into the field)
Come. I want to show you something.

Trinity follows. The stalks brush his arms — dry, papery, wrong. Day laborers have it worse: hired in the morning if the estate needs hands. This year the estate doesn't need hands.

She crouches, picks up a fallen olive — dried, shriveled, still attached to its stem.

SOPHIA
You know what the newspaper wrote about this town in October?

TRINITY
Tell me.

SOPHIA
"The olives fall dried and drenched from the trees. The poor peasants are unemployed and bear more than anyone else the effect of such calamity. Misery is immense here, as all over the island."

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
        title: "Same Room",
        text: `They walk out of the field and into the village. Narrow streets — whitewashed walls, terracotta, the smell of stone that hasn't seen rain. The piazza opens up ahead.

It is full. Not a market crowd — a meeting crowd. Men in clusters, talking low. Women in doorways watching. Children running between legs. The agro-town at midday, everyone home because there is no work to go to.

SOPHIA
(walking, not stopping)
This is the thing the landowners didn't understand when they designed these towns. They concentrated the labor to make harvest easier. Call everyone from the piazza at dawn, walk out together, work the estate, walk back. Efficient.

TRINITY
They put them all in the same room.

SOPHIA
Every day. With nothing to do in the off-season. Nothing to do this year because the crop failed.

Hobsbawm wrote that the agro-town structure gave the peasants the opportunity to "discuss grievances, formulate unified strategies, and act collectively." He meant it as analysis. The landowners experienced it as catastrophe.`,
      },
      {
        title: "The Man on the Crate",
        text: `A man climbs onto a wooden crate at the center of the piazza. Not a performer — the careful stillness of someone who has thought hard about what he is about to say and decided to say it anyway. He begins to read from a paper.

SOPHIA
(translating quietly)
Higher wages. Longer-term contracts — back to sharecropping so the risk is shared. Land redistribution from the large estates. And lower taxes on bread, oil, the staples.

This is what they want. It is not a long list.

TRINITY
And the response?

SOPHIA
The landowners call it socialism. They write to Rome asking for the army. The central government is — ambivalent. The prime minister knows the Fasci are organizing legally. He has even used them as a political lever against his opponents.

Rome is not coming. The landowners understand this by the end of the year. And then they make a different call.

TRINITY
How many of these towns?

SOPHIA
By the end of 1893 — 177 organizations. 161 municipalities. Hundreds of thousands of members. Half of the entire Italian Socialist Party's membership that year was Sicilian.

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
        title: "Estate House",
        text: `Interior. A landowner's estate house — cool, dark, high-ceilinged. A different world from the piazza. Maps on the walls. Account ledgers. The smell of money that is not currently worried about the harvest because it doesn't have to be.

Sophia and Trinity stand at the edge of the room, observers. Around a large table: three men. Estate managers. Rural bourgeoisie. They are not villains in the operatic sense. They are frightened men doing arithmetic.

SOPHIA
(quiet, for Trinity's ears)
The tax structure is the tell. Indirect taxes on staple consumption in Sicily are twice the national average. Taxes on land and buildings — one third the national average. The councils set the tax rates. The councils are controlled by these men.

During the drought, several municipalities obtained special authorization from Rome to raise the indirect taxes even further — above the national statutory ceiling. The people with nothing are being taxed harder because the system needs revenue and they are the only ones it can reach.`,
      },
      {
        title: "He Knows Someone",
        text: `One of the men at the table speaks. Low, deliberate. The camera doesn't translate — we watch his face, not his words.

TRINITY
What is he saying?

SOPHIA
He's saying the government won't help. He's saying the strikes are spreading. He's saying the Fasci have affiliated with the Socialist Party and that changes the politics. He's saying he has an estate to protect and children to feed and he needs this resolved.

He's saying he knows someone.

The man at the head of the table nods once. The conversation ends. The other two men stand.

TRINITY
(quietly)
They didn't want to do this.

SOPHIA
They told themselves that. Most of them. The rural guards were already there — already embedded in the estate system, already performing enforcement functions. What changed in 1893 was the scale of what they were asked to do.

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
        title: "Where Are They",
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

Lercara. Christmas Day, 1893. A sulphur-mining town. Armed guards concealed in the bell tower. They waited until the rally was at its fullest and then fired into the crowd below. Then the army came and increased the death toll.

Gibellina. January 2nd, 1894. The same architecture. Bell tower. Hidden guards. Rally below. Shots into the crowd.

TRINITY
The same setup. Three towns.

SOPHIA
It's not panic. It's not spontaneous. Someone pre-positioned armed men in elevated positions above public squares before the crowds gathered. This is coordination.

The bell tower sees the whole piazza. The crowd doesn't see the bell tower until it's too late.`,
      },
      {
        title: "Render Artifact",
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

Then a second layer — Mafia presence, 1900. Town by town, coded by density: no presence, little presence, significant presence, major presence.

The shapes align. Almost perfectly.

SOPHIA
(narrating, moving through the frozen crowd as if through a museum)
The researchers sourced the rainfall data from weather stations across the island. The Ministry of Agriculture. The Ministry of Public Works. An electrical company in eastern Sicily. A water company in Palermo.

And a private aristocrat — the Marquise Casses Eaton — who kept meticulous personal rainfall records on her property.

TRINITY
(he almost smiles)
A Marquise's diary became evidence in an MIT regression.

SOPHIA
A hundred and twenty years later. Yes.`,
      },
      {
        title: "The Thread",
        text: `The Mafia density map came from a police inspector named Cutrera. 1900. He wrote that crime statistics alone couldn't capture what he was seeing — so he drew the map from personal experience and appraisal, town by town. His own judgment.

"The Mafia doesn't always commit crimes. The crimes perpetrated by them are not exclusive to the Mafia."

A police inspector describing something that officially didn't exist. Drawing a map of it. In 1900. That map became a variable in a causal identification strategy at the Review of Economic Studies in 2020.

A third layer: literacy rates, 1920s. Same shape, darker where the Mafia was densest.
A fourth: public goods coverage, 1970s. Same shape.
A fifth: GDP per capita, 2015.

Five maps. One hundred and twenty-two years. The shape doesn't change.

TRINITY
One drought.

SOPHIA
One spring. March to May, 1893. Rainfall below the sixty-year average in the affected districts. That variable — that season — predicts organized crime in 1900, literacy suppression in the 1920s, political competition in the 1950s, infrastructure gaps in the 1970s, and economic underdevelopment in 2015.

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
        title: "Vacancy",
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

It's not evil in the comic book sense. It's rational. It's self-preservation running at institutional scale.`,
      },
      {
        title: "That's Why I Built You",
        text: `TRINITY
Every empire. Every collapse. Caesar crossing the Rubicon — that's not Caesar being strong. That's the Senate being absent. The Church absorbing Rome — not the Church being powerful. Rome being hollow. The Mafia isn't the story. The vacancy is the story.

(he looks at the empty crate)
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
        title: "Journal Over Black",
        text: `The Animus dissolves.

Not dramatically — the way a dream ends. The wheat fields go last. The color drains. The stone goes. The sound of wind through dry grain fades to silence.

Black.

Then: the sound of a different room. Climate-controlled air. The hum of servers. The soft release of a haptic suit depressurizing.

We hear him breathe.

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

And then the house opens.`,
      },
      {
        title: "They Don't Know What They're Asking",
        text: `Soaring ceilings. Hardwood parquet floors catching the last of the night light. Crown molding. A wood-paneled library — Bing's Den, still called that, still smelling like the man who used to live here. Multiple terraces visible through tall windows.

He walks to one of them. Opens the door. Steps out.

Northern California at 2 AM. The hills of Hillsborough. The lights of the Bay Area spread below. Cold, clear, completely still.

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
  sortKey: 2,
  synopsis:
    "Book I — PILOT / Episode 1 \"MAFIA\": Sophia runs Trinity through Sicily 1893. One drought. One vacuum. A diagnostic for reading collapse before it collapses.",
  cover: "trinity",
  blank: false,
  codex: trinityPilotCodex,
  chapters: trinityPilotChapters,
};

export const trinityPilotDraftMeta = {
  name: "PILOT",
  slug: "pilot",
  summary:
    'Book I / Episode 1 — "MAFIA". Sicily 1893 Animus lesson from Acemoglu–De Feo–De Luca (2020). Sophia leads; vacuum thesis; Estate reveal.',
} as const;
