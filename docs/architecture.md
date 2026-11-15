# Architecture

Contract version 1 lives in `packages/core`. The Zod schemas and `StorageBackend` methods are the shared interface. Change them only with a note in the pull request.

Two editors exist:

- `editor/` is the localhost desk. `npm run dev` binds it to `127.0.0.1:5173`. It writes `content/<id>/draft.json` and `published.json` for the Field Desk demo. Leave that pin alone.
- `apps/demo-editor` is the phone demo. It is a static page. Drafts stay in the browser. It is not part of `dist/`.

The public site never needs either editor to be online.

## One renderer

`renderDocument` in `@twilda/core` is the only document renderer. The Astro site, the click-to-edit prototype, the demo editor's preview, `examples/studio`, and the phone desk's page view all call it, so what you edit is what the template prints. This is a contract-adjacent change: the package root no longer exports `loadContentTree` (use `@twilda/core/node`), and `renderDocument` returns the template markup. Production `dist/` is byte-identical to before. See [phase1.md](phase1.md) for the list of intended differences and the parity tests.

Package entries: `@twilda/core` (schema, storage contract, renderer, escape helpers, browser-safe), `@twilda/core/node` (`loadContentTree`, Node only), `@twilda/core/edit` (click-on-the-page overlay and dotted-path edit rules, browser only), and the stylesheets `@twilda/core/magazine.css` and `@twilda/core/edit.css`.

## Static contract

The new contract, used by the demo and by `examples/studio`, is JSON:

```text
content/<id>/draft.json            the working copy (status "draft")
content/<id>/published.json        what the static build reads
content/site.json                  masthead (chrome) and theme tokens for the whole site
public/media/<name>.jpg            photos uploaded from a phone, committed in the same pull request
content/data/<name>.csv
content/media/<name>.json          uploads only, as JSON bytes
content/.twilda/history/<id>/<stamp>.json
```

A document has `status: "draft"` or `"published"`. The static Astro build reads published JSON only. `loadContentTree` skips drafts. Publishing does not unpublish a live page: the previous published file is stored under `content/.twilda/history` and rollback writes that file back.

`examples/studio` builds with `output: "static"` and no adapter. Its HTML has no script tags. Chart blocks become a table plus alt text. They do not load Plotly.

Root `npm run build` still builds Field Desk from `content/*/published.json` into `dist/`. `npm run check:static` fails if that folder contains the demo editor marker `twilda-demo-editor`.

What production needs after a publish: the merged files and a normal static build. Not the editor, not IndexedDB, not a token, not a database.

## Content model

Articles are ordered blocks. Pages are ordered sections. The schema is `packages/core/src/schema.ts`. Example files are generated into `examples/studio/content/` by `npm run build:demo`.

Article blocks: `heading`, `paragraph`, `key-findings`, `chart` (`dataPath` + `alt`), `callout`, `sources`, `image` (`banner` or `figure`), `embed` (`video` or `audio`), `download`.

Page sections: `carousel` (the sample home page has 5 slides; the schema allows 1–8), `story-grid` (square cards), `menu-shelf`.

`id` and `slug` match. Links are site paths or `http(s)` URLs. `javascript:` is rejected.

The localhost Field Desk, the click-to-edit page and the phone desk all use `packages/core/src/schema.ts` and one storage layout: a folder per document with `draft.json` beside `published.json` (Phase 2, [phase2.md](phase2.md)). The retired `content/articles/<slug>.json` and `content/pages/<slug>.json` layout is read only by `npm run migrate:content`. Older Field Desk section names were migrated into these blocks and sections.

## Draft, preview, publish

Branch names:

- draft: `twilda/draft/<documentId>`
- revert: `twilda/revert/<documentId>-<stamp>`
- base: `main`

`createBranch` is idempotent. Merge applies the branch diff, so a later edit on `main` is not wiped by an older draft branch.

```mermaid
sequenceDiagram
  participant Phone
  participant Store as StorageBackend
  participant Main as main branch
  participant Build as Static build
  Phone->>Store: saveDraft on twilda/draft/id
  Store-->>Phone: draft preview, rendered in the page
  Phone->>Store: openPullRequest
  Phone->>Store: mergePullRequest
  Store->>Main: published JSON only
  Main->>Build: astro build, output static
  Build-->>Phone: HTML, no editor
  Phone->>Store: revert previous published text
  Store->>Main: rollback commit
```

In the browser demo, `StorageBackend` id `demo` performs those steps in IndexedDB (localStorage if IndexedDB fails). Pull request URLs look like `demo://pull/1`. That is a real local merge. It is not GitHub.

