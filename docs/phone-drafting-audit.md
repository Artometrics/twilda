# Drafting an article from a phone: audit and what changed

The question: can a person on an iPhone, with no account, create an article in Twilda, edit its blocks, save a draft, preview it, and export Astro-ready Markdown or MDX with frontmatter?

The audit ran the phone desk (`packages/editor`, the code on `main` after PRs #28 to #31) in WebKit with the iPhone 14 profile at 390x844, plus Chromium. The other two editors in the repo were read, not extended: `editor/` is the localhost dev desk and `apps/demo-editor` is the demo on a strict schema.

## Before this change

| Need | On `main` | Result |
| --- | --- | --- |
| Create an article | No control. The list showed three fictional Field Desk documents and nothing else | Missing |
| Edit heading, paragraph, key findings, callout | Worked, one field per prop | Works |
| Chart block | Title, caption, and a field called "Data path". No alt text, and no sense of "this is a link to a chart" | Partial |
| Image block | Upload only in a separate Media tab. The image block took a typed path | Partial |
| Sources / citations | A label and a "Path" per item. The default row was a made-up internal link | Partial |
| Download block | Label and path. No description | Partial |
| Save a draft | Wrote a draft file | Works, but only into memory |
| Keep the draft | Everything lived in a `MemoryBackend`. A reload, or Safari discarding the tab, erased the work | Missing |
| Preview | A draft proof. Sources were a bare list, a chart was a stand-in, and `[VERIFY]` notes looked like any other text | Partial |
| Export | No export of any kind | Missing |
| Import, delete, backup | None | Missing |
| Long articles on a phone | Every block expanded, so a 15-block article was a very long scroll | Painful |

## What changed

- **Drafts persist on the device.** `PersistentBackend` writes each file through to IndexedDB, then localStorage, then memory if the browser blocks both. A failed write is reported as a failed save and rolled back. The list says which one is in use.
- **Create, import, delete.** A New article sheet (title, kicker, byline, dek) makes a draft with a unique slug. Import reads a JSON backup. Delete asks first. Restore brings back sample drafts that are missing without touching edited ones.
- **Autosave.** Edits go to the draft file 1.5 seconds after typing stops. This is the draft only. Publish still needs the confirm dialog. The autosave action does not overwrite text typed after the snapshot was taken.
- **Blocks that match what an article needs.** Chart: embed link, alt text, caption and source line. Image: upload from inside the block, pick an earlier upload, or paste an https link. Sources: a citation and a link per row. Download: label, link, description. Each block has Up and Down buttons, a title that collapses it, and a Delete button. Collapse all gives a one-line outline.
- **Preview shows what the export will say.** Numbered sources, links only when they are safe, chart link, and `[VERIFY]` notes highlighted. A "Draft proof" ribbon marks it.
- **Export tab.** MDX or Markdown, a `draft: true` switch, a preflight list, the text on screen, and Download, Copy, Share (where the browser can share files), a `.zip` bundle with images, and a JSON backup.
- **Preflight.** Empty title, bad slug, missing dek or byline, no citation with a working link, blocks that still hold the starter text, charts without alt text or a link, and the number of `[VERIFY]` notes still open.
- **Three sample drafts.** See `drafts/artometrics/`. Each is marked DRAFT, cites its sources, and keeps `[VERIFY]` notes where a figure could not be confirmed.

## Export format

```
---
title: "..."
slug: "..."
description: "<dek>"
kicker: "..."
author: "<byline>"
updatedDate: 2026-11-12T10:00:00.000Z
draft: true
---
```

Strings are JSON-quoted, which is valid YAML. Body text is escaped so Markdown and MDX read the same characters back. MDX imports only the components it uses from `../../components/twilda/index.ts`. Copy `packages/editor/astro-kit/` there. The Markdown export has no imports and turns chart, callout, key findings, and download into blockquotes, lists, and links.

The three sample drafts and an adversarial test article (asterisks, braces, angle brackets, a `<script>` tag, list-like lines) were built through Astro 5 with `@astrojs/mdx` in a throwaway project, in both flavors. Every page built, and the special characters rendered as text. That project is not in the repo or in CI. The unit tests cover the same escaping rules.

## Tests

- `npm test` in `packages/editor`: 67 unit tests (content model, slugs, normalize, export, escaping, zip, preflight, persistence, sample drafts, reducer).
- `npm run test:e2e`: WebKit with the iPhone 14 profile at 390x844, and Chromium at 1440x900. Create, edit all block types, save, reload, preview, export all five ways, download and compare the file, delete, import the JSON back, autosave across a reload, publish stays separate, plus the earlier Field Desk flow.
- Screenshots of the desk, editor, outline, preview, and export at both sizes are in `docs/screenshots/`.
