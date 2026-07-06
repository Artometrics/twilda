# AGENTS.md — Ella Mae (`@lexington/ellamae`)

**Ella Mae** is a Lexington Themes Astro template for a **SaaS / product marketing** site: a long-form homepage with hero, feature sections, pricing, testimonials, FAQ, plus **blog**, **changelog**, **customers** (case studies), **help center**, **integrations**, **team**, **legal**, auth-style **forms**, and a **design system** area under `/system/`. Primary use case is shipping a polished marketing site with rich content-driven sections, not a minimal landing-only starter.

**Publisher:** [Lexington Themes](https://lexingtonthemes.com/)  
**Support / docs (from README):** [Support](https://lexingtonthemes.com/legal/support/) · [Documentation](https://lexingtonthemes.com/documentation/quick-start/) · [Get your bundle](https://lexingtonthemes.com)

## Tech stack

- **Astro** `^6.0.0` (`astro.config.mjs`)
- **Tailwind CSS** `^4.1.18` via **`@tailwindcss/vite`**; plugins: **`@tailwindcss/forms`**, **`@tailwindcss/typography`**, **`tailwind-scrollbar-hide`** (see `src/styles/global.css`)
- **MDX:** `@astrojs/mdx` `^5.0.0`
- **Sitemap:** `@astrojs/sitemap` `^3.7.1`
- **RSS:** `@astrojs/rss` `^4.0.17` (used by `src/pages/rss.xml.js`)
- **SEO component:** `@lexingtonthemes/seo` `^0.1.0` (see `src/components/fundations/head/Seo.astro`)
- **Markdown:** Shiki theme `night-owl`; `markdown.drafts: true` in config
- **Aliases:** `@/*` → `src/*` (`tsconfig.json`)

*Not in `package.json`:* nothing extra to list. (`zod` appears only as `vite.ssr.noExternal` in `astro.config.mjs`, not as a direct dependency.)

## Folder map

| Area | Path | Role |
|------|------|------|
| Routes | `src/pages/` | File-based routing; dynamic `[...slug].astro`, `blog/tags/[tag].astro`, `rss.xml.js` |
| Layouts | `src/layouts/` | `BaseLayout.astro`, section layouts (blog, legal, team, …) |
| UI | `src/components/` | `global/`, `fundations/`, `features/`, `blog/`, `pricing/`, etc. |
| Content | `src/content/` | Markdown (and MDX for posts) per collection subfolder |
| Tokens / global CSS | `src/styles/global.css` | Tailwind v4 `@theme`, fonts, colors, animations |
| Processed images | `src/images/` | Blog, team, changelog, brands, blobs, integrations, customers, assets |
| Public static root | `public/` | **Not present in this repo** (no top-level `public/` directory) |

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

- **Site URL / canonical / sitemap:** `site: 'https://yourdomain.com'` in `astro.config.mjs`. Align **`rss.xml.js`** `site` and **`Seo.astro`** (`@lexingtonthemes/seo` / `AstroSeo`) placeholders when going live.
- **Brand colors & typography:** `src/styles/global.css` — `@theme` (OKLCH palette `accent`, `secondary`, `base`, `white`/`black`; `--font-sans` / Inter variable).
- **Shell / meta:** `src/layouts/BaseLayout.astro` imports global CSS and `src/components/fundations/head/BaseHead.astro` (`Seo`, `Meta`, `Fonts`, `Favicons`, plus `Fuse` / `KeenSlider` scripts).
- **Nav / footer:** `src/components/global/Navigation.astro`, `src/components/global/Footer.astro` (nav link list is inline in `Navigation.astro`).

## Commands

From README / `package.json`:

| Command | Action |
|--------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server (README: `localhost:3000`) |
| `npm run build` | Production build → `./dist/` |
| `npm run preview` | Preview production build |
| `npm run astro -- …` | Astro CLI |

## Guardrails

- Keep the **`fundations`** folder name as-is (intentional spelling in `src/components/fundations/`).
- **`src/content.config.ts`** has **no schemas**; widening or renaming frontmatter without updating **layouts** (`src/layouts/*.astro`) and **cards** will break builds at runtime.
- Prefer **minimal diffs** matching existing Lexington patterns (`@/` imports, `Wrapper` / `Text` / `Button` from fundations).
- Do not assume a **`public/`** directory exists here; static assets in use live under **`src/images/`** (and similar) for `astro:assets`.

---

*Optional:* `.pages.yml` (PagesCMS) is mentioned in README for optional CMS wiring — not required for build.

## Cursor Cloud specific instructions

- This is a **static Astro site** (no backend, DB, or services). Setup is just `npm install`; run with `npm run dev`.
- **Dev server port is `4321`** (Astro default), not `3000` as the README/AGENTS `Commands` table states. Browse the running site at `http://localhost:4321/`.
- **No lint/typecheck script is configured.** `astro check` is not wired up and its deps (`@astrojs/check`, `typescript`) are not installed; running `npx astro check` triggers an interactive install prompt that hangs non-interactively. Use `npm run build` as the correctness check (it type-checks/renders all routes).
- Fuse.js live search lives on the **blog** (`src/components/blog/BlogSearch.astro`), reachable via the search icon on `/blog/`, not on the Help Center.