`packages/backend-fs` writes the same state to a directory and mirrors each branch under `tree/`. `packages/backend-github` calls the GitHub REST API with a token passed in at runtime. Tests use a fake `fetch`. No GitHub App is created in this repo.

The phone desk's Page view renders the draft through the one renderer and edits it in place. The demo editor's preview renders the saved draft or the published copy. `demo-dist/preview/` is a static build of the seeded published sample. It does not update when you tap Publish. Rebuilding does.

## Phone editor

`npm run demo` serves the editor at `http://127.0.0.1:4173`. Width target is 390px.

| Screen | What it does |
| --- | --- |
| Document list | Articles and pages. Shows unpublished changes. Reset to sample. |
| Edit | Block or section fields. Touch drag handles reorder. Save draft. |
| Media | Image upload, 1.5 MB, png/jpeg/webp/gif/svg. Stored on the draft. |
| Preview | Draft preview and published preview. |
| Publish | Merge the local pull request, show history, roll back. |

There is no service worker. A manifest is included so a browser can offer Add to Home Screen. The page works without installing.

Sample articles use public titles and a few published figures from artometrics.com, fetched 2026-11-10. Bodies are short fixtures. Banners are an original SVG, not Artometrics art. See [franchise-slice.md](franchise-slice.md).

## Auth

The production site has no login. These are the editor options:

| Option | What is true | Cost in this repo | Risk |
| --- | --- | --- | --- |
| Localhost desk | Already shipped. Bound to 127.0.0.1. Writes local files. | None | Useless on a phone. |
| Browser demo | No sign-in. IndexedDB on the device. Reset clears it. | None | Not shared. A cleared browser loses drafts. Recommended for the phone demo. |
| GitHub token or device flow | The editor calls GitHub from the browser. No Twilda server. Token stays in tab memory. | A GitHub OAuth App client id Kyle creates, or a fine-grained PAT. Not committed. | XSS in the editor page can read the token. Public repos show drafts as branches. |
| A Twilda auth server | Would hold GitHub App private keys. | A server we would have to run. | Rejected for v1. The production site must stay static. |

Recommendation: use the browser demo to edit on a phone with no account. Use a fine-grained PAT or device flow only when a real repository should receive the pull request. Do not add auth to the production Astro build.

## Hosted pieces

| Piece | Needed for the phone demo? | Notes |
| --- | --- | --- |
| Editor static host | Yes, if the phone should open a URL | `demo-dist/` from `npm run build:demo`. Any static host. See [demo-hosting.md](demo-hosting.md). |
| GitHub | No for the demo. Yes for real publish. | REST from the browser. Mocked until a token exists. |
| Preview host | The demo renders preview in the page | A separate CI preview per branch is not built. Unverified. |
| Production site | Already static | Must stay a different deploy from the editor. |

No paid plan is required. Firebase Hosting has a no-cost Spark tier; current quotas were not rechecked for this note.

Production `dist/` is already described by `firebase.json` for site `twilda-510519`, with `script-src 'none'`. That file is not a deploy script. The phone demo must not be uploaded to that site: `demo-dist/` contains the editor's JavaScript, and the production CSP would blank it. Do not point hosting at `artometrics-510519`. See [demo-hosting.md](demo-hosting.md) and [../examples/hosting/README.md](../examples/hosting/README.md).

The localhost desk still saves `draft.json` and publishes a separate `published.json`. Field Desk's extra callout is only in the draft. See [content-model.md](content-model.md).

## Open questions and risks

Unverified items are marked.

1. The Franchise article is being rewritten. Figures in the fixture were copied from the public page on 2026-11-10 and may already be wrong. Unverified against the Quarto source, which this repo does not contain.
2. Bylines for Anime, Dodgers, and Simpsons were not in the text extracted from those public pages. The fixture says Artometrics. Simpsons uses the homepage card only. Unverified.
3. `firebase.json` sets `script-src 'none'` for `dist/`. Whether the live host is actually serving that file was not rechecked from here. The demo editor needs scripts and must stay off that target.
4. GitHub device flow and contents writes are tested with a fake `fetch` only. Real GitHub behavior is unverified. There is no client id in the repo.
5. A branch preview build in CI is not implemented. The phone preview is a client-side render.
6. IndexedDB quota on a phone was not measured. Uploads are rejected over 1.5 MB. A full store throws `persist-failed`.
7. Field Desk sample JSON has been migrated onto `@twilda/core`. The two editors still use different file layouts (`draft.json` beside `published.json`, versus one JSON file per article or page).
8. Shipping this editor onto artometrics.com is out of scope. Preview branches of that site are not created by this repo.
