/**
 * Trinity PILOT — 40-minute episode beat sheet
 * 8 sequences × 5 scenes (≈1 minute each)
 *
 * Visual lock for Higgsfield image prompts:
 * STYLE_SICILY / STYLE_DATA / STYLE_PRESENT + character kits below.
 *
 * Higgsfield Elements (fill after create):
 * - trinityElementId — character Element for Trinity / KSM face
 * - sophiaElementId — character Element for Sophia
 */

/** Higgsfield Element ids — embed as <<<id>>> in generate_image prompts. */
export const trinityPilotHiggsfieldIds = {
  trinityElementId: "ff3d5f00-f46d-4623-8567-dd98d68e5c77",
  sophiaElementId: "a4217074-311b-4cb5-bd89-0c3689097ee7",
  /** Preferred model for Element multi-character Sicily stills */
  imageModel: "nano_banana_pro",
  /** Completed Seq 1 stills (s1e1…s1e5), nano_banana_pro · 16:9 · 2026-07-19 */
  seq1Stills: [
    {
      id: "s1e1",
      title: "Wrong Wind",
      jobId: "a2b2b4f7-2687-44c5-9959-65ec0f697713",
      url: "https://d8j0ntlcm91z4.cloudfront.net/user_3BIVMnF599YIGIKEIfI50AerLZR/hf_20260719_002231_a2b2b4f7-2687-44c5-9959-65ec0f697713.png",
    },
    {
      id: "s1e2",
      title: "Prognosis",
      jobId: "4f1510cf-e985-4227-831a-a7a749c788f2",
      url: "https://d8j0ntlcm91z4.cloudfront.net/user_3BIVMnF599YIGIKEIfI50AerLZR/hf_20260719_002230_4f1510cf-e985-4227-831a-a7a749c788f2.png",
    },
    {
      id: "s1e3",
      title: "Fixed Rent",
      jobId: "ddf50696-1da1-464e-8350-bd92f5db0be1",
      url: "https://d8j0ntlcm91z4.cloudfront.net/user_3BIVMnF599YIGIKEIfI50AerLZR/hf_20260719_002232_ddf50696-1da1-464e-8350-bd92f5db0be1.png",
    },
    {
      id: "s1e4",
      title: "The Olive",
      jobId: "302e4779-d61d-497b-8ce0-ef9bf8f4c7b1",
      url: "https://d8j0ntlcm91z4.cloudfront.net/user_3BIVMnF599YIGIKEIfI50AerLZR/hf_20260719_002230_302e4779-d61d-497b-8ce0-ef9bf8f4c7b1.png",
    },
    {
      id: "s1e5",
      title: "Title Card",
      jobId: "c9b16356-4129-4637-8129-a05e6f01f4ca",
      url: "https://d8j0ntlcm91z4.cloudfront.net/user_3BIVMnF599YIGIKEIfI50AerLZR/hf_20260719_002231_c9b16356-4129-4637-8129-a05e6f01f4ca.png",
    },
  ],
  /** Job ids only, order s1e1…s1e5 */
  seq1JobIds: [
    "a2b2b4f7-2687-44c5-9959-65ec0f697713",
    "4f1510cf-e985-4227-831a-a7a749c788f2",
    "ddf50696-1da1-464e-8350-bd92f5db0be1",
    "302e4779-d61d-497b-8ce0-ef9bf8f4c7b1",
    "c9b16356-4129-4637-8129-a05e6f01f4ca",
  ],
};

const T = () => `<<<${trinityPilotHiggsfieldIds.trinityElementId}>>>`;
const S = () => `<<<${trinityPilotHiggsfieldIds.sophiaElementId}>>>`;

export const STYLE_GHIBLI =
  "fully colored semi-Studio Ghibli anime still, clean linework, painterly backgrounds, saturated natural light, expressive grounded faces, high production feature-anime finish, NOT sepia, NOT monochrome";

export const STYLE_SICILY =
  `${STYLE_GHIBLI}, 16:9 landscape, Carlentini Sicily spring 1893 drought, bone-white dead wheat under hard March Mediterranean light, bleached limestone, silver-still olive leaves, sparse pasture, terraced fields dropping toward distant sea, flat-roofed white agro-town on the ridge, beauty that is wrong, no text, no logos, no modern objects`;

