# Twilda desk

The desk is a standalone static app in `packages/editor`. It is the phone-capable editor: prepared blocks for an article, prepared sections for a page, a draft that is not the published file, and a preview. It does not ship inside `astro build`. The site in `src/` never imports it, and its own build output is `packages/editor/dist`, not the site's `dist/`.

The older dev desk in `editor/` is unchanged. It still binds to port 5173 and writes `content/` through the Vite middleware. This package binds to `127.0.0.1:5174` and talks to a `StorageBackend` injected at startup. Until the git backends land, that backend is an in-memory Field Desk sample.

## Why Vite and React

Vite builds a static SPA and a small service worker without an Astro adapter. React is the UI runtime already used by the dev desk, and the screen state is a plain `useReducer`. The tests call that reducer directly. There is no router, no component library, and no drag-and-drop package: reordering is pointer events on a handle, plus Up and Down buttons.

Preact would save a few kilobytes and would also force a second renderer into the repository. The React runtime stays inside this package, so it never enters the Astro `dist/`.

## Run

From `packages/editor`, with Node 22 or newer:

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5174. The dev server is loopback only. No environment file and no token.

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run preview
```

`npm test` is the reducer, image-fit, and in-memory backend tests. `npm run test:e2e` runs the same flow in Chromium at 390×844 and at 1280×800 and writes screenshots to `packages/editor/screenshots/`.

The root `npm test` does not run this package. Run the commands above.

## What you can do

- The document list shows a Draft badge, and Published or Not published. If the draft and the published copy differ, it also says Unpublished changes.
- An article is an ordered list of prepared blocks: heading, paragraph, key findings, chart, callout, sources, image, video, audio, download. Add, edit, delete, drag the handle, or use Up and Down. Arrow keys on the handle do the same move.
- A page is an ordered list of prepared sections: carousel, story grid, headline / facts, magazine feature, category tiles. The same add, remove, and reorder controls. It is not a freeform canvas.
- Media upload reads the file in the browser, scales a raster image so the long edge is at most 1600 pixels, and writes the result through the backend. SVG and GIF are stored as uploaded. A file that already fits is not re-encoded.
- Preview has two parts. The draft proof is rendered from the document you are editing, including unsaved edits. If the backend supplies a preview URL, an iframe loads it. The sample URL is `/preview-frame.html`, a stand-in for the built page. If the URL is missing, the proof remains and the desk says so.
- Save draft writes `content/<id>/draft.json` only. Publish asks first, then saves, checks the draft (the build step), and writes `content/<id>/published.json`. Revert asks first, then copies the published file back over the draft. Save, build, and publish failures use different banners. A build failure leaves the published file alone.

On a phone the desk is one column: Documents, Edit, Preview, Media. Actions sit above the tab bar. Targets are at least 44px, focus is a 2px ink outline, and motion is removed when the reader asks for reduced motion. At 960px and wider the list, the editor, and the preview sit in three columns.

The installed app shell is a manifest plus `public/sw.js`, registered only in the production build. Icons are generated with `npm run icons` (no extra dependency).

## StorageBackend

`src/contract.ts` is the local stand-in for the interface Agent A is publishing. The desk receives an object with `list`, `read`, `write`, `delete`, `createBranch`, `openPullRequest`, `mergePullRequest`, `revert`, and `listDrafts`. `src/main.tsx` constructs `MemoryBackend`, seeds Field Desk, and passes it to `<App backend={...} />`. Tests construct their own instance.

`src/backend/service.ts` is the small client on top of that interface:

| Desk action | Backend calls |
| --- | --- |
| List | `listDrafts`, then `read` of each draft and its published file |
| Save | `write` of `content/<id>/draft.json` |
| Publish | `write` draft, read it back and reject a build fault, `write` of `published.json` |
| Revert | `revert({ documentId })` |
| Upload | `write` of `media/<name>` and `media/index.json` |
| Preview URL | `read` of `content/<id>/preview-url.txt` |

`createBranch`, `openPullRequest`, and `mergePullRequest` are implemented on the memory backend and covered by a unit test. The screen does not call them. Publishing here means writing the published JSON, which matches the current static pipeline. The git branch, pull request, and merge steps belong to the GitHub backend.

A build fault for tests is the file `content/<id>/build-fault.txt`. In dev, `window.__TWILDA__.plantBuildFault(id, message)` writes it. That hook is not part of the production bundle.

## Look

The desk keeps the Field Desk palette already in this repository: paper `#f3efe6`, ink `#1b1714`, a hairline rule, Newsreader for the wordmark, document titles, and the proof, Public Sans for the controls. Proof red `#7d1e16` is the publish button and the failure banner. Green is only the Published badge. Corners are 2px. There is no drop shadow and no second accent.

The phone structure follows a reorder list (a grip on the row, one primary action pinned under the work) and a reading proof that is the article, not a miniature canvas. Block types are named rows because the product is prepared blocks, not a freeform text surface.

## Stubbed until the other packages land

- Document types in `src/model.ts` are local. Page sections store a label and a summary, not the nested slides, tiles, and fact rows in `src/schema/sections.ts`. Swap `src/contract.ts` and `src/model.ts` for `@twilda/core` when `cursor/twilda-core-types` is available, and keep the screens.
- The chart block is a caption plus a ruled stand-in. It does not embed a charting library. A data path can be stored on the block.
- Video and audio blocks store a path and a caption. The sample does not ship media files for them.
- The memory backend does not write `content/` on disk and does not open a real pull request. URLs it returns look like `memory://pull/1`.
- This package is not wired into the root `npm run dev` or the Astro build.

## Demo content

Field Desk, Lumen Rail, and River note are the same fiction as the rest of the repository. Lumen Rail's draft has one callout the published copy does not, so the list opens with unpublished changes. River note has no published file. None of it is a live magazine.
