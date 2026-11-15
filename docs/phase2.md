# Phase 2: the live visual editor (prepared sections only)

Twilda is still a static, git-native CMS. Phase 2 makes the page itself the editor. There is no freeform canvas and no drag-anywhere layout: every edit is a field, or a prepared section or block from the schema in `packages/core/src/schema.ts`. The static build still reads published files only, `output: "static"` has no adapter, and `dist/` has no editor code (`npm run check:static`).

The same overlay (`@twilda/core/edit`) drives two surfaces: the phone desk (`packages/editor`) and the click-to-edit page (`click-edit/`, built to `dist-edit`, never deployed).

## What changed

| Area | Behavior | Where |
| --- | --- | --- |
| One storage layout | `content/<id>/draft.json` beside `published.json`. Every editor, the Astro build, the loader, `GitHubBackend` and the demo backend use the helpers in `packages/core/src/paths.ts`. `npm run migrate:content` moves the retired `content/articles/` and `content/pages/` files. | `paths.ts`, `load.ts`, `scripts/migrate-content-layout.ts`, `tests/layout.test.ts` |
| Chrome per site | `content/site.json` holds the masthead, issue label, note and colophon, with optional per-document overrides. `renderDocument(doc, { chrome })` receives it in the Astro pages, the desk and click-to-edit. | `site.ts`, `src/content/site.ts` |
| Marks | Bold, italic and links inside text, shown in a toolbar pinned above the keyboard. Stored as a small markup subset inside plain strings (`**bold**`, `*italic*`, `[text](url)`), validated by the schema. Unsafe link targets are refused. Pasted HTML becomes text. | `marks.ts`, `edit/overlay.ts`, `tests/marks.test.ts` |
| Images | Tap an image: pick a repo image or upload a photo, and set the alt text. | `edit/overlay.ts`, `edit/media.ts` |
| Uploads | The photo is decoded, resized to at most 1600 px, and re-encoded as JPEG in the browser (this drops EXIF, rejects SVG and files that are not images, and keeps it under 900 KB). It shows from the device at once and is committed to `public/media/<name>.jpg` in the same pull request. The page prints `/media/<name>.jpg`, so the "Plate unavailable" limit is gone for repo media. | `edit/media.ts`, `backend-github/src/publish.ts` |
| Video | Tap a video: paste a YouTube or Vimeo link. Only those hosts are accepted. The canonical `youtube-nocookie.com` or `player.vimeo.com` embed URL is rebuilt from the video id, and the iframe is sandboxed and lazy. `frame-src` for those two hosts is in the CSP of the site and the desk, not `www`. | `embed.ts`, `firebase.json`, `tests/embed-media.test.ts` |
| Theme | A closed token list: six colors, curated fonts, base size, heading scale and spacing. It previews live in the desk, shows a contrast warning, and is stored in `content/site.json`. The site links a generated `/theme.css` (the CSP forbids inline styles), and it is empty for the default theme. | `site.ts`, `ThemePanel.tsx`, `src/pages/theme.css.ts`, `tests/site.test.ts` |
| Sections and blocks | Move, copy, remove and add from a library of prepared types, with 44 px targets at 390 px. A page or article is never emptied. | `structure.ts`, `library.ts`, `tests/structure.test.ts` |
| Save, undo, redo | Autosave to the device is unchanged. Undo and redo step through whole-document snapshots, and typing in one field is one step. Ctrl/Cmd+Z works on the desk. | `history.ts`, desk reducer, click-edit bar |
| Moved main | Before publishing, the desk reads `main`'s copy. If nothing changed there, it publishes. If other fields changed, it merges silently. If the same field changed on both sides, it shows both values and publishes your choice. The tool-owned branch is rebuilt from `main` each time. | `merge.ts`, `backend-github/src/publish.ts`, `ConflictSheet.tsx` |

## Safety notes

- Publishing never writes to `main`. It force-moves only `twilda/draft/<id>` and `twilda/site`, both owned by the tool, and it refuses any other branch name.
- Before it writes, it checks again that `main` is unchanged since the plan (`main-moved`).
- A page that fails the schema is refused before any request is made.
- A theme value that is not a valid hex color or an allowed font cannot reach the page. `themeVars` falls back to the default for it.
- Uploaded file names are sanitized and made unique. A name already used on `main` for different bytes gets a new name, and main's file is not touched.
- A new article block that needs a value (an image, a download link, a chart) is added empty. The page cannot be published until it is filled in, and the desk says which field.

## What is not done

- Not tried on a real phone, a real GitHub repository, or with network access to YouTube or Vimeo. Tests use WebKit with the iPhone 14 profile, Chromium, and a stateful fake GitHub API (`tests/support/fake-github.ts`).
- The conflict sheet decides per field. It does not merge two edits of the same sentence.
- One document at a time: the theme and a page are separate pull requests.
- Uploaded photos are kept in the browser's local storage until the pull request is merged. A very large photo may not fit, and then it stays for that visit only.
- Reordering moves one step at a time with buttons. There is no drag-and-drop on the live page.
- Video is a link to YouTube or Vimeo, not an upload.
- Fonts are a curated list of system stacks, not web fonts.

## Checks

Root: `npm run typecheck`, `npm test`, `npm run build`, `npm run check:static`, `npm run build:demo`, `npm run test:e2e`, `npm run test:e2e:edit`.
Desk (`packages/editor`): `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`.

Screenshots are in `docs/screenshots/phase2-*` (390 and desktop widths).