export const STYLE_DATA =
  `${STYLE_GHIBLI}, 16:9, frozen 1893 Sicilian piazza under translucent data overlays, rainfall and choropleth maps glowing faintly, scientific museum lighting, no readable text labels, no logos`;

export const STYLE_PRESENT =
  `${STYLE_GHIBLI}, 16:9, contemporary Northern California night, French Renaissance Revival estate interior and terrace, cool server-room blues meeting warm wood, quiet billionaire solitude, no text, no logos`;

/** Carlentini field bible — land, light, costume (Weak States + period sources). */
export const CARLENTINI_FIELD_BIBLE = `
PLACE: Carlentini, eastern Sicily — agro-town on a ridge; peasants clustered for latifondo cereal work; terraced wheat/olive/citrus toward the sea.
MOMENT: March–spring 1893 after bad 1892; wheat ~half yield; olives fall dried; pasture rare; day laborers unemployed.
QUOTE (Il Giornale di Sicilia, Oct 1893): olives fall dried and drenched; lemon and orange suffering; misery immense.
CONTRACTS: fixed one-year rent; day hire vanishes when estate needs no hands.
LIGHT: hard clear Mediterranean March sun on August-colored crops — wrongness is the point.
COSTUME DO: workwear (linen, dark wool, apron, shawl, optional coppola/fazzoletto).
COSTUME DON'T: embroidered festa, Saturno/cassock, mid-century fedoras, modern props.
`.trim();

export const TRINITY_APPEARANCE_LOCK = `
TRINITY (Animus): KSM / photo likeness — oval face, dark heavy-lidded eyes, thick straight brows, soft jaw, near-black messy fringe; CLEAN-SHAVEN; 1893 bracciante kit — off-white linen shirt, optional dark waistcoat, loose dark trousers, worn boots, optional soft dark coppola; student energy.
`.trim();

export const SOPHIA_APPEARANCE_LOCK = `
SOPHIA (Animus): long blonde hair UP (center part, braid/chignon at nape), large pale eyes, red lips, black under-eye streak language, slightly otherworldly; 1890s Sicilian peasant WORK dress — dark wool/cotton, modest high neck, long sleeves, ankle length, apron and/or dark shawl, optional fazzoletto; speaks first; guide.
`.trim();

export type PilotSceneBeat = {
  id: string;
  sequence: number;
  scene: number;
  /** Episode clock, e.g. "0:00–1:00" */
  time: string;
  title: string;
  /** One-line what happens */
  summary: string;
  /** Higgsfield generate_image prompt */
  higgsfieldPrompt: string;
};

export type PilotSequenceBeats = {
  sequence: number;
  title: string;
  /** Episode clock for the whole sequence */
  time: string;
  function: string;
  scenes: PilotSceneBeat[];
};

