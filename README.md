# Twilda

**Twilda** is a personal novel workspace from **Artometrics**: Library (Plan / Write / Codex), Journal, and Account — backed by Supabase Auth + Postgres.

## Stack

- Astro 7 + `@astrojs/netlify`
- Tailwind CSS 4
- Supabase Auth + Postgres (RLS)

## Setup

See **[docs/SETUP.md](docs/SETUP.md)**.

```bash
npm install
cp .env.example .env
# Fill PUBLIC_SITE_URL, PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY
# Run SQL: 001, 003, 007, 008 in Supabase SQL Editor (novels + onboarding + journal)
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
| Journal | `/blog/` |
| Account | `/account/` |
| Login | `/forms/login/` |

## Support

Lexington Themes template roots: [Documentation](https://lexingtonthemes.com/documentation/quick-start/), [Support](https://lexingtonthemes.com/legal/support/).
