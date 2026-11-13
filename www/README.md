# Twilda marketing site (`www/`)

Static Astro landing page for [twilda.com](https://twilda.com). Pitch: a Sanity alternative made for Astro websites — writing-first, Git-friendly CMS from Artometrics.

This folder is separate from the CMS app at the repo root. Building here does not touch the Field Desk `dist/` or the phone desk package.

## Requirements

Node.js 22 or newer.

## Develop

```bash
cd www
npm install
npm run dev
```

Dev server: http://127.0.0.1:4322

## Build

```bash
cd www
npm run build
npm run check:links
npm run preview
```

Output is `www/dist/`.

## Deploy (Firebase Hosting)

Hosting is configured in the repo-root `firebase.json` / `.firebaserc`:

| | |
| --- | --- |
| Firebase project | `twilda-510519` |
| Hosting site id | `twilda-landing` |
| Target name | `www` |
| Public directory | `www/dist` |

The site is **noindex** for now (`meta robots` plus `X-Robots-Tag` in hosting headers).

Create/select the site once (already exists as `twilda-landing`), then from the **repo root**:

```bash
# Apply hosting target mapping if needed
firebase target:apply hosting www twilda-landing

# Build the landing site
npm --prefix www run build

# Deploy only the www target (does not deploy the CMS app sites)
firebase deploy --only hosting:www
```

Do not point this target at the CMS app `dist/` or the desk package. Do not put secrets in `.firebaserc`.

## Design notes

Visual inspiration: [Lexington Themes](https://lexingtonthemes.com) (editorial Astro themes such as Hemingway). Look only — no Lexington code or assets are vendored here.
