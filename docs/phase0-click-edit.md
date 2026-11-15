# Phase 0: click-on-the-page editing prototype

Status: throwaway-but-working. It edits one page, `content/home`, in the real Field Desk template. It is a test of whether the idea survives Twilda's constraints (static output, no server, git as the store, phone first). It is not a product.

## What it does

- A second Astro config, `astro.edit.config.ts`, builds `click-edit/` into `dist-edit/`. `astro.config.ts` and `dist/` are unchanged.
- The page is the production template (`src/render/document.ts` plus `magazine.css`). With `{ annotate: true }`, the renderer adds `data-twilda-ref` (a dotted path into the document JSON, for example `sections.0.slides.2.title`) and `data-twilda-type` (`text` or `image`). Images also get `data-twilda-alt-ref`. These are plain attributes, not stega.
- Desktop: hover outlines a field and names it ("Edit title"). Click edits the text in place, or opens the image sheet.
- Phone: outlines are on by default because there is no hover. Tap text to edit it where it sits (the keyboard opens, the bottom bar hides). Tap an image for a bottom sheet. Targets in the bar and sheets are at least 44px.
- Text edit: Enter or leaving the field commits, Escape cancels, paste is plain text. Every commit is validated by the `@twilda/core` Zod schema. A refused value (an empty title, text over a limit) shows an error and the old text comes back.
- Image swap: pick one of the plates in `public/media`, and edit its alt text. Uploading is not in the prototype (see blockers).
- Draft: each edit writes the whole validated document to `localStorage` (`twilda:click-edit:draft:home`). Reload restores it. Reset discards it.
- Publish: GitHub sign-in (device flow, or a pasted token), then one pull request. It reuses `GitHubBackend` and the phone desk's steps: branch `twilda/draft/home`, commit `content/home/draft.json` (status `draft`) and `content/home/published.json` (status `published`) with the Contents API, open a PR into `main`. Merging is the publish decision. Nothing is deployed by the PR, and the prototype adds no deploy script.

## Screenshots

Mobile 390px: [page with outlines](screenshots/phase0-page-390.png), [text edited](screenshots/phase0-text-edited-390.png), [image sheet](screenshots/phase0-image-sheet-390.png), [publish sheet](screenshots/phase0-publish-sheet-390.png).

Desktop 1280px: [hover overlay](screenshots/phase0-page-desktop.png), [text edited](screenshots/phase0-text-edited-desktop.png), [image sheet](screenshots/phase0-image-sheet-desktop.png), [publish sheet](screenshots/phase0-publish-sheet-desktop.png).

## Run it

```bash
npm install
npm run dev:edit        # http://127.0.0.1:4322, edit target with hot reload
# or
npm run build:edit && npm run preview:edit
```

On a phone, serve it on your LAN (`npm run dev:edit -- --host 0.0.0.0`) and open it, or use a browser's device mode at 390px. Do not deploy `dist-edit/`. It contains the draft and the editing code. The page is `noindex`, but that is not access control.

Publishing needs a GitHub identity that can push branches to the repo:

| Variable | Meaning |
| --- | --- |
| `PUBLIC_TWILDA_GITHUB_CLIENT_ID` | Public OAuth client id (the repo variable). Without it, only the pasted-token path is offered. |
| `PUBLIC_TWILDA_DEVICE_FLOW_PROXY` | Base URL of a pass-through proxy for `github.com/login/*`. Required for device flow to work in a browser (see blocker 1). |
| `PUBLIC_TWILDA_GITHUB_OWNER`, `PUBLIC_TWILDA_GITHUB_REPO` | Default `Artometrics` and `twilda`. |

The token stays in the tab's memory. Nothing is written to the repo or to `localStorage`.

## Tests

- `npm test` adds `tests/click-edit.test.ts` (annotation invariants, edit validation, local draft, publish against a fake GitHub), `tests/core-browser.test.ts` (the `renderDocument` question below), and `tests/click-edit-build.test.ts` (builds both targets and checks `dist/` has no hooks, no editor, no storage key).
- `npm run test:e2e:edit` runs 10 flows at 390px with touch and at 1280px (two are viewport-specific): annotate, inline edit, reload, schema refusal, image and alt swap, reset, mobile overflow, desktop hover, full publish through a mocked GitHub (including CORS preflights), the CORS failure message, and the token path. `SCREENSHOTS=1 npm run test:e2e:edit -- -g captures` rewrites `docs/screenshots/phase0-*`.
- `npm run check:static` now also fails if `dist/` contains `data-twilda`, `twilda-root`, `twilda:click-edit`, or `contenteditable`.

The invariant that matters: with annotation off, `renderDocument` output is unchanged. A test strips the added attributes from annotated output and requires it to equal the plain output byte for byte, and `dist/` from this branch is byte-identical to `dist/` from `main`.

Size of the edit script: 86 KB, 23 KB gzip, including Zod. It is in `dist-edit/` only.

## Does `@twilda/core` `renderDocument` run in the browser?

Short answer: the function does. The package root does not. And it is not the template the site uses.