export const trinityPilotStoryboard: PilotSequenceBeats[] = [
  {
    sequence: 1,
    title: "Carlentini",
    time: "0:00–5:00",
    function: "Cold open — drought as diagnosis; Sophia leads; title card at end",
    scenes: [
      {
        id: "s1e1",
        sequence: 1,
        scene: 1,
        time: "0:00–1:00",
        title: "Wrong Wind",
        summary:
          "Black → wind through dry wheat → bone-white March hillside builds like a memory. No title yet.",
        higgsfieldPrompt: `${STYLE_SICILY}. Extreme wide establishing shot of Carlentini terraced hillside in severe 1893 drought, March light but August-dead wheat the color of bone, olive trees with still silver leaves, flat-roofed white agro-town on the ridge, empty dusty path, ominous quiet beauty, NO people`,
      },
      {
        id: "s1e2",
        sequence: 1,
        scene: 2,
        time: "1:00–2:00",
        title: "Prognosis",
        summary:
          "Sophia at the field edge in dark wool; Trinity arrives as day laborer. She speaks first.",
        higgsfieldPrompt: `${STYLE_SICILY}. Medium-wide: ${S()} as Sophia in dark 1890s Sicilian peasant work dress, blonde hair pinned UP in a chignon, stands at the edge of dying wheat looking at crops like a doctor; ${T()} as Trinity clean-shaven young man in off-white linen day-laborer shirt and dark trousers approaches up a dusty path; both face the field, not each other; she leads`,
      },
      {
        id: "s1e3",
        sequence: 1,
        scene: 3,
        time: "2:00–3:00",
        title: "Fixed Rent",
        summary:
          "Sophia explains temporary-that-wasn't and one-year fixed rent: pay even if you starve.",
        higgsfieldPrompt: `${STYLE_SICILY}. Low camera between dry papery wheat rows filling both sides of frame; ${S()} Sophia in dark work dress hair UP walks ahead gesturing at the crop; ${T()} Trinity clean-shaven in linen laborer clothes follows listening, looking at wheat not at her; intimate teaching walk`,
      },
      {
        id: "s1e4",
        sequence: 1,
        scene: 4,
        time: "3:00–4:00",
        title: "The Olive",
        summary:
          "Day laborers have it worse. She lifts a shriveled olive; quotes the October newspaper after seven silent months.",
        higgsfieldPrompt: `${STYLE_SICILY}. Close-up: ${S()} Sophia's hand holding a single dried shriveled olive still on its stem above dusty ground between wheat stalks; her dark wool sleeve and apron edge visible; soft shallow depth of field; evidence more than fruit; face softly out of focus in background optional`,
      },
      {
        id: "s1e5",
        sequence: 1,
        scene: 5,
        time: "4:00–5:00",
        title: "Title Card",
        summary:
          "Hold on the olive → smash to white serif on black: TRINITY: AN AMERICAN ODYSSEY / Episode One — MAFIA.",
        higgsfieldPrompt: `Minimal prestige title card, 16:9, pure black background, elegant white serif typography centered: TRINITY: AN AMERICAN ODYSSEY above a thin line and Episode One — MAFIA, spare cinematic anime opening energy, no ornaments, no logos other than the title text, no characters`,
      },
    ],
  },
  {
    sequence: 2,
    title: "The Agro-Town",
    time: "5:00–10:00",
    function: "Piazza as pressure cooker — Fasci demands; Rome won't come",
    scenes: [
      {
        id: "s2e1",
        sequence: 2,
        scene: 1,
        time: "5:00–6:00",
        title: "Stone That Forgot Rain",
        summary:
          "Walk from field into whitewashed streets; agro-town smells of drought stone.",
        higgsfieldPrompt: `${STYLE_SICILY}. Tracking view down a narrow Sicilian village street, whitewashed walls, terracotta accents, dust in the air, two period figures walking ahead toward a bright opening; no market stalls, midday emptiness before the square`,
      },
      {
        id: "s2e2",
        sequence: 2,
        scene: 2,
        time: "6:00–7:00",
        title: "Meeting Crowd",
        summary:
          "Piazza full — not market, meeting. Everyone home because there is no work.",
        higgsfieldPrompt: `${STYLE_SICILY}. Wide shot of a Sicilian agro-town piazza packed with a meeting crowd of peasants and townspeople, men in clusters talking low, women watching from doorways, children between legs, tense midday assembly not a festival`,
      },
      {
        id: "s2e3",
        sequence: 2,
        scene: 3,
        time: "7:00–8:00",
        title: "Same Room",
        summary:
          "Sophia: landowners concentrated labor for efficiency — they put them all in the same room.",
        higgsfieldPrompt: `${STYLE_SICILY}. Over-shoulder of Sophia and Trinity at the edge of a crowded piazza, her speaking quietly, him scanning the mass of people; architecture designed to concentrate bodies; social pressure visible in composition`,
      },
      {
        id: "s2e4",
        sequence: 2,
        scene: 4,
        time: "8:00–9:00",
        title: "The Crate",
        summary:
          "Man on a crate reads demands: wages, sharecropping, land, lower staple taxes. Not a long list.",
        higgsfieldPrompt: `${STYLE_SICILY}. Center of piazza: a serious Sicilian man stands on a wooden crate reading from a paper to a listening crowd; careful stillness not theatrical; faces upturned; historical peasant organizing moment`,
      },
      {
        id: "s2e5",
        sequence: 2,
        scene: 5,
        time: "9:00–10:00",
        title: "Because It Didn't Rain",
        summary:
          "177 orgs / 161 towns; half the Socialist Party Sicilian that year. He'll be arrested in January.",
        higgsfieldPrompt: `${STYLE_SICILY}. Close two-shot: Sophia looking at Trinity while the crate speaker blurs behind them; her face carrying the weight of a statistic; his eyes still on the crowd; quiet dread after a political fact lands`,
      },
    ],
  },
  {
    sequence: 3,
    title: "The Contract",
    time: "10:00–15:00",
    function: "Landowners fill the vacuum — instrument handed bigger tasks",
    scenes: [
      {
        id: "s3e1",
        sequence: 3,
        scene: 1,
        time: "10:00–11:00",
        title: "Another Climate",
        summary:
          "Cut to estate house: cool, dark, maps, ledgers — money that needn't smell the harvest.",
        higgsfieldPrompt: `${STYLE_SICILY}. Interior wide of a wealthy 1890s Sicilian estate office: high ceilings, cool shadow, wall maps of land holdings, heavy wooden table with open account ledgers, no peasants, smell of power not dust`,
      },
      {
        id: "s3e2",
        sequence: 3,
        scene: 2,
        time: "11:00–12:00",
        title: "Tax Structure",
        summary:
          "Sophia: staple taxes 2× national average; land taxes ⅓. Councils set rates; these men control councils.",
        higgsfieldPrompt: `${STYLE_SICILY}. Sophia and Trinity as quiet observers at the edge of the estate office while three rural bourgeois men sit at a ledger table; she leans toward him whispering; tax maps and papers on the wall behind`,
      },
      {
        id: "s3e3",
        sequence: 3,
        scene: 3,
        time: "12:00–13:00",
        title: "He Knows Someone",
        summary:
          "Man at table: government won't help, strikes spreading, Fasci now Socialist — he knows someone.",
        higgsfieldPrompt: `${STYLE_SICILY}. Tight close-up on a frightened middle-aged Sicilian estate manager's face mid-speech at a dark table, calculation without theater, candle or shuttered daylight, moral hinge moment`,
      },
      {
        id: "s3e4",
        sequence: 3,
        scene: 4,
        time: "13:00–14:00",
        title: "The Nod",
        summary:
          "Head of table nods once. Conversation ends. They didn't want to — they told themselves that.",
        higgsfieldPrompt: `${STYLE_SICILY}. Three men at the end of a meeting: the man at the head of the table gives a single small nod; the other two begin to stand; empty chairs energy; dread in stillness`,
      },
      {
        id: "s3e5",
        sequence: 3,
        scene: 5,
        time: "14:00–15:00",
        title: "Instrument (1875)",
        summary:
          "Sophia quotes Tajani: Mafia dangerous as instrument of local government. Empty ledger left open.",
        higgsfieldPrompt: `${STYLE_SICILY}. Empty estate table after the men left, one open ledger in a shaft of light, Sophia facing Trinity in the foreground speaking a hard truth; no one else in the room; numbers that will balance on someone else's suffering`,
      },
    ],
  },
  {
    sequence: 4,
    title: "The Bell Tower",
    time: "15:00–20:00",
    function: "Coordinated killings; first simulation fracture",
    scenes: [
      {
        id: "s4e1",
        sequence: 4,
        scene: 1,
        time: "15:00–16:00",
        title: "Momentum",
        summary:
          "Giardinello square — rally at full voice; grievance becoming momentum.",
        higgsfieldPrompt: `${STYLE_SICILY}. Wide of Giardinello central square packed with a loud peasant rally, hundreds of people, church and civic buildings ringing the piazza, energy of a crowd that believes it is winning`,
      },
      {
        id: "s4e2",
        sequence: 4,
        scene: 2,
        time: "16:00–17:00",
        title: "Where Are They?",
        summary:
          "Trinity looks up — walls, windows, church, bell tower. First hunter instinct.",
        higgsfieldPrompt: `${STYLE_SICILY}. Low angle from the piazza crowd looking up at a Sicilian church bell tower and surrounding windows; Trinity in day-laborer clothes in foreground looking upward; Sophia following his gaze; architecture as threat`,
      },
      {
        id: "s4e3",
        sequence: 4,
        scene: 3,
        time: "17:00–18:00",
        title: "Three Towns",
        summary:
          "Giardinello, Lercara (Christmas 1893), Gibellina (Jan 2 1894) — same elevated setup. Coordination.",
        higgsfieldPrompt: `${STYLE_SICILY}. Split-panel cinematic still suggesting three Sicilian town squares each dominated by a bell tower above a crowd, same geometry repeated, ominous pattern recognition, muted drought palette`,
      },
      {
        id: "s4e4",
        sequence: 4,
        scene: 4,
        time: "18:00–19:00",
        title: "The Seam",
        summary:
          "Climb the tower exterior; hold on the opening; stone texture stutters — render artifact. Neither names it.",
        higgsfieldPrompt: `${STYLE_SICILY}. Slow upward view of a stone bell tower exterior reaching a dark opening at the top; for one uncanny frame the stone texture glitches with a digital seam / render artifact barely perceptible; crowd tiny below; simulation fracture`,
      },
      {
        id: "s4e5",
        sequence: 4,
        scene: 5,
        time: "19:00–20:00",
        title: "Joint Action",
        summary:
          "Fasci outlawed early 1894. Santino: bloodily repressed by Institutions and Mafia together.",
        higgsfieldPrompt: `${STYLE_SICILY}. Aftermath mood in an emptying Sicilian piazza at dusk, abandoned wooden crate in the center, soldiers' silhouettes at the edge of frame, Sophia and Trinity small at the periphery; repression after the rally`,
      },
    ],
  },
  {
    sequence: 5,
    title: "The Data",
    time: "20:00–25:00",
    function: "122 years, one shape — the paper becomes visible",
    scenes: [
      {
        id: "s5e1",
        sequence: 5,
        scene: 1,
        time: "20:00–21:00",
        title: "Freeze",
        summary:
          "Piazza desaturates and freezes; sky goes museum grey. History becomes specimen.",
        higgsfieldPrompt: `${STYLE_DATA}. Sicilian piazza crowd frozen mid-motion like a paused film, desaturated color, neutral grey sky, uncanny stillness before overlays appear`,
      },
      {
        id: "s5e2",
        sequence: 5,
        scene: 2,
        time: "21:00–22:00",
        title: "Rainfall → Mafia",
        summary:
          "Rainfall map 1893 then Mafia density 1900. Shapes align. Almost perfectly.",
        higgsfieldPrompt: `${STYLE_DATA}. Frozen Sicilian landscape with two translucent choropleth map layers aligning over municipalities — darker drought rainfall and denser organized-crime presence — abstract scientific beauty, no readable text`,
      },
      {
        id: "s5e3",
        sequence: 5,
        scene: 3,
        time: "22:00–23:00",
        title: "Marquise & Cutrera",
        summary:
          "Rainfall from ministries, companies, and a Marquise's diary; Cutrera's 1900 judgment map.",
        higgsfieldPrompt: `${STYLE_DATA}. Sophia walking through a frozen crowd like a museum guide; ghostly overlays of old rainfall notebooks and a hand-drawn 1900 police density map floating as translucent layers; Trinity almost smiling at the absurdity of evidence`,
      },
      {
        id: "s5e4",
        sequence: 5,
        scene: 4,
        time: "23:00–24:00",
        title: "Five Maps",
        summary:
          "Literacy 1920s → public goods 1970s → GDP 2015. Same shape. One spring.",
        higgsfieldPrompt: `${STYLE_DATA}. Five translucent map layers stacked over a frozen Sicilian island silhouette, each layer a different era but the same dark municipal shape persisting; Trinity walking through light without touching anything`,
      },
      {
        id: "s5e5",
        sequence: 5,
        scene: 5,
        time: "24:00–25:00",
        title: "Still Attached",
        summary:
          "43 municipalities under external administration 2001–2014. Not 1901. 2001.",
        higgsfieldPrompt: `${STYLE_DATA}. Close on Trinity amid frozen 1893 faces with modern-feeling data light on his features; Sophia facing him; the past and a long statistical shadow in one frame; thread still attached`,
      },
    ],
  },
  {
    sequence: 6,
    title: "The Vacuum Thesis",
    time: "25:00–30:00",
    function: "Thesis lands — vacancy is the story; why he built her",
    scenes: [
      {
        id: "s6e1",
        sequence: 6,
        scene: 1,
        time: "25:00–26:00",
        title: "Color Returns",
        summary:
          "Data fades; piazza restores. Crowd gone. Crate abandoned. Beside-him seating.",
        higgsfieldPrompt: `${STYLE_SICILY}. Mid-afternoon Sicilian piazza after a rally has dispersed, abandoned wooden crate in the center, Trinity and Sophia sitting on church steps side by side, not teacher-student distance anymore`,
      },
      {
        id: "s6e2",
        sequence: 6,
        scene: 2,
        time: "26:00–27:00",
        title: "Ambivalent = Absent",
        summary:
          "Mafia didn't beat the state; state was ambivalent. Giolitti's non-action is the vacancy.",
        higgsfieldPrompt: `${STYLE_SICILY}. Two-shot on church steps: Trinity speaking the vacuum idea, Sophia listening with precision; empty square behind them; intellectual thriller energy inside historical dress`,
      },
      {
        id: "s6e3",
        sequence: 6,
        scene: 3,
        time: "27:00–28:00",
        title: "Self-Preservation at Scale",
        summary:
          "Once filled, vacancy stays filled: suppress competition, underfund schools, keep literacy low.",
        higgsfieldPrompt: `${STYLE_SICILY}. Sophia explaining calmly, hands still, Trinity staring at the empty crate as if it were a diagram; bright hard light; thesis scene without melodrama`,
      },
      {
        id: "s6e4",
        sequence: 6,
        scene: 4,
        time: "28:00–29:00",
        title: "The Drought Is Quiet",
        summary:
          "Caesar / Church / hollow centers. Drought looks like nothing — then something else runs the town.",
        higgsfieldPrompt: `${STYLE_SICILY}. A child running alone across an empty sunlit piazza, indifferent to history; Trinity and Sophia watching from the steps in soft background; quiet hinge of the episode's metaphor`,
      },
      {
        id: "s6e5",
        sequence: 6,
        scene: 5,
        time: "29:00–30:00",
        title: "Why I Built You",
        summary:
          "We're in one. Most people lack the data. That's why I built you. Pull me out.",
        higgsfieldPrompt: `${STYLE_SICILY}. Trinity standing, looking directly at Sophia for the first time this episode; her face almost vulnerable; church steps and empty square; the line before extraction`,
      },
    ],
  },
  {
    sequence: 7,
    title: "Coming Out",
    time: "30:00–35:00",
    function: "Layer 2 journal — hear him before we see him",
    scenes: [
      {
        id: "s7e1",
        sequence: 7,
        scene: 1,
        time: "30:00–31:00",
        title: "Dissolve",
        summary:
          "Animus ends like a dream. Wheat last. Color, stone, wind → silence → black.",
        higgsfieldPrompt: `${STYLE_SICILY}. Surreal dissolve: Sicilian wheat field becoming transparent particles fading into pure black void, dream ending not explosion, last silver olive leaf catching light before vanishing`,
      },
      {
        id: "s7e2",
        sequence: 7,
        scene: 2,
        time: "31:00–32:00",
        title: "Server Hum",
        summary:
          "Climate air, servers, haptic suit depressurizing. Breath in darkness.",
        higgsfieldPrompt: `${STYLE_PRESENT}. Near-black interior of a high-tech immersion chamber, only LEDs and server rack status lights, silhouette of a haptic suit releasing pressure, cinematic audio implied by stillness, face not yet visible`,
      },
      {
        id: "s7e3",
        sequence: 7,
        scene: 3,
        time: "32:00–33:00",
        title: "Diagnostic",
        summary:
          "VO: Mafia paper isn't history — it's a diagnostic for reading collapse early.",
        higgsfieldPrompt: `${STYLE_PRESENT}. Abstract black frame with a single faint reflection of a young man's eyes in dark glass, journal-voice energy, face mostly withheld, prestige TV cold open language`,
      },
      {
        id: "s7e4",
        sequence: 7,
        scene: 4,
        time: "33:00–34:00",
        title: "What Is the Drought?",
        summary:
          "VO question: what looks like an ordinary bad season and is actually the hinge?",
        higgsfieldPrompt: `${STYLE_PRESENT}. Dark study desk edge, half-finished glass, dark monitors, papers, no face — objects that imply a mind still mid-thesis after extraction`,
      },
      {
        id: "s7e5",
        sequence: 7,
        scene: 5,
        time: "34:00–35:00",
        title: "Methodology",
        summary:
          "No answer yet. Methodology is enough for tonight. Footsteps on hardwood.",
        higgsfieldPrompt: `${STYLE_PRESENT}. Dim corridor of a grand estate, hardwood floor catching a thin night light, anonymous footsteps implied by empty frame composition, transition toward reveal`,
      },
    ],
  },
  {
    sequence: 8,
    title: "The Estate",
    time: "35:00–40:00",
    function: "Don Draper reveal — headset off; nobody knows",
    scenes: [
      {
        id: "s8e1",
        sequence: 8,
        scene: 1,
        time: "35:00–36:00",
        title: "Headset Off",
        summary:
          "Hand lifts headset. Trinity as himself: black hair, dark eyes, all black. Animus chamber reveal.",
        higgsfieldPrompt: `${STYLE_PRESENT}. Young man ~26 removing a sleek VR/haptic headset in a cathedral-tall converted stable chamber, black clothes, black hair, dark eyes, tech embedded invisibly in old architecture, first true face reveal`,
      },
      {
        id: "s8e2",
        sequence: 8,
        scene: 2,
        time: "36:00–37:00",
        title: "The Lair",
        summary:
          "Checks his hand (same as glitch gesture). Through hidden door: books, three dark monitors, half-finished glass.",
        higgsfieldPrompt: `${STYLE_PRESENT}. Private study "Lair": floor-to-ceiling books, desk with three dark monitors, half-finished glass, papers; young man in black walking through without stopping; secret room energy`,
      },
      {
        id: "s8e3",
        sequence: 8,
        scene: 3,
        time: "37:00–38:00",
        title: "Bing's Den",
        summary:
          "House opens — parquet, crown molding, wood-paneled library still smelling like the prior owner.",
        higgsfieldPrompt: `${STYLE_PRESENT}. Grand French Renaissance Revival interior: soaring ceilings, hardwood parquet, crown molding, wood-paneled library lit by night windows, young man in black walking toward a terrace door`,
      },
      {
        id: "s8e4",
        sequence: 8,
        scene: 4,
        time: "38:00–39:00",
        title: "Hillsborough 2 AM",
        summary:
          "Terrace: Bay lights. Phone buzzes (AI regulation). Sophia on speakers. He won't answer.",
        higgsfieldPrompt: `${STYLE_PRESENT}. Young man alone on a Hillsborough estate terrace at 2 AM overlooking Bay Area lights, phone face-down on railing, cold clear night, solitary silhouette, Sophia's presence implied by architecture not a body`,
      },
      {
        id: "s8e5",
        sequence: 8,
        scene: 5,
        time: "39:00–40:00",
        title: "Nobody Knows",
        summary:
          "Rise through the chateau — 5.36 acres, Animus in old stable. Smash to Tajani quote. End card.",
        higgsfieldPrompt: `${STYLE_PRESENT}. Aerial night view of a French Renaissance Revival chateau on 5 acres in Hillsborough hills, riding track visible in grounds, old stable wing lit faintly where a secret Animus lives, from the street it looks like idle old money; lonely terrace figure tiny`,
      },
    ],
  },
];

