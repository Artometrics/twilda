# Architecture

Twilda CMS is a small pipeline. Content is files in git. The public site is a static Astro build of the published files. The visual editor is a development tool that writes those files. It is not a page in the production site, and the production build does not turn on SSR to host it.

```text
editor (Vite, dev only, port 5173)
        |  Save draft
        v
content/<id>/draft.json
        |  Publish  (a separate action)
        v
content/<id>/published.json
        |  astro build   (output: "static", no adapter)
        v
dist/   HTML, CSS, fonts, and media plates
        |
        v
any static host, later, by a person — this repo does not deploy
```

## What runs where

| Piece | When it runs | Reads | Writes |
| --- | --- | --- | --- |
| Desk editor | `npm run dev` or `npm run dev:editor` | `draft.json`, and `published.json` for status | `draft.json` on save; both files on publish |
| Astro dev server | `npm run dev` or `npm run dev:site` | `published.json` only | nothing |
| `npm run build` | CI and local static export | `published.json` only | `dist/` |

The editor proof is rendered in the desk from the document you are editing, including unsaved changes. The Astro server is the published site. Refresh it after publish. A static build is a separate command. Publish does not upload anything.

## Why the editor cannot ship

- Astro is configured with `output: "static"` and no adapter. There is no production server and no SSR.
- Pages under `src/pages` never import `editor/`.
- The editor is a second Vite app (`editor/vite.config.ts`) with a dev-server middleware at `/api/documents`. That middleware exists only while Vite is running. `astro build` does not load it.
- `npm run check:static` fails the build if `dist/` contains the editor marker, the draft-only sample sentence, or the content API path.

## Draft and publish

Each document is a directory:

```text
content/home/draft.json
content/home/published.json
content/lumen-rail/draft.json
content/lumen-rail/published.json
```

Save validates the document and writes `draft.json`. Publish validates, writes `draft.json`, then writes `published.json`. Revert copies the published document back over the draft. A document with no `published.json` is absent from the static site.

The sample article is checked in with a draft that has one extra callout. The published file does not. That is the demonstration that save and publish are different. Publishing that draft would make the extra note public on the next build.

## Prepared sections

A document is an ordered array of section objects. The desk can add, remove, and reorder those sections, and edit the fields each type already has. It does not offer a freeform canvas. Allowed types depend on `kind`:

- `page` (the demo homepage): carousel, story grid, headline / facts, magazine feature, category tiles.
- `article` (the demo franchise piece): heading, paragraph, pull quote, figure, list, callout, and headline / facts.

See [content-model.md](content-model.md).

## Demo, not a live magazine

`content/` is a built-in demo called Field Desk. It is original sample fiction so the CMS can be tried without Artometrics production copy. The first design partner for the section types is the shape of a magazine homepage and a franchise article. This repository does not connect to twilda.com or to the Artometrics site.

## Hosting

`dist/` is ordinary static output. `firebase.json` points Firebase Hosting at that folder and sets the response headers. This repo has no deploy script and no Netlify config. See [../examples/hosting/README.md](../examples/hosting/README.md).
