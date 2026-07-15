# AGENTS.md — Twilda (`@artometrics/twilda`)

**Twilda** (Artometrics) is an Astro SSR product: novel writing workspace (**Plan / Write / Codex / Chat / Review**), **Atlas** historical map (seed catalogs + Met Open Access), **GOTHA** genealogy, and **My Museum** private collections — plus a polished marketing site (research, help center, changelog, legal).

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

(`zod` appears only as `vite.ssr.noExternal` in `astro.config.mjs`, not as a direct dependency.)

## Folder map

| Area | Path | Role |
|------|------|------|
| Routes | `src/pages/` | File-based routing; dynamic `[...slug].astro`, `blog/tags/[tag].astro`, `rss.xml.js`, `api/health.ts` |
| Lib | `src/lib/` | Site helpers + Supabase clients (`supabase/`) |
| Layouts | `src/layouts/` | `BaseLayout.astro`, section layouts (blog, legal, team, …) |
| UI | `src/components/` | `global/`, `fundations/`, `features/`, `blog/`, `pricing/`, etc. |
| Content | `src/content/` | Markdown (and MDX for posts) per collection subfolder |
| Tokens / global CSS | `src/styles/global.css` | Tailwind v4 `@theme`, fonts, colors, animations |
| Processed images | `src/images/` | Blog, team, changelog, brands, blobs, integrations, customers, assets |
| Setup docs | `docs/SETUP.md` | Netlify + Supabase + env checklist |
| Supabase SQL | `supabase/migrations/` | Future schema migrations |
| Public static root | `public/` | `robots.txt`, `favicon.svg`, `og-image.jpg`, `apple-touch-icon.png` |

## Content collections (`src/content.config.ts`)

Collections use **`defineCollection` + `glob` loaders only** — there is **no Zod `schema`** in this repo. Expected frontmatter is defined **implicitly** by layouts and pages that read `entry.data` (and by `BlogLayout` receiving `entry.data` as `frontmatter`).

### `posts`

- **Folder:** `src/content/posts/`
- **Files:** `**/*.(md|mdx)`
- **Fields (inferred):** `title`, `description`, `pubDate`, `team` (slug matching a `team` entry `id`), `tags` (array; used for `/blog/tags/[tag]`), `image.url`, `image.alt`
- **Images:** Referenced paths like `/src/images/blog/…` work with `astro:assets` `<Image>` in `BlogLayout` / `BlogCard`
- **Template:** Copy structure from `src/content/posts/1.md`

### `changelog`

- **Folder:** `src/content/changelog/`
- **Files:** `**/*.md`
- **Fields (inferred):** `page`, `pubDate`, `description`, `image.url`, `image.alt`
- **Template:** `src/content/changelog/1.md`

### `legal`

- **Folder:** `src/content/legal/`
- **Files:** `**/*.md`
- **Fields (inferred):** `page`, `pubDate` (see `LegalLayout` / sample entries)
- **Template:** `src/content/legal/terms.md`

### `team`

- **Folder:** `src/content/team/`
- **Files:** `**/*.md`
- **Fields (inferred):** `name`, `role`, `bio`, `image.url`, `image.alt`, `socials.twitter`, `socials.website`, `socials.linkedin`, `socials.email`
- **`posts.team`:** Must equal the team member’s content **`id`** (filename stem, e.g. `david-lee` → `src/content/team/david-lee.md`)
- **Template:** `src/content/team/isaac-turner.md`

### `customers`

- **Folder:** `src/content/customers/`
- **Files:** `**/*.md`
- **Fields (inferred):** `customer`, `testimonial`, `ctaTitle`, `partnership`, `about`, `challengesAndSolutions` (array of `{ title, content }`), `results` (string array), `details` (key/value object), `logo.url`, `logo.alt`, `avatar.url`, `avatar.alt`
- **Template:** `src/content/customers/1.md`

### `helpcenter`

- **Folder:** `src/content/helpcenter/`
- **Files:** `**/*.md`
- **Fields (inferred):** `iconId`, `page`, `description`, `category`, `keywords` (array), `lastUpdated`, `faq` (array of `{ question, answer }`)
- **Template:** `src/content/helpcenter/1.md`