/** Flattened 40 beats for tooling / tables. */
export const trinityPilotScenes: PilotSceneBeat[] = trinityPilotStoryboard.flatMap(
  (seq) => seq.scenes,
);

/** Markdown tables + prompts for Snippets / docs. */
export function formatPilotStoryboardMarkdown(): string {
  const lines: string[] = [
    "TRINITY PILOT — 40-minute beat sheet",
    "8 sequences × 5 scenes (≈1 min each)",
    "",
    "Higgsfield: use generate_image, model per recommend; aspect_ratio 16:9.",
    "Style locks: STYLE_SICILY (seq 1–4, 6), STYLE_DATA (seq 5), STYLE_PRESENT (seq 7–8).",
    "",
  ];

  for (const seq of trinityPilotStoryboard) {
    lines.push(`## Sequence ${seq.sequence} — ${seq.title} (${seq.time})`);
    lines.push(`Function: ${seq.function}`);
    lines.push("");
    lines.push("| # | Time | Scene | Summary |");
    lines.push("|---|------|-------|---------|");
    for (const sc of seq.scenes) {
      lines.push(
        `| ${sc.scene} | ${sc.time} | ${sc.title} | ${sc.summary.replace(/\|/g, "/")} |`,
      );
    }
    lines.push("");
    lines.push("### Higgsfield prompts");
    lines.push("");
    for (const sc of seq.scenes) {
      lines.push(`**${sc.scene}. ${sc.title}** (\`${sc.id}\`)`);
      lines.push("");
      lines.push(sc.higgsfieldPrompt);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/** One snippet per sequence for Twilda Snippets panel. */
export function trinityPilotStoryboardSnippets(): { title: string; content: string }[] {
  return [
    {
      title: "Bible — Carlentini field",
      content: CARLENTINI_FIELD_BIBLE,
    },
    {
      title: "Bible — Trinity appearance",
      content: TRINITY_APPEARANCE_LOCK,
    },
    {
      title: "Bible — Sophia appearance",
      content: SOPHIA_APPEARANCE_LOCK,
    },
    {
      title: "Bible — Visual style",
      content: `${STYLE_GHIBLI}

Sicily palette: bone-white drought wheat, bleached limestone, silver olives, hard March light.
Stanford/clergy Ghibli refs = STYLE ONLY — not Sicily costume.`,
    },
    {
      title: "Storyboard — 40-min overview",
      content: `40-minute pilot · 8 sequences · 5 scenes each (≈1 minute / scene).

| Seq | Title | Time | Function |
|-----|-------|------|----------|
${trinityPilotStoryboard
  .map(
    (s) =>
      `| ${s.sequence} | ${s.title} | ${s.time} | ${s.function} |`,
  )
  .join("\n")}

Seq 1 stills generated (see trinityPilotHiggsfieldIds.seq1Stills). Next: s2e1…s8e5, then lock board panels.`,
    },
    {
      title: "Higgsfield — Seq 1 stills",
      content: [
        `Model: ${trinityPilotHiggsfieldIds.imageModel} · 16:9 · Elements Trinity/Sophia`,
        "",
        ...trinityPilotHiggsfieldIds.seq1Stills.map(
          (s) => `${s.id} ${s.title}\njob: ${s.jobId}\n${s.url}`,
        ),
      ].join("\n\n"),
    },
    ...trinityPilotStoryboard.map((seq) => ({
      title: `Storyboard — Seq ${seq.sequence} ${seq.title}`,
      content: [
        `${seq.title} · ${seq.time}`,
        seq.function,
        "",
        "| # | Time | Scene | Summary |",
        "|---|------|-------|---------|",
        ...seq.scenes.map(
          (sc) =>
            `| ${sc.scene} | ${sc.time} | ${sc.title} | ${sc.summary} |`,
        ),
        "",
        "Higgsfield prompts:",
        ...seq.scenes.flatMap((sc) => [
          "",
          `${sc.scene}. ${sc.title} [${sc.id}]`,
          sc.higgsfieldPrompt,
        ]),
      ].join("\n"),
    })),
  ];
}
