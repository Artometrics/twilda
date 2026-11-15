# Phase 4: modes, presets, and starters

Follows [phase3.md](phase3.md). Phase 4 makes Twilda usable for more than one kind of site without turning it into a page builder: three **modes** (corporate, magazine, lead generation), eleven new **prepared sections** and three new **article blocks** that the modes draw on, and three **starters** that scaffold a working Astro site in a mode. Every Phase 3 guarantee is kept: no script and no inline style in the output, validation before render, and the hostile-content tests apply to every new part. [choose-a-mode.md](choose-a-mode.md) is the guide for a person picking one.

## What changed for the contract

This is an additive change to `@twilda/core`. No existing document, section, or block changes shape. Existing sites render byte for byte as before (the renderer golden files are unchanged).

| Change | Detail |
| --- | --- |
| New optional `site.json` field | `mode`: `"corporate"`, `"magazine"`, or `"leadgen"`. Absent means magazine. |
| New page sections (11) | `hero`, `feature-grid`, `team`, `pricing`, `testimonials`, `contact`, `social-proof`, `cta`, `cover-story`, `category-grid`, `fast-facts` |
| New article blocks (3) | `fast-facts`, `pull-quote`, `bar-chart` |
| New link kind | `actionHref`: a site path, an `https://` or `http://` address, or a bare `mailto:address` (no query, no punycode host, 140 characters at most). Used only by the new section buttons and links. Existing fields keep their site-path-only rule. |
| New helpers | `PRESETS`, `applyPreset`, `starterSite`, `starterDocuments`, `modeOf`, `renderOptionsFor`, `PART_FIELDS`, `readSiteFile` (`@twilda/core/node`) |
| Renderer option | `mode`, which adds `mode-<id>` to the wrapper. Magazine and no mode print the same markup. |

`CONTRACT_VERSION` is unchanged because a document that was valid before is still valid and prints the same. A document that uses a new part is not readable by an older Twilda, which is the usual cost of adding a part.

## Modes and presets

A preset is `{ sections, blocks, theme, chrome }` in `packages/core/src/presets.ts`. It is data, not code.

| Mode | Page sections | Article blocks | Theme | Masthead |
| --- | --- | --- | --- | --- |
| Corporate | hero, feature-grid, team, pricing, testimonials, contact, story-grid, menu-shelf | heading, paragraph, image, key-findings, fast-facts, pull-quote, callout, bar-chart, embed, download | white, slate, blue, Public Sans | Brightline, anchors to its own sections |
| Magazine | cover-story, carousel, story-grid, fast-facts, category-grid, menu-shelf | heading, paragraph, key-findings, fast-facts, pull-quote, chart, bar-chart, callout, image, embed, download, sources | the existing Field Desk theme | The Harrow Ledger |
| Lead generation | hero, feature-grid, social-proof, testimonials, cta, contact | heading, paragraph, image, fast-facts, pull-quote, callout, download | warm paper, rust accent, humanist headings | Launchpad, last link is a button |

- The desk's **Theme → Mode** card applies a preset (`applyPreset`). It replaces the theme and mode. It replaces the masthead only if it is still a Twilda default (`chromeIsPristine`), so a site that has been edited keeps its name and links. Per-template and per-document masthead overrides are always kept.
- **Add a section**, **Add a block**, and **New draft** list the mode's library (`sectionCatalogFor`, `blockCatalogFor`, `templatesForMode`). A part from outside the library still renders and still edits, and the desk labels it "outside this mode". The library only decides what is offered.
- New draft templates: *Company home* and *Product update* (corporate), *Landing page* and *Case study* (lead generation), *Cover front* and *Data brief* (magazine). When a page opens with a hero or a cover story, that section prints the page's one `h1`, so the title the writer types is copied into it.

Each theme passes the same checks as any theme: six hex colors from the schema, fonts from the closed list, and a contrast test (4.5:1 for ink, muted text, and the accent on paper, and for the missing-plate label on the plate color).