### `integrations`

- **Folder:** `src/content/integrations/`
- **Files:** `**/*.md`
- **Fields (inferred):** `integration`, `description`, `email`, `permissions` (string array), `details` (array with `title`, `value`, optional `url`), `logo.url`, `logo.alt`, `tags` (array)
- **Template:** `src/content/integrations/1.md`

## Routing (content → URL)

| Collection | Index | Entry URL |
|------------|--------|-----------|
| `posts` | `/blog/` | `/blog/posts/{id}/` where `{id}` is the content id (e.g. `1` from `1.md`) |
| (tags) | `/blog/tags/` | `/blog/tags/{tag}/` |
| `changelog` | `/changelog/` | `/changelog/{id}/` |
| `legal` | — | `/legal/{id}/` |
| `team` | `/team/` | `/team/{id}/` |
| `customers` | `/customers/` | `/customers/{id}/` |
| `helpcenter` | `/helpcenter/` | `/helpcenter/{id}/` |
| `integrations` | `/integrations/` | `/integrations/{id}/` |

Dynamic segments use **`[...slug].astro`** under those sections; **blog posts** also use **`[...slug]`** at `src/pages/blog/posts/[...slug].astro` (param still maps one segment per file id in practice).

**RSS:** `src/pages/rss.xml.js` → **`/rss.xml`** (standard Astro convention).

**Other notable routes:** `/` (marketing home), `/forms/login`, `/forms/signup`, `/forms/contact`, `/system/overview`, `/system/colors`, `/system/typography`, `/system/buttons`, `/system/links`, `/404`.

## Customization

- **Site URL / canonical / sitemap:** `PUBLIC_SITE_URL` (see `.env.example`) feeds `astro.config.mjs` `site`. Production domain: set `PUBLIC_SITE_URL`. Full key setup: **`docs/SETUP.md`**.
- **Brand colors & typography:** `src/styles/global.css` — `@theme` (OKLCH palette `accent`, `secondary`, `base`, `white`/`black`; `--font-sans` / Inter variable).
- **Shell / meta:** `src/layouts/BaseLayout.astro` imports global CSS and `src/components/fundations/head/BaseHead.astro` (`Seo`, `Meta`, `Fonts`, `Favicons`, plus `Fuse` / `KeenSlider` scripts).
- **Nav / footer:** `src/components/global/Navigation.astro`, `src/components/global/Footer.astro` (nav link list is inline in `Navigation.astro`).

## Commands

From README / `package.json`:

| Command | Action |
|--------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Astro dev server (`localhost:4321`) |
| `npm run build` | Production build → `./dist/` |
| `npm run preview` | Preview production build |
| `npm run netlify:dev` | Dev with Netlify env/functions |
| `npm run astro -- …` | Astro CLI |

## Guardrails

- Keep the **`fundations`** folder name as-is (intentional spelling in `src/components/fundations/`).
- **`src/content.config.ts`** has **no schemas**; widening or renaming frontmatter without updating **layouts** (`src/layouts/*.astro`) and **cards** will break builds at runtime.
- Prefer **minimal diffs** matching existing Lexington patterns (`@/` imports, `Wrapper` / `Text` / `Button` from fundations).
- Do not assume a **`public/`** directory exists here; static assets in use live under **`src/images/`** (and similar) for `astro:assets`.

---

*Optional:* `.pages.yml` (PagesCMS) is mentioned in README for optional CMS wiring — not required for build.

## Cursor Cloud specific instructions

- Setup: `npm install`, copy `.env.example` → `.env`, run `npm run dev`. See **`docs/SETUP.md`** for Supabase + Netlify keys.
- **Dev server port is `4321`** (Astro default). Browse at `http://localhost:4321/`. Health: `/api/health`.
- Site uses the **Netlify adapter**; most pages stay static. On-demand routes set `prerender = false`.
- **No lint/typecheck script is configured.** Use `npm run build` as the correctness check.
- Primary public content is **`/research/`** (blog routes redirect). Blog search component may still exist as leftover; prefer research SSR pages.