1. **The function is browser-safe.** `packages/core/src/render.ts` imports only `./schema` (Zod). Bundled with esbuild for `platform: "browser"` and run in a context with no `process`, `require`, or `Buffer`, it returns the same string as Node. The same holds for the site renderer, `src/render/document.ts`.
2. **The package root is not browser-safe.** `import { renderDocument } from "@twilda/core"` pulls in `index.ts`, which re-exports `loadContentTree` from `load.ts`, which imports `node:fs` and `node:path`. esbuild fails: `Could not resolve "node:fs"` and `"node:path"`. The package has no `exports` subpath for the renderer, so a browser consumer has to deep-import `packages/core/src/render.ts`, which is what the phone desk already does for the schema. Fix: move `load.ts` behind its own entry (`@twilda/core/node`), or split `@twilda/core/render` out.
3. **It is not the real template.** The core `renderDocument` is a preview renderer: `<main>` with generic markup, no masthead, no `.magazine`, `.plate`, or `.kicker` classes, no `safeMedia` or `safeHref` filtering. `renderPreviewPage` inlines its own small stylesheet. The site's template is `src/render/document.ts`, which lives outside `@twilda/core`. Rendering a draft "in the real template" in the browser therefore means bundling the site renderer, which the prototype does (it also runs on the server, so SSR and client markup come from one function). `@twilda/astro` re-exports the core renderer, so there are two renderers in the repo that already disagree on markup and on escaping (the site's `escapeHtml` also escapes `'`, core's does not). This duplication is a real risk for a "what you edit is what ships" claim.
4. **Server and client markup are the same function.** The edit page ships server-rendered HTML from `renderDocument(doc, { annotate: true })`, and the build test checks that exact string is in `dist-edit/index.html`. The client calls the same function and re-renders only when a local draft differs from the build.

Recommendation: promote the site template into `@twilda/core` (or a new `@twilda/render`) as the single renderer, give it the `annotate` option, and make `load.ts` a Node-only entry.

A design note: client-side rendering is a convenience, not a requirement. For arbitrary Astro components the edit build would render the user's real pages at build time with refs and patch the DOM by ref (text: `textContent`, image: `src` and `alt`). That removes the need to bundle the renderer at all, at the cost of the "restore a local draft" path needing a DOM patch pass instead of a render.

## Findings and blockers

| # | Finding | Severity | State |
| --- | --- | --- | --- |
| 1 | **GitHub's device-flow endpoints are not callable from a browser.** `POST https://github.com/login/device/code` and `/login/oauth/access_token` return no `Access-Control-Allow-Origin`, and the `OPTIONS` preflight is a 404 (checked with `curl` from this VM on 2026-11-15, with a throwaway client id, since the real id is a repo variable that this run cannot read). `api.github.com` does send CORS headers (`access-control-allow-origin: *`, and `Authorization` is allowed). So device flow works only through a CORS proxy. The proxy holds no secret, because a public client needs none, but it is a deployed piece. The prototype supports `PUBLIC_TWILDA_DEVICE_FLOW_PROXY` and a pasted-token fallback, and explains the failure in the UI. | High. This is the central constraint on "no server". | Open. Owner decision needed (see decision doc). |
| 2 | **`GitHubBackend` threw "Illegal invocation" in a real browser.** It stored the global `fetch` on the instance and called it as a method. The phone desk's GitHub publish path has the same code and has only run against a fake `fetch`. Fixed in this PR (`packages/backend-github/src/index.ts`), with a unit test, and verified by reverting the fix and watching the e2e publish fail. | Medium. Latent bug in shipped code. | Fixed. |
| 3 | Device flow requests `scope: "repo"`. For an OAuth App that is write access to every repo the person can reach. A GitHub App with device flow enabled gives per-repository permissions and expiring tokens. | Medium | Open. Phase 1 should use a GitHub App. |
| 4 | Publish needs a person with push access to the repo. A non-collaborator cannot create a branch. A fork-and-PR path is not built. | Medium for the product, none for the owner-only case | Open |
| 5 | Image upload is not built. The template accepts only `/media/<name>.svg`, so a camera-roll photo needs a wider `safeMedia`, a binary write (`GitHubBackend.write` encodes text only), resizing, and a size cap. | Medium | Open |
| 6 | Staleness: the edit build embeds the draft at build time. If `main` moved after the build, the PR may conflict or overwrite. There is no three-way check. | Medium | Open |
| 7 | `contenteditable` was tested in Chromium (desktop, and a 390px touch-emulated Pixel 5). It was not tested on real iOS Safari or real Android. IME, autocorrect, and keyboard-avoidance are the usual failure points. | High for a phone-first claim | Not verified |
| 8 | Only plain single-line text is editable. Rich text, links, block add/remove/reorder on the page, and articles are not annotated. The phone desk covers add, remove, and reorder. | Scope | By design for Phase 0 |
| 9 | The edit build and a pasted token share a page with all of the edit code. An XSS in that page can read the token. The prototype has no third-party script and no `innerHTML` from user text outside the template's escaping, but the edit target is not hardened (no CSP header is set). | Medium | Open. Add a CSP header when hosting it. |

## What is not claimed

- No real GitHub call was made. Publish is verified against a fake GitHub in unit tests and against `page.route` mocks, with CORS preflights, in the browser.
- No sign-in was attempted with the real client id.
- The prototype is not hosted anywhere, and nothing was deployed.
