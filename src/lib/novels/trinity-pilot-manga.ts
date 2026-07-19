/**
 * Trinity PILOT — Manga Studio page seeds
 * 1 scene = 1 page = 6 panels (grid_2x3)
 * Seq 1 fully scripted; Seq 2–8 shells for later expansion.
 */

import {
  STYLE_DATA,
  STYLE_GHIBLI,
  STYLE_PRESENT,
  STYLE_SICILY,
  trinityPilotHiggsfieldIds,
  trinityPilotScenes,
  type PilotSceneBeat,
} from "@/lib/novels/trinity-pilot-storyboard";

const T = () => `<<<${trinityPilotHiggsfieldIds.trinityElementId}>>>`;
const S = () => `<<<${trinityPilotHiggsfieldIds.sophiaElementId}>>>`;

export type MangaResearchLink = { label: string; url?: string };

export type MangaPanelSeed = {
  slot: 1 | 2 | 3 | 4 | 5 | 6;
  caption: string;
  dialogue: string;
  sfx: string;
  notes: string;
  prompt: string;
  negative_notes?: string;
  research_links?: MangaResearchLink[];
  higgsfield_job_id?: string;
  source_url?: string;
};

export type MangaPageSeed = {
  scene_key: string;
  sequence: number;
  page_number: number;
  title: string;
  summary: string;
  script_notes: string;
  panels: MangaPanelSeed[];
};

export const mangaDefaultModel = "nano_banana_2";

/** Prefix STYLE_GHIBLI when the base prompt lacks the Ghibli lock. */
export function buildMangaPanelPrompt(base: string): string {
  if (base.includes("Studio Ghibli") || base.includes("fully colored semi-Studio")) {
    return base;
  }
  return `${STYLE_GHIBLI}. ${base}`;
}

const PERIOD =
  "period lock: Trinity CLEAN-SHAVEN, Sophia blonde hair UP (chignon), dark 1890s work dress, no modern props";

function panel(
  slot: 1 | 2 | 3 | 4 | 5 | 6,
  partial: Omit<MangaPanelSeed, "slot">,
): MangaPanelSeed {
  return { slot, ...partial };
}

function emptyScript(): Pick<MangaPanelSeed, "dialogue" | "sfx" | "notes"> {
  return { dialogue: "", sfx: "", notes: "" };
}