## Prepared sections

All of these are in `packages/core/src/schema.ts`, validated by `documentSchema`, printed by `renderDocument`, listed in `PART_FIELDS` so the desk can edit them, and annotated so the live page can edit their text in place.

| Section | Role | Fields |
| --- | --- | --- |
| `hero` | Opening headline and up to two buttons | kicker, title, dek, primary and secondary label and link, plate, alt |
| `feature-grid` | Benefits or features, 1 to 12 | kicker, heading, intro, items of label, title, text |
| `team` | People, 1 to 12 | kicker, heading, intro, members of name, role, bio, plate, alt |
| `pricing` | Plans, 1 to 4 | kicker, heading, intro, tiers of name, price, period, summary, features (0 to 10 lines), button, featured |
| `testimonials` | Quotes, 1 to 6 | kicker, heading, intro, items of quote, name, role |
| `contact` | Ways to reach a person, 1 to 6 | kicker, heading, intro, address, channels of label, value, link |
| `social-proof` | Numbers and names | kicker, heading, intro, stats (0 to 4), brands (0 to 10) |
| `cta` | One call to action | kicker, heading, text, button, note, asks (0 to 4 plain lines) |
| `cover-story` | The lead story on a magazine front | kicker, title, dek, byline, link, plate, alt |
| `category-grid` | Browse by topic, 1 to 12 | kicker, heading, categories of label, dek, link, count |
| `fast-facts` | Square number tiles, 1 to 8 | kicker, heading, facts of value, label |

Article blocks: `fast-facts` (1 to 6 square tiles), `pull-quote` (quote and attribution), and `bar-chart` (2 to 12 bars). A bar's value is a plain decimal string (`^\d{1,9}(\.\d{1,2})?$`). The renderer turns it into a whole-percent class (`bar-w-0` to `bar-w-100`) scaled to the largest bar, so a bar needs no `style` attribute and no SVG. A value that is not finite, is negative, or is huge prints a zero-width bar.

Design decisions that follow from the Phase 3 policy:

