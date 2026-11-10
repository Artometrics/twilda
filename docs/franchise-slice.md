# Franchise slice

The public article is [https://artometrics.com/franchise](https://artometrics.com/franchise). Its Quarto source is in the Artometrics site repo and was not read for this note. Another change is rewriting that article, so this mapping is the shape of the page fetched on 2026-11-10, not a claim that every sentence will stay.

Nothing here is deployed to artometrics.com. The fixture is `packages/core/src/sample.ts`. The static sample renders it at `demo-dist/preview/articles/franchise/` after `npm run build:demo`.

## Block map

| On the public page | Twilda block | In the fixture |
| --- | --- | --- |
| Banner / cover | `image` role `banner` | Original SVG. The live banner file was not copied. |
| Title, dek, kicker, byline | Document fields | Title, dek, and byline Kyle McAuliffe are from the public page. |
| Published figures table | `key-findings` | Four headline figures, including 55.8% merchandise and $130.7B Pokémon. |
| Section headings and prose | `heading`, `paragraph` | Two headings and two short paragraphs. The essay was not copied. |
| Plotly charts | `chart` with `dataPath` and `alt` | One CSV of three published shares. Rendered as a table. |
| Data and method box | `callout` | One short note plus the Wikipedia revision id cited on the page. |
| Bibliography | `sources` | Wikipedia list and TidyTuesday. Not the full bibliography. |
| Audio | `embed` kind `audio` | Link to the public article. The audio file was not copied. |
| Dataset download | `download` | The three-row fixture CSV, not the full Franchise dataset. |

Video is the same `embed` block with `kind: "video"`. The fetched Franchise page listed audio, not a video file, so the fixture does not invent a video.

## What does not fit

- Quarto execution, R charts, and Plotly JSON. The static page will not redraw them. A chart block stores a CSV path and alt text. The interactive chart is lost.
- Cross-references, footnotes, and bibliography keys (`S017`, `@article`) are plain text or source links. Citation management is not a block.
- Stickers, phone wallpaper, and Mac wallpaper listed on the public page are not blocks. They were not copied.
- The cleaning log, bootstrap method, and per-section "what it means / how we know / mechanism / counterexample" pattern is many paragraphs. The fixture keeps the pattern available (heading, paragraph, callout) and does not encode a special research-section type.
- Drafts in this demo do not unpublish the live Artometrics URL. There is no connection to that site.

## Build order

Still off production. Each step has a check that already runs in this repo, or is marked if it does not.

1. Schema and sample fixture. Check: `npm test` round-trips Franchise and rejects a `javascript:` link.
2. Static render. Check: `npm run build:demo` writes `demo-dist/preview/articles/franchise/index.html` with the title, the 55.8 share, no draft note, and no `<script`.
3. Phone edit. Check: Playwright at 390px edits a paragraph, drags a block, uploads a PNG, and previews the draft without changing the published preview.
4. Publish and rollback. Check: the same test merges a local pull request, sees the sentence on the published preview, rolls back, and sees it gone.
5. Real GitHub. Not done. The client is tested against a fake API. Kyle has to create the OAuth app or a fine-grained token. Do not commit it.
6. An Artometrics preview branch. Not done. Do not open a pull request against the Artometrics repo from this work.

## Test criteria for a later preview branch

When someone does try this on a preview branch of the Artometrics site, these are the gates. None of them are claims about the current live site.

- The preview URL is not `https://artometrics.com/franchise`.
- Saving a draft leaves the preview's published HTML unchanged.
- Publish is a merge. The next static build shows the new order of blocks.
- Rollback is a revert. The following build matches the previous HTML for the edited sentence.
- A chart still has alt text if the CSV is missing.
- The production Firebase project for Artometrics is not the deploy target.