/** Sequence 1 — fully scripted 6-panel pages */
const seq1Pages: MangaPageSeed[] = [
  {
    scene_key: "s1e1",
    sequence: 1,
    page_number: 1,
    title: "Wrong Wind",
    summary:
      "Black → wind through dry wheat → bone-white March hillside builds like a memory. No title yet.",
    script_notes:
      "NO people. Landscape Ghibli only. Cold open — establish drought wrongness before faces. Silence except wind.",
    panels: [
      panel(1, {
        ...emptyScript(),
        caption: "Black",
        sfx: "",
        notes: "Full black / near-black; breath before image",
        prompt: `${STYLE_GHIBLI}. vertical manga panel 3:4, pure black void with faintest grain, no figures, no text, cinematic anime cold-open black, silence before Sicily`,
        negative_notes: "no people, no text, no logos",
      }),
      panel(2, {
        ...emptyScript(),
        caption: "Wind",
        sfx: "WHSHHH",
        notes: "Sound of dry stalks before we see the land",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, extreme close on bone-white dead wheat stalks bending in a wrong March wind, silver motion lines, no people, drought texture filling frame`,
        negative_notes: "no people, no faces",
        research_links: [
          {
            label: "Carlentini — eastern Sicily agro-town / latifondo cereal belt",
          },
        ],
      }),
      panel(3, {
        ...emptyScript(),
        caption: "Wide field",
        notes: "Establish the hillside as diagnosis, not postcard",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, wide establishing of Carlentini terraced hillside in severe 1893 drought, March light on August-dead bone-white wheat, empty dusty path, beauty that is wrong, NO people`,
        negative_notes: "no people, no modern objects",
      }),
      panel(4, {
        ...emptyScript(),
        caption: "Olives",
        notes: "Silver-still leaves; olives already failing",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, medium shot of silver-still olive trees on bleached limestone terrace, dried olives hinting on branches, hard Mediterranean light, NO people`,
        negative_notes: "no people",
        research_links: [
          {
            label: "Il Giornale di Sicilia (Oct 1893) — olives fall dried; misery immense",
          },
        ],
      }),
      panel(5, {
        ...emptyScript(),
        caption: "Ridge town",
        notes: "Flat-roofed white agro-town on the ridge",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, distant flat-roofed white Sicilian agro-town on a ridge above terraced drought fields, sparse pasture, sea far below, ominous quiet beauty, NO people in frame`,
        negative_notes: "no people, no cars",
      }),
      panel(6, {
        ...emptyScript(),
        caption: "Empty path",
        notes: "Path waits for someone — page turn into Prognosis",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, empty dusty path between bone-white wheat rows leading toward ridge, footsteps not yet present, landscape Ghibli finish, NO people`,
        negative_notes: "no people, no footprints close",
      }),
    ],
  },
  {
    scene_key: "s1e2",
    sequence: 1,
    page_number: 2,
    title: "Prognosis",
    summary:
      "Sophia at the field edge in dark wool; Trinity arrives as day laborer. She speaks first.",
    script_notes:
      "She leads. Both face the field, not each other, until eyes/boots beats. Elements: Sophia + Trinity.",
    panels: [
      panel(1, {
        caption: "Sophia at the edge",
        dialogue: "",
        sfx: "",
        notes: "Doctor posture toward the crop",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, ${S()} as Sophia, blonde hair UP in chignon, dark 1890s Sicilian peasant work dress and apron, stands at dying wheat edge looking at crops like a doctor, three-quarter portrait, ${PERIOD}`,
        negative_notes: "no loose long hair, no festa dress, no modern clothes",
      }),
      panel(2, {
        caption: "Crop close",
        dialogue: "",
        sfx: "",
        notes: "Evidence before conversation",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, extreme close papery bone-white wheat heads and cracked soil, shallow DOF, drought as prognosis, no faces, Ghibli texture`,
        negative_notes: "no people",
      }),
      panel(3, {
        caption: "Trinity approaches",
        dialogue: "",
        sfx: "dust…",
        notes: "Day laborer arrival; clean-shaven",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, ${T()} as Trinity clean-shaven young man in off-white linen day-laborer shirt and dark trousers, worn boots, walking up dusty path toward field, soft student energy, ${PERIOD}`,
        negative_notes: "no beard, no stubble, no fedora, no modern shoes",
      }),
      panel(4, {
        caption: "Both face the field",
        dialogue: "",
        sfx: "",
        notes: "Side by side; she leads without looking at him yet",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, ${S()} Sophia hair UP work dress + ${T()} Trinity clean-shaven linen laborer at field edge, both face drought wheat not each other, she ahead, ${PERIOD}`,
        negative_notes: "no eye contact between them, no romance pose",
      }),
      panel(5, {
        caption: "Her eyes",
        dialogue: "It's already decided.",
        sfx: "",
        notes: "She speaks first",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, close-up ${S()} Sophia large pale eyes and red lips, black under-eye streak language, blonde hair UP, dark wool collar, looking past camera at the field, ${PERIOD}`,
        negative_notes: "no loose hair, no smile",
      }),
      panel(6, {
        caption: "His boots / dust",
        dialogue: "",
        sfx: "",
        notes: "Grounded arrival; listening body",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, low angle close on ${T()} Trinity's worn leather boots and dust on dry path, dark trousers hem, bone-white wheat blur behind, clean-shaven laborer kit implied, ${PERIOD}`,
        negative_notes: "no modern sneakers, no face required",
      }),
    ],
  },
  {
    scene_key: "s1e3",
    sequence: 1,
    page_number: 3,
    title: "Fixed Rent",
    summary:
      "Sophia explains temporary-that-wasn't and one-year fixed rent: pay even if you starve.",
    script_notes:
      "Teaching walk through rows. Fixed-rent beat is the thesis seed for the episode.",
    panels: [
      panel(1, {
        caption: "Walk the rows",
        dialogue: "",
        sfx: "",
        notes: "Low camera between wheat",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, low camera between dry papery wheat rows, ${S()} Sophia hair UP dark work dress walks ahead, ${T()} Trinity clean-shaven follows in linen, intimate teaching walk, ${PERIOD}`,
        negative_notes: "no festa clothes",
      }),
      panel(2, {
        caption: "She gestures",
        dialogue: "Temporary contracts that never ended.",
        sfx: "",
        notes: "Gesture at crop / land",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, ${S()} Sophia three-quarter, hair UP, dark work dress, hand gesturing at dying wheat, teaching not pleading, ${PERIOD}`,
        negative_notes: "no loose hair",
        research_links: [
          {
            label: "Fixed one-year rent — pay even if harvest fails (Carlentini / latifondo)",
          },
        ],
      }),
      panel(3, {
        caption: "He listens",
        dialogue: "",
        sfx: "",
        notes: "Looks at wheat, not at her",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, ${T()} Trinity clean-shaven portrait, off-white linen shirt, listening face turned toward wheat not Sophia, soft heavy-lidded eyes, ${PERIOD}`,
        negative_notes: "no beard, no eye contact with her",
      }),
      panel(4, {
        caption: "Wheat texture",
        dialogue: "",
        sfx: "",
        notes: "Abstract beat — contract made visible as crop",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, extreme texture study of bone-white drought wheat filling frame, papery heads, hard March light, no faces, evidence panel`,
        negative_notes: "no people",
      }),
      panel(5, {
        caption: "Fixed rent",
        dialogue: "One-year rent. Fixed. You pay even if you starve.",
        sfx: "",
        notes: "Core line; keep faces sober",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, two-shot ${S()} Sophia hair UP speaking and ${T()} Trinity clean-shaven absorbing the fixed-rent line, drought field behind, ${PERIOD}`,
        negative_notes: "no melodrama faces",
        research_links: [
          {
            label: "Fixed rent / day hire vanishes when estate needs no hands",
          },
        ],
      }),
      panel(6, {
        caption: "Path ahead",
        dialogue: "",
        sfx: "",
        notes: "They keep walking; page into The Olive",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, dusty path ahead between wheat rows, ${S()} and ${T()} small figures walking deeper into the field, landscape-heavy, ${PERIOD}`,
        negative_notes: "no modern path signs",
      }),
    ],
  },
  {
    scene_key: "s1e4",
    sequence: 1,
    page_number: 4,
    title: "The Olive",
    summary:
      "Day laborers have it worse. She lifts a shriveled olive; quotes the October newspaper after seven silent months.",
    script_notes:
      "Evidence more than fruit. Panel 4 is VO / newspaper caption — graphic allowed. Research: Il Giornale di Sicilia.",
    panels: [
      panel(1, {
        caption: "Crouch",
        dialogue: "Day laborers have it worse.",
        sfx: "",
        notes: "She lowers to the ground",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, ${S()} Sophia crouching in dark work dress hair UP among wheat stalks, reaching toward dusty ground, ${T()} Trinity clean-shaven standing soft-focus behind, ${PERIOD}`,
        negative_notes: "no festa dress, no loose hair",
      }),
      panel(2, {
        caption: "Hand + olive",
        dialogue: "",
        sfx: "",
        notes: "Shriveled olive on stem — evidence",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, close-up ${S()} Sophia's hand holding a single dried shriveled olive on its stem above dusty ground, dark wool sleeve and apron edge, shallow DOF, ${PERIOD}`,
        negative_notes: "no ripe glossy olive, no jewelry",
      }),
      panel(3, {
        caption: "Her face",
        dialogue: "",
        sfx: "",
        notes: "Otherworldly calm; guide energy",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, close portrait ${S()} Sophia pale eyes red lips black under-eye streak, blonde hair UP, looking at olive out of frame, quiet diagnosis, ${PERIOD}`,
        negative_notes: "no smile, no loose hair",
      }),
      panel(4, {
        caption: "Newspaper VO",
        dialogue:
          "Il Giornale di Sicilia, October 1893 — olives fall dried and drenched; misery immense.",
        sfx: "",
        notes: "Caption / VO panel; typography ok; seven silent months later",
        prompt: `${STYLE_GHIBLI}. vertical manga panel 3:4, graphic manga caption panel, parchment-toned or soft black field, elegant serif newspaper quote feel WITHOUT readable small text blocks, olive silhouette motif optional, prestige anime title-card energy, no characters`,
        negative_notes: "no logos, no modern UI, no dense fake newspaper columns",
        research_links: [
          {
            label: "Il Giornale di Sicilia, Oct 1893 — olives dried; lemon/orange suffering",
          },
        ],
      }),
      panel(5, {
        caption: "Olive on ground",
        dialogue: "",
        sfx: "…",
        notes: "She sets it down / it falls",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, single dried olive on cracked dusty ground between wheat stalks, empty hand withdrawing, evidence left behind, no faces, ${PERIOD}`,
        negative_notes: "no people faces",
      }),
      panel(6, {
        caption: "Hold",
        dialogue: "",
        sfx: "",
        notes: "Hold on olive → smash to title next page",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, held beat on the shriveled olive centered on dust, almost still life, Ghibli painterly finish, silence before title card, no people`,
        negative_notes: "no text, no people",
      }),
    ],
  },
  {
    scene_key: "s1e5",
    sequence: 1,
    page_number: 5,
    title: "Title Card",
    summary:
      "Hold on the olive → smash to white serif on black: TRINITY: AN AMERICAN ODYSSEY / Episode One — MAFIA.",
    script_notes:
      "Graphic/black typography allowed. Panels 2–5 can be pure design. End on turn toward Seq 2.",
    panels: [
      panel(1, {
        caption: "Olive hold",
        dialogue: "",
        sfx: "",
        notes: "Carry last image one more beat",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, final hold on dried olive on dusty Sicilian ground, soft fade beginning at edges, no people, bridge into black`,
        negative_notes: "no text, no people",
      }),
      panel(2, {
        caption: "Smash black",
        dialogue: "",
        sfx: "—",
        notes: "Hard cut to black",
        prompt: `${STYLE_GHIBLI}. vertical manga panel 3:4, pure black smash cut panel, no figures, no ornaments, cinematic anime hard cut`,
        negative_notes: "no text yet, no logos",
      }),
      panel(3, {
        caption: "Title",
        dialogue: "",
        sfx: "",
        notes: "Main title only",
        prompt: `Minimal prestige title card, vertical manga panel 3:4, pure black background, elegant white serif typography centered: TRINITY: AN AMERICAN ODYSSEY, spare cinematic anime opening, no ornaments, no characters, no logos other than title text`,
        negative_notes: "no characters, no extra graphics",
      }),
      panel(4, {
        caption: "Episode line",
        dialogue: "",
        sfx: "",
        notes: "Thin line + episode",
        prompt: `Minimal prestige title card, vertical manga panel 3:4, pure black, thin white horizontal rule, elegant white serif: Episode One — MAFIA, spare anime opening energy, no characters`,
        negative_notes: "no characters, no ornaments",
      }),
      panel(5, {
        caption: "Silence",
        dialogue: "",
        sfx: "",
        notes: "Breath after title",
        prompt: `${STYLE_GHIBLI}. vertical manga panel 3:4, near-black silence panel, faintest dust mote or grain only, no text, no figures, post-title inhale`,
        negative_notes: "no text, no people",
      }),
      panel(6, {
        caption: "Turn",
        dialogue: "",
        sfx: "",
        notes: "Suggest motion into agro-town / Seq 2",
        prompt: `${STYLE_SICILY}. vertical manga panel 3:4, dusty path turning toward whitewashed agro-town walls at frame edge, empty, invitation to Sequence 2, NO people`,
        negative_notes: "no people, no title text",
      }),
    ],
  },
];

