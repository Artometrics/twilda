# Twilda starter: Corporate

A company site: hero, features, team, pricing, testimonials, contact. A business, studio, or product that wants a clear, calm front door.

This is a working Astro site wired to Twilda. It is fully static (`output: "static"`, no adapter, no script on the page, no database). Content is JSON in `content/`, and the page is drawn by one renderer from prepared sections.

## Quickstart

From the root of the Twilda repository (Node.js 22 or newer):

```bash
npm install
npm run starter:dev -- corporate      # http://127.0.0.1:4321
npm run starter:build -- corporate    # writes examples/starter-corporate/dist
```

To start your own project from this starter instead, run `npm run create:twilda -- ../my-site --mode corporate`.

The build reads `content/<id>/published.json` only. A draft never reaches the site.

## What you get

- Mode: **Corporate** (`"mode": "corporate"` in `content/site.json`). The mode picks the section library, the theme tokens, and the masthead.
- Sections you can add: hero, feature-grid, team, pricing, testimonials, contact, story-grid, menu-shelf.
- Article blocks you can add: heading, paragraph, image, key-findings, fast-facts, pull-quote, callout, bar-chart, embed, download.
- Pages: `/` (home), `/articles/launch-notes` (launch-notes).
- All sample content is fictional.

## Edit it

1. **By hand.** Change the text in `content/<id>/published.json`. `npm run build` validates every file against the Twilda schema and stops with the field name if something is wrong. Edit `draft.json` too if you use the desk.
2. **With the Twilda desk.** The desk reads and writes this same layout (`content/<id>/draft.json`, `published.json`, `public/media/`) through your GitHub repository and publishes as a pull request. Saving a draft and publishing stay separate.
3. **Change the mode.** In the desk, open Theme and pick another mode, or edit `content/site.json` and copy the theme and masthead from the preset. Existing sections stay valid in every mode.

## Layout

| Path | What it is |
| --- | --- |
| `content/site.json` | Mode, theme tokens, masthead and footer |
| `content/<id>/draft.json`, `published.json` | One document: a page (sections) or an article (blocks) |
| `public/media/` | Plates and photos. A page may print only files from this folder |
| `src/pages/` | Three small Astro pages that call `renderDocument` |
| `astro.config.ts` | `output: "static"` and no inlined styles |

## Before you launch

- [ ] Replace the fictional text and plates, and the name and links in `content/site.json`.
- [ ] Set `site` in `astro.config.ts` if you want a sitemap or absolute URLs.
- [ ] Serve `dist/` with security headers. The page needs no script and no inline style, so this policy works as is:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Strict-Transport-Security: max-age=31536000
X-Permitted-Cross-Domain-Policies: none
Content-Security-Policy: default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; script-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'none'; connect-src 'none'; worker-src 'none'; manifest-src 'none'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; upgrade-insecure-requests
```

- [ ] The sample content is not meant to be indexed. Remove it first, then decide on `robots.txt` (the one here allows crawlers).

## Rules the starter keeps

Keep `output: "static"` and add no adapter. Do not inline styles or scripts. Links in content must be site paths, `https://` addresses, or a plain `mailto:`. There is no form: the lead-gen call to action links to a form or booking page you host elsewhere.
