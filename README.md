# Twilda

**Twilda** is a writing product from **Artometrics**: novels workspace (Plan / Write / Codex / Chat / Review), **Atlas** historical maps (including Met Open Access artifacts), **GOTHA** personal genealogy, and **My Museum** collections on your account.

This repo started from the Lexington Themes Ella Mae Astro template and is customized for Twilda on Netlify + Supabase.

## Stack

- Astro 7 + `@astrojs/netlify`
- Tailwind CSS 4
- Supabase Auth + Postgres (RLS)
- MapLibre GL (Atlas / GOTHA)
- Stripe billing (optional until enabled)
- Netlify AI Gateway for Chat / Review (no provider API keys on Netlify)

## Setup

See **[docs/SETUP.md](docs/SETUP.md)**.

```bash
npm install
cp .env.example .env
# Fill PUBLIC_SITE_URL, PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY
# Run SQL: 001, 003, 004, 005 (museum), 006, 007 (onboarding) in Supabase SQL Editor
npm run dev
```

## Commands

| Command | Action |
|--------|--------|
| `npm run dev` | Dev server (`localhost:4321`) |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run netlify:dev` | Dev with Netlify env |

## Product routes

| Area | Path |
|------|------|
| Library | `/novels/` |
| Atlas | `/atlas/` |
| GOTHA | `/gotha/` |
| Account / My Museum | `/account/` |
| Help | `/helpcenter/` |
| Research | `/research/` |

## Open data

Atlas enrichment may call Wikidata (CC0), Wikipedia summaries (CC BY-SA), Wikimedia Commons (per-file), and the Met Collection API (CC0 for Open Access). Europeana / Rijks / Smithsonian / FRED env keys are **future optional stubs** (not wired). Twilda does **not** scrape WikiArt. Remote image origins are documented in `docs/SETUP.md`.

## Support

- [Documentation](https://lexingtonthemes.com/documentation/quick-start/) (theme)
- Product contact: `/forms/contact/`
