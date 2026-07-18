# AGENTS.md — Twilda (`@artometrics/twilda`)

**Twilda** (Artometrics) is a personal Astro SSR novel workspace: **Library** (Plan / Write / Codex), **Journal** (`/blog`), and **Account** — with Supabase Auth (email + Google).

**Publisher / support:** See README. Production: Netlify site `twilda`. Domain from `PUBLIC_SITE_URL`.

## Tech stack

- **Astro** `^7.0.0` (`astro.config.mjs`) with **`@astrojs/netlify`** adapter (static by default; SSR via `export const prerender = false`)
- **Tailwind CSS** `^4` via **`@tailwindcss/vite`**; plugins: **`@tailwindcss/forms`**, **`@tailwindcss/typography`**, **`tailwind-scrollbar-hide`** (see `src/styles/global.css`)
- **MDX:** `@astrojs/mdx`
- **Sitemap:** `@astrojs/sitemap`
- **RSS:** `@astrojs/rss` (used by `src/pages/rss.xml.js`)
- **SEO component:** `@lexingtonthemes/seo` (see `src/components/fundations/head/Seo.astro`)
- **Supabase:** `@supabase/supabase-js` — clients in `src/lib/supabase/`; env via `.env.example`
- **Host:** Netlify site `twilda` (`netlify.toml`); production domain from `PUBLIC_SITE_URL`
- **Markdown:** Shiki theme `night-owl`; `markdown.drafts: true` in config
- **Aliases:** `@/*` → `src/*` (`tsconfig.json`)

## Folder map

| Area | Path | Role |
|------|------|------|
| Routes | `src/pages/` | Novels, blog/journal, account, auth forms, APIs |
| Lib | `src/lib/` | Auth, novels, journal, Supabase clients |
| Layouts | `src/layouts/` | `BaseLayout`, `NovelcrafterLayout`, `LegalLayout` |
| UI | `src/components/` | `global/`, `fundations/`, `novels/`, `auth/` |
| Content | `src/content/` | `legal` (static); journal lives in Supabase |
| Tokens / global CSS | `src/styles/global.css` | Tailwind v4 `@theme` |
| Novel styles | `src/styles/novelcrafter.css` | Workspace chrome |
| Setup docs | `docs/SETUP.md` | Netlify + Supabase + env checklist |
| Supabase SQL | `supabase/migrations/` | Schema migrations |

## Content collections (`src/content.config.ts`)

Collections use **`defineCollection` + `glob` loaders only** — no Zod `schema`.

### Journal (Supabase)

- **Table:** `journal_entries` (`008_journal_entries.sql`)
- **APIs:** `/api/journal/`, `/api/journal/[id]/`
- **URLs:** `/blog/`, `/blog/posts/{id}/`
- **RSS:** `/rss.xml` (auth-gated; current user’s entries)

### `legal`

- **Folder:** `src/content/legal/`
- **Fields:** `page`, `pubDate`
- **URLs:** `/legal/{id}/`

## Product routes

| Area | Path |
|------|------|
| Home | `/` → library or login |
| Library | `/novels/`, `/novels/[id]/`, `/novels/series/` |
| Journal | `/blog/`, `/blog/posts/{id}/` |
| Account | `/account/` |
| Auth | `/forms/login`, `/forms/signup`, `/auth/callback` |

Novel workspace modes: **Plan**, **Write**, **Settings** (+ Codex / Snippets / Refs sidebar).

## Guardrails

- Keep the **`fundations`** folder name as-is.
- Prefer **minimal diffs** matching existing Lexington patterns (`@/` imports, `Wrapper` / `Text` / `Button`).
- Protected routes (middleware): `/novels`, `/account`, `/blog`, `/rss.xml`.

## Cursor Cloud specific instructions

- Setup: `npm install`, copy `.env.example` → `.env`, run `npm run dev`. See **`docs/SETUP.md`**.
- **Dev server port is `4321`**. Health: `/api/health`.
- **No lint/typecheck script is configured.** Use `npm run build` as the correctness check.
