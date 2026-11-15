# AGENTS.md — Twilda CMS

Twilda CMS is a git-native static CMS for Astro. The public site is `src/` and builds with `astro build` (`output: "static"`). Content is JSON in `content/<id>/draft.json` and `published.json`, using the `@twilda/core` document contract. The visual editor is `editor/` and runs only in Vite dev. Do not import the editor from `src/`, and do not add an Astro adapter. Do not add an npm deploy script. Deploys are the GitHub Actions in `.github/workflows/firebase-deploy.yml`, `firebase-deploy-www.yml`, and `firebase-deploy-desk.yml`, and they run on merge to `main`.

The previous Expo novel workspace lived in this repo through commit `106b96f`. It is history. See `HISTORY.md`. Do not restore Expo, Supabase, or Netlify. Firebase Hosting for the static `dist/` is `firebase.json` and `.firebaserc` (project `twilda-510519`); the phone desk site id is `twilda-desk` and the marketing target `www` is site `twilda-landing`. Do not put secrets in those files.

## Commands

- `npm install`
- `npm run dev` — editor on port 5173, published site on port 4321
- `npm run typecheck`
- `npm test`
- `npm run build` then `npm run check:static`

## Product rules

- Saving a draft and publishing are separate.
- Sections and article blocks are prepared types from `packages/core/src/schema.ts` (`@twilda/core`). Add, remove, and reorder. Do not turn the desk into a freeform canvas.
- The static build reads published files only.
- Demo content stays fictional. Do not scrape a live magazine into `content/`. `drafts/artometrics/` is separate: real-fact DRAFT articles in our own words, each cited, with `[VERIFY]` notes for anything unconfirmed. It feeds the phone desk and is not read by the static build.
- No secrets in the tree. No `.env` required.