- **No form.** `form-action 'none'` and the scanner both forbid `<form>`. The `cta` section lists what the form would ask and links to a form you host elsewhere. See [choose-a-mode.md](choose-a-mode.md#there-is-no-form).
- **No chart library, no SVG.** Bars are `div`s sized by class. The chart block that reads CSV is unchanged.
- **Empty optional lines are printed and hidden by CSS (`:empty`), not skipped.** The annotated render with its attributes stripped must equal the plain render, so structure cannot depend on whether the editor is on.
- **External links carry `rel="noopener noreferrer"`.** Site paths and `mailto:` do not.
- **Responsive without breakpoints per section.** Grids use `repeat(auto-fit, minmax(min(100%, Nrem), 1fr))`, and two media queries (800px and 560px) collapse the hero, cover, and contact layouts. Buttons and masthead links are at least 2.75rem tall on a phone.

## Starters

Three starters live in `examples/`, one per mode, and a script scaffolds a copy anywhere:

| Starter | Home page | Article |
| --- | --- | --- |
| `examples/starter-corporate` | Brightline: hero, features, team, pricing, testimonials, contact | Launch notes |
| `examples/starter-magazine` | The Harrow Ledger: cover story, fast facts, story grid, categories | Parking tickets (bar chart, pull quote, fast facts) |
| `examples/starter-leadgen` | Launchpad: hero, benefits, social proof, testimonials, call to action | A case study |

All content is fictional (reserved `example` addresses only). Each starter is a working Astro project: `output: "static"`, no adapter, `inlineStylesheets: "never"`, the `twilda()` integration, three small pages that call `renderDocument`, `content/site.json` with the mode, the sample documents with a draft and a published copy, plates, and a README with a quickstart and a launch checklist.

```bash
npm install                                           # once, at the repo root
npm run starter:dev -- corporate                      # http://127.0.0.1:4321
npm run starter:build -- corporate                    # examples/starter-corporate/dist
npm run build:starters                                # all three
npm run create:twilda -- ../my-site --mode leadgen    # your own copy
cd ../my-site && npm install && npm run dev
```

- **One generator.** `scripts/lib/starter.ts` writes both the checked-in `examples/starter-*` folders and a scaffolded project. Content comes from `starterDocuments(mode)` and `starterSite(mode)`, so a starter cannot drift from the preset. `npm run starters:sync` rewrites the folders, and a test fails if they differ.
- **Nothing is published.** The packages are not on npm (the owner holds that token). A checked-in starter links `@twilda/core` and `@twilda/astro` with relative `file:../../packages/...` paths. A scaffolded project links the checkout it was made from with absolute `file:` paths. `--deps registry` writes `^0.1.0` ranges for after publishing. Inside this repository the starters need no `npm install` of their own, because Node finds the workspace packages in the root `node_modules`.
- **Same layout as the desk.** `content/<id>/draft.json`, `published.json`, and `public/media/` are the layout the phone desk publishes into, so a starter pushed to GitHub can be edited and published from a phone.
- **`@twilda/astro` grew.** The `twilda:content` module also exports `loadSite()`, `renderOptionsFor`, and `themeCss`, and `@twilda/astro/client` carries its types. `readSiteFile` moved into `@twilda/core/node` (the repository's own site reads through it, with the same symlink refusal).
- **Security headers.** Each starter README prints the headers the repository's own site is served with (read from `firebase.json` when the starter is generated), minus the noindex ones. `firebase.json` is not copied, and no hosting config is written.
- The `robots.txt` in a starter allows crawlers, and the README tells the author to replace the fictional content first.

## Security: what was added and checked

| Area | What | Checked by |
| --- | --- | --- |
| New links | `actionHrefSchema` and `isMailto`: no `javascript:`, `data:`, `tel:`, `sms:`, no protocol-relative or backslash paths, no credentials, no punycode host, no whitespace, no mailto query or second address | `tests/security/modes-xss.test.ts` (a corpus of hostile targets, tried against the helpers, the schema, and the renderer) |
| New text fields | Every string of every new part, with every XSS payload from `tests/security/support.ts`, rendered alone (schema bypassed) and through the schema, annotated and plain, in each mode | `tests/security/modes-xss.test.ts` |
| Ids | A hostile `id` on any new section or block cannot break out of an attribute | `tests/security/modes-xss.test.ts` |
| Bars | `Infinity`, `1e999`, negative, `NaN`, markup, and huge values print only `bar-w-0` to `bar-w-100`, and the schema refuses all of them | `tests/presets.test.ts`, `tests/security/modes-xss.test.ts` |
| Size | Every list is capped, and one more than the cap is refused | `tests/security/modes-xss.test.ts` |
| Mode name | An unknown mode is never echoed into a class | `tests/security/modes-xss.test.ts` |
| Output | Each starter's build passes the production policy audit (no script, no inline style, same-origin assets only). The scaffolded project does too | `tests/starters.test.ts` |
| Browser | Each starter is served with the production CSP at 320, 390, and 1280 px. No console error, no blocked resource, no broken image, no sideways scroll | `tests/e2e-starters/starters.spec.ts` |
| Content audit | The starters' `content/` and `public/` pass `check:content` | `tests/starters.test.ts`, `npm run check:content` |
| Renderer test scanner | It now allows a bare `mailto:` href (matching the rule in `url.ts`) and still forbids `svg`, `form`, `style`, `input`, and `script`, and any `style` or `aria-hidden` attribute | `tests/security/support.ts` |

Nothing in the policy was loosened. The site CSP, the dist audit, and the golden files are the Phase 3 ones.

## Tests added

- `tests/presets.test.ts`: presets, themes (contrast), libraries, masthead behavior, `site.json` round trip, starters validate and link to things that exist, field list covers every field of every part (and the desk's blank item is valid at each list's maximum and invalid one over), renderer mode class, h1 rule, stylesheet covers every printed class, every annotated field edits through the schema.
- `tests/security/modes-xss.test.ts`: the hostile-content suite for the new parts.
- `tests/starters.test.ts`: starters equal the generator, build, pass the policy audit, `create-twilda` scaffolds, builds, refuses bad input, and the CLI prints usage.
- `tests/fixtures/modes-corpus.ts`: a hostile page with all eleven sections, a hostile article with the three blocks, and every starter document.
- `packages/editor/src/templates.test.ts`: templates per mode and the hero title rule.
- `packages/editor/e2e/phase4.spec.ts` (iPhone 14 in WebKit and desktop Chromium): the mode picker, templates per mode, the generic forms, masthead kept after an edit, hostile link and label, no sideways scroll at 320px.
- `tests/e2e-starters/starters.spec.ts`: each starter at 320, 390, and 1280 px, under the production CSP, and the screenshots below. CI runs it (`npm run test:e2e:starters`).

## Screenshots

Full-page, from the built starters (`npm run test:e2e:starters` rewrites them), in `docs/screenshots/`:

| Mode | Mobile 390 | Desktop 1280 |
| --- | --- | --- |
| Corporate | `phase4-corporate-mobile-390.png` | `phase4-corporate-desktop-1280.png` |
| Magazine | `phase4-magazine-mobile-390.png` | `phase4-magazine-desktop-1280.png` |
| Lead generation | `phase4-leadgen-mobile-390.png` | `phase4-leadgen-desktop-1280.png` |

The desk screenshots (`phase4-corporate-home-*`, `phase4-leadgen-switch-*`, `phase4-generic-form-*`) come from `packages/editor/e2e/phase4.spec.ts`.

## Running it

```bash
npm test                              # includes the new suites
npm run typecheck
npm run build && npm run check:static
npm run build:starters
npm run test:e2e:starters             # needs: npx playwright install chromium
npm run check:content && npm run check:secrets && npm run check:audit
cd packages/editor && npm test && npm run typecheck && npm run test:e2e
```

## Known limits and what is not done

- **`npm test` runs its files one at a time now** (`--test-concurrency=1`, about 30 seconds instead of 20). `main` already had a flake: `tests/click-edit-build.test.ts` and `tests/dist-headers.test.ts` both run `astro build` in the repository root, and two builds there share `.astro/`, so one of them failed about one run in three. This was reproduced on a clean checkout of `main` before the change. Four runs in a row pass with it.

- **No real form.** By design (see above). A lead-gen site needs an external form or booking link.
- **No `tel:` links.** Only a bare `mailto:` is allowed besides web and site links.
- **Existing sections still print an external link as `#`.** The old `safeHref` is site-path-only and was left alone so existing output stays byte-identical. Only the new sections use the wider link rule.
- **Overlay editing is text only.** Click-to-edit changes strings. Booleans (a featured plan), lists (add or remove a person), and the one-per-line features list are edited in the desk's form.
- **The older dev desk (`editor/`, port 5173) and the demo editor** show a hint to use the phone desk for the new parts. They do not have forms for them.
- **A page that leads with a hero or cover story** prints that section's title as the `h1`. The document title, dek, and kicker are then metadata, so the desk copies them into the hero when a draft is created from a template.
- **The packages are not published**, so a scaffolded project depends on a local checkout until the owner publishes. `npm create twilda` needs a published `create-twilda` package. The script is `npm run create:twilda` for now.
- **A starter is not deployed anywhere.** No hosting config, no deploy script, and nothing for the existing sites changed.
- **Not tried on a real phone or with a real GitHub repository**, as in earlier phases. WebKit with the iPhone 14 profile and Chromium were used.
- **A mode is a starting point.** It is not a lock. The theme panel still edits every token after a switch.
