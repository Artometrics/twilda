# Manga Studio

Trinity Manga Studio turns the pilot storyboard into a 6-panel manga page per scene.

## Modes

| Mode | Role |
|------|------|
| **Board** | 16:9 storyboard stills (one image per scene beat) |
| **Manga** | Portrait 3:4 panels — one scene = one page = **6 panels** (`grid_2x3`) |

Board locks composition and location. Manga scripts dialogue, SFX, captions, and panel-level prompts for generation.

## Unit

- **1 scene → 1 page → 6 panels**
- Seeds: `src/lib/novels/trinity-pilot-manga.ts` (`trinityPilotMangaPages`)
- Storyboard beats: `trinityPilotScenes` in `trinity-pilot-storyboard.ts`

## Default model

`nano_banana_2` (`mangaDefaultModel`) — same family as Seq 1 stills / Elements multi-character work.

## Schema

Migration **`010_manga_pages.sql`**:

- `manga_pages` — scene_key, sequence, page_number, title, summary, script_notes, layout, page_image_path
- `manga_panels` — slot 1–6, caption / dialogue / sfx / notes, prompt, negative_notes, research_links, source_url, higgsfield_job_id
- Storage bucket `manga` for panel + composited page images

## Workflow

1. **Script** — fill caption, dialogue, SFX, notes (Seq 1 is fully scripted; Seq 2–8 are shells)
2. **Prompt** — vertical manga panel 3:4 + style locks; use `buildMangaPanelPrompt` if needed
3. **Generate** — Higgsfield `generate_image` with Elements `<<<trinityElementId>>>` / `<<<sophiaElementId>>>` where characters appear
4. **Import** — store `source_url` / `higgsfield_job_id` on the panel
5. **Composite** — assemble the 2×3 page image
6. **Export** — page-level `page_image_path` for reading / sharing

## Board vs Manga

- **Board** = episode stills, landscape, one frame per minute-beat
- **Manga** = readable page, portrait panels, denser storytelling inside the same beat

Field bible and character locks: `docs/trinity-manga/`.
