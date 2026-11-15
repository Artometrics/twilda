# Twilda CMS

Twilda CMS is an open-source, git-native, fully static CMS built to fit Astro. Content lives in the repository as JSON. The public site is an Astro build with `output: "static"`. Authors edit an ordered list of prepared sections, save a draft, and publish as a separate step.

Apache-2.0. See [LICENSE](LICENSE).

This repository previously held a different product, an Expo novel workspace. That history is intact. See [HISTORY.md](HISTORY.md).

## What it is

- Content files under `content/<id>/draft.json` and `content/<id>/published.json`.
- A dev-only desk at `http://127.0.0.1:5173` that adds, removes, and reorders prepared sections, with a proof of the draft beside the form.
- A static demo site, Field Desk, built only from published files.
- A content model for a magazine homepage (carousel, story grid, headline / facts, magazine feature, category tiles) and a franchise-style article (headings, paragraphs, pull quotes, figures, lists, callouts, and a fact table).

## What it is not

- Not a hosted CMS, and not a paid plan. Nothing here asks you to create an account.
- Not a freeform page builder. Sections are prepared types, not a canvas.
- Not part of the production site. The editor never runs inside `astro build`, and the build does not enable SSR to carry it.
- Not wired to artometrics.com. There is no `npm run deploy`. GitHub Actions deploy three noindex Firebase Hosting sites when a commit lands on `main`: the Field Desk magazine (`twilda-510519`), the marketing site (`twilda-landing`), and the phone desk (`twilda-desk-510519`). See [examples/hosting/README.md](examples/hosting/README.md).
- Not the previous Expo app. Do not look for Supabase, React Native, or the novel workspace on this branch.

## Demo

The checked-in issue is **Field Desk**, original sample fiction about a made-up operator called Lumen Rail. It is not Artometrics copy. The article draft has one extra note that the published file omits, so the desk opens with unpublished changes on that document.

## Install

Node.js 22 or newer.

```bash
npm install
npm run build:packages
```

`npm install` links the workspaces `@twilda/core` and `@twilda/astro`. They are Apache-2.0 and not `private`. This branch does not publish them to npm. No environment file is required. Do not copy credentials from the old app into this repo.

### Use Twilda from another Astro site

Until the packages are on npm, install them from a checkout:

```bash
npm install ../twilda/packages/core ../twilda/packages/astro
```

Content for that integration lives in `articles/` and `pages/` under the directory you pass.

```ts
import { defineConfig } from "astro/config";
import { twilda } from "@twilda/astro";

export default defineConfig({
  output: "static",
  integrations: [twilda({ contentDir: "./content" })],
});
```

A page can read the published documents:

```astro
---
import { loadPublished, renderDocument } from "twilda:content";
const home = loadPublished().pages.find((page) => page.slug === "home");
if (!home) throw new Error("No published home page.");
---
<Fragment set:html={renderDocument(home)} />
```

`twilda()` throws if `output` is anything other than `"static"`. It does not add an adapter.

## Develop

```bash
npm run dev
```

- Desk (editor): http://127.0.0.1:5173
- Published site (Astro dev, published files only): http://127.0.0.1:4321

`npm run dev:editor` and `npm run dev:site` start either one alone.

In the desk, **Save draft** writes `draft.json`. **Publish** writes `published.json` as well. Refresh the Astro server to see a publish. The proof in the desk shows the draft immediately, including unsaved edits.

## Static build

```bash
npm run build
npm run preview
```

`dist/` is the public site. It includes the homepage and `/articles/lumen-rail` from published content. The draft-only sentence is not in that output. `npm run check:static` asserts that, and also asserts that the editor did not leak into `dist/`.

## Checks

```bash
npm run typecheck
npm test
npm run build
npm run check:static
```

GitHub Actions runs those four commands on pull requests and on this branch. That CI workflow does not deploy. `.github/workflows/firebase-deploy.yml`, `firebase-deploy-www.yml`, and `firebase-deploy-desk.yml` deploy when a commit is merged to `main`.

## Layout

| Path | Role |
| --- | --- |
| `content/` | Git content. Draft and published JSON. |
| `src/` | Astro site: pages, section HTML, content store. The section schema is `@twilda/core`. |
| `packages/core/` | `@twilda/core`. Article blocks, page sections, storage interface. |
| `packages/astro/` | `@twilda/astro`. The `twilda()` integration. |
| `editor/` | Vite + React desk. Dev only. |
| `packages/editor/` | The phone-first desk: new, edit, save, preview, export to Astro MDX or Markdown. Own `package.json`. Hosted on site `twilda-desk-510519`. `/desk` on the magazine site redirects there. |
| `drafts/artometrics/` | Three DRAFT sample articles (real public facts, cited, `[VERIFY]` notes) that the phone desk seeds on first visit. Not in `content/`. |
| `public/media/` | Demo plates (original SVG). |
| `docs/architecture.md` | Static contract, phone editor, drafts, and open questions. |
| `docs/content-model.md` | Localhost desk section types. |
| `docs/franchise-slice.md` | Franchise article mapped onto blocks. |
| `docs/demo-hosting.md` | Build and host the phone demo separately. |
| `docs/phone-drafting-audit.md` | Drafting from a phone: audit, what changed, export format. |

## Phone demo

`npm run build:demo` writes `demo-dist/`. That folder is the browser editor plus a static preview of published sample articles. It is not `dist/`, and it is not deployed by this repo. `npm run demo` serves the editor at http://127.0.0.1:4173. The localhost desk from `npm run dev` is unchanged and stays on 127.0.0.1:5173.

## Defaults

- Homepage document id is `home`, served at `/`.
- Articles are served at `/articles/<slug>` from published documents whose `kind` is `article`.
- The desk binds to `127.0.0.1` (`server.host` in `editor/vite.config.ts`, including `npm run dev:editor`). It is a local writer for the content directory, not a public service.
- Image fields accept only `/media/<name>.svg`. Links accept only site-relative paths.
- Package name is `twilda`, `private: true`, license `Apache-2.0`. It is not published to npm by this branch.
