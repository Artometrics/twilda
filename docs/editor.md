# Twilda desk

The desk is a standalone static app in `packages/editor`. It is the phone-capable editor: a dashboard of drafts, a page view that is the draft in the real template and is edited in place, prepared blocks for an article, prepared sections for a page, and a draft that is not the published file. See [phase1.md](phase1.md). It does not ship inside `astro build`. The site in `src/` never imports it, and its own build output is `packages/editor/dist`, not the site's `dist/`.

The older dev desk in `editor/` is unchanged. It still binds to port 5173 and writes `content/` through the Vite middleware. This package binds to `127.0.0.1:5174` and talks to a `StorageBackend` injected at startup. Until the git backends land, that backend keeps files in the browser (IndexedDB, then localStorage) so drafts survive a reload. `?sample=field-desk` opens the old fictional Field Desk sample on a throwaway in-memory store instead.

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

`npm test` is the content model, export, zip, preflight, persistence, sample-draft, reducer, image-fit, and in-memory backend tests. `npm run test:e2e` runs in WebKit with the iPhone 14 profile at 390×844 and in Chromium at 1440×900. The drafting spec writes screenshots to `docs/screenshots/`. Install the browsers once with `npx playwright install webkit chromium`.

The root `npm test` does not run this package. CI has a separate job for it. See [phone-drafting-audit.md](phone-drafting-audit.md) for what a person can do from a phone today and what the audit found.

To open it on a phone, build it with `npm run build` and host `packages/editor/dist` on any static host, or on a trusted network run `npm run dev -- --host 0.0.0.0`. The second is plain http, so Copy and the service worker are unavailable. Download and the JSON backup work.

## What you can do

- The Drafts dashboard shows each draft as a card with a status pill (`Draft · Not published`, `Unpublished changes`, or `Published`), open `[VERIFY]` notes, and when it was last edited. It filters by status and searches title, kicker, and dek.
- New draft starts from a template: Blank article, Feature story, Data story, Short note, Front page, Topic page. Each is an ordered list of prepared blocks or sections with placeholder copy.
- The Page view is the draft rendered by `@twilda/core` in the real template. Tap text to edit it where it sits. Tap an image to pick a repo plate. Each edit is checked against the schema and saved to the device 250 ms later. The template only prints `/media/<name>.svg` plates, so other images show "Plate unavailable" and the desk says so.
- An article is an ordered list of prepared blocks: heading, paragraph, key findings, chart, callout, sources, image, video, audio, download. Add, edit, delete, drag the handle, or use Up and Down. Arrow keys on the handle do the same move. Tap a block title to collapse it. Collapse all gives a one-line outline.
- A page is an ordered list of prepared sections: carousel, story grid, headline / facts, magazine feature, category tiles. The same add, remove, and reorder controls. It is not a freeform canvas.
- Media upload reads the file in the browser, scales a raster image so the long edge is at most 1600 pixels, and writes the result through the backend. SVG and GIF are stored as uploaded. A file that already fits is not re-encoded.
- Under the page, if the backend supplies a preview URL, an iframe loads it. The sample URL is `/preview-frame.html`, a stand-in for the built page. If the URL is missing, the desk says so.
- New article makes a draft with a unique slug. Import reads a JSON backup. Delete asks first. Edits are written to the draft file after a 250 millisecond pause. The chart block is an embed link, alt text, and a caption. The image block uploads in place. Sources are a citation and a link. `[VERIFY ...]` notes are counted on the list and highlighted on the page.
- Export gives MDX or Markdown with Astro frontmatter, a `.zip` bundle (MDX, Markdown, JSON, images), and a JSON backup. A preflight list shows what to fix first. `packages/editor/astro-kit/` holds the Astro components the MDX imports.
- Save draft writes `content/<id>/draft.json` only. Publish asks first, then saves, checks the draft (the build step), and writes `content/<id>/published.json`. If a GitHub token was pasted in the dialog, it also opens a pull request into `main` (branch `twilda/draft/<id>`, file `content/articles|pages/<slug>.json`). Revert asks first, then copies the published file back over the draft. Save, build, and publish failures use different banners. A build failure leaves the published file alone.

On a phone the desk is one column with tabs: Drafts, Page, Blocks, Export, Media. Actions sit above the tab bar. Main targets are at least 44px, focus is a 2px accent outline, and motion is removed when the reader asks for reduced motion. At 960px and wider the draft list and the page sit side by side, and Blocks, Export, and Media open in a right-hand panel.

The installed app shell is a manifest plus `public/sw.js`, registered only in the production build. Icons are generated with `npm run icons` (no extra dependency).

## StorageBackend

`src/contract.ts` is the local stand-in for the interface Agent A is publishing. The desk receives an object with `list`, `read`, `write`, `delete`, `createBranch`, `openPullRequest`, `mergePullRequest`, `revert`, and `listDrafts`. `src/main.tsx` opens a `PersistentBackend` over the best available browser store, seeds the three Artometrics sample drafts on the first visit only, and passes it to `<App backend={...} />`. Tests construct their own instance.

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

White surfaces on a cool grey ground, rounded cards and pills, one violet accent, and Public Sans for the interface. The page itself is styled by `@twilda/core/magazine.css`, so it keeps the magazine's type and colour. Desk class names must not collide with the template's (the desk uses `topbar`, `brand`, and `eyebrow`, not `mast`, `mark`, and `kicker`).

The phone structure is a reorder list (a grip on the row, one primary action pinned under the work) and a page that is the article, not a miniature canvas. Block types are named rows because the product is prepared blocks, not a freeform text surface.

## Stubbed until the other packages land

- Document types in `src/model.ts` are the `@twilda/core` article blocks and page sections. `src/contract.ts` is still the desk's storage method list.
- The chart block is a link to a chart that already exists (for example an Artometrics chart page), alt text, and a caption. It does not embed a charting library. The proof shows a ruled stand-in unless the link is an image.
- Video and audio blocks store a path and a caption. The sample does not ship media files for them.
- Publishing writes a published copy into the browser store. With a pasted token it also opens a pull request that adds the document at `content/articles|pages/<slug>.json`. Without one, export the draft and commit the file. Auth limits are in [phase1.md](phase1.md).
- This package is not wired into the root `npm run dev` or the Astro build. The page view uses the Field Desk masthead (`DEFAULT_CHROME`).

## Demo content and the sample drafts

The three drafts in `drafts/artometrics/` are real-fact drafts, not fiction: each is marked DRAFT, cites public sources, and keeps `[VERIFY]` notes where a figure could not be confirmed. They are the desk's first-visit content. They are not copied from a magazine page.

Field Desk, Lumen Rail, and River note are the same fiction as the rest of the repository. Lumen Rail's draft has one callout the published copy does not, so the list opens with unpublished changes. River note has no published file. None of it is a live magazine.