function styleForSequence(sequence: number): string {
  if (sequence === 5) return STYLE_DATA;
  if (sequence === 7 || sequence === 8) return STYLE_PRESENT;
  return STYLE_SICILY;
}

function shellPanels(beat: PilotSceneBeat): MangaPanelSeed[] {
  const style = styleForSequence(beat.sequence);
  const short = beat.summary.slice(0, 120);
  return ([1, 2, 3, 4, 5, 6] as const).map((slot) =>
    panel(slot, {
      caption: `Panel ${slot}`,
      dialogue: "",
      sfx: "",
      notes: "shell",
      prompt: `${style}. vertical manga panel 3:4, manga storyboard beat "${beat.title}" panel ${slot}/6: ${short}, period 1893 Sicily or matching sequence locale, ${PERIOD}`,
      negative_notes: "no modern props, no logos, no readable fake text",
    }),
  );
}

function shellPage(beat: PilotSceneBeat): MangaPageSeed {
  return {
    scene_key: beat.id,
    sequence: beat.sequence,
    page_number: beat.scene,
    title: beat.title,
    summary: beat.summary,
    script_notes: "shell — expand later",
    panels: shellPanels(beat),
  };
}

const shellPages: MangaPageSeed[] = trinityPilotScenes
  .filter((beat) => beat.sequence >= 2)
  .map(shellPage);

/** All 40 manga pages (Seq 1 scripted + Seq 2–8 shells). */
export const trinityPilotMangaPages: MangaPageSeed[] = [...seq1Pages, ...shellPages];
