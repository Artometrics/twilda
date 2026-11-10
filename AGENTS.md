# AGENTS.md — Twilda CMS

Twilda CMS is a git-native static CMS for Astro. The public site is `src/` and builds with `astro build` (`output: "static"`). Content is JSON in `content/<id>/draft.json` and `published.json`. The visual editor is `editor/` and runs only in Vite dev. Do not import the editor from `src/`, do not add an Astro adapter, and do not add a deploy script.

The previous Expo novel workspace lived in this repo through commit `106b96f`. It is history. See `HISTORY.md`. Do not restore Expo, Supabase, or Netlify. Do not add a deploy script. Firebase Hosting for the static `dist/` is `firebase.json` and `.firebaserc` (project `twilda-510519`); do not put secrets in those files.

## Commands

- `npm install`
- `npm run dev` — editor on port 5173, published site on port 4321
- `npm run typecheck`
- `npm test`
- `npm run build` then `npm run check:static`

## Product rules

- Saving a draft and publishing are separate.
- Sections are prepared types from `src/schema/sections.ts`. Add, remove, and reorder. Do not turn the desk into a freeform canvas.
- The static build reads published files only.
- Demo content stays fictional. Do not scrape a live magazine into `content/`.
- No secrets in the tree. No `.env` required.
