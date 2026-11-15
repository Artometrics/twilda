import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRESETS, PRESET_IDS, serializeDocument, serializeSite, siteCsp, starterDocuments, starterSite, type PresetId, type SiteSettings, type TwildaDocument } from "@twilda/core";

/**
 * One generator for every starter. `examples/starter-<mode>/` is its output with `kind: "example"`,
 * and `create-twilda` writes the same files with `kind: "project"`. Content comes from the preset
 * in `@twilda/core`, so a starter can never drift from what the desk's mode picker applies.
 */

export type StarterFiles = Map<string, string>;

export interface StarterOptions {
  /** Package name written to package.json. */
  name: string;
  /** How `@twilda/core` and `@twilda/astro` are named in package.json. */
  packages: { core: string; astro: string };
}

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const STARTER_ASTRO = "^7.4.12";
const FONTS = { "@fontsource/newsreader": "^5.2.8", "@fontsource/public-sans": "^5.2.5" };

export function starterDir(id: PresetId): string {
  return path.join(REPO, "examples", `starter-${id}`);
}

/** Dependencies for a starter that lives in this repository: relative `file:` links to the packages. */
export function repoPackages(): StarterOptions["packages"] {
  return { core: "file:../../packages/core", astro: "file:../../packages/astro" };
}

/** Dependencies for a project scaffolded elsewhere from a checkout: absolute `file:` links. Nothing is published. */
export function checkoutPackages(): StarterOptions["packages"] {
  return { core: `file:${path.join(REPO, "packages", "core")}`, astro: `file:${path.join(REPO, "packages", "astro")}` };
}

/** Dependencies once the packages are on npm. */
export function registryPackages(): StarterOptions["packages"] {
  return { core: "^0.1.0", astro: "^0.1.0" };
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

function documentFiles(id: PresetId): StarterFiles {
  const files: StarterFiles = new Map();
  for (const doc of starterDocuments(id)) {
    const published = { ...doc, status: "published" } as TwildaDocument;
    const draft = { ...doc, status: "draft" } as TwildaDocument;
    files.set(`content/${doc.id}/draft.json`, serializeDocument(draft));
    files.set(`content/${doc.id}/published.json`, serializeDocument(published));
  }
  return files;
}

function favicon(id: PresetId): string {
  const { colors } = PRESETS[id].theme;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${colors.paper}"/>
  <rect x="6" y="6" width="20" height="4" fill="${colors.ink}"/>
  <rect x="6" y="14" width="12" height="12" fill="${colors.kicker}"/>
</svg>
`;
}

/**
 * The headers the repository's own site is served with, minus the ones that only make sense for a noindex demo.
 * With `forSite`, the Content-Security-Policy is the one that site needs: shut tight, or opened to its one form
 * address when `forSite.forms` is set (see `siteCsp`).
 */
export function recommendedHeaders(forSite?: Pick<SiteSettings, "forms"> | null): Array<{ key: string; value: string }> {
  const config = JSON.parse(fs.readFileSync(path.join(REPO, "firebase.json"), "utf8")) as {
    hosting: Array<{ site?: string; headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> }>;
  };
  const site = config.hosting.find((entry) => entry.site === "twilda-510519");
  const all = site?.headers.find((entry) => entry.source === "**")?.headers ?? [];
  return all
    .filter((header) => !["X-Robots-Tag", "Cache-Control"].includes(header.key))
    .map((header) => (header.key === "Content-Security-Policy" && forSite !== undefined ? { key: header.key, value: siteCsp(forSite) } : header));
}

const BASE_LAYOUT = `---
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/600.css";
import "@twilda/core/magazine.css";
import { loadSite, themeCss } from "twilda:content";

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
const themed = themeCss(loadSite().theme) !== "";
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    {themed ? <link rel="stylesheet" href="/theme.css" /> : null}
    <meta name="generator" content={Astro.generator} />
  </head>
  <body>
    <slot />
  </body>
</html>

<style is:global>
  html,
  body {
    margin: 0;
    background: var(--site-paper, #f3efe4);
  }
</style>
`;

const INDEX_PAGE = `---
import Base from "../layouts/Base.astro";
import { loadPublished, loadSite, renderDocument, renderOptionsFor } from "twilda:content";

const site = loadSite();
const home = loadPublished().pages.find((page) => page.id === "home");
if (!home) throw new Error("content/home/published.json is missing. The static site reads published files only.");
const html = renderDocument(home, renderOptionsFor(site, home));
---

<Base title={\`\${home.title} · \${site.chrome.name}\`} description={home.dek}>
  <Fragment set:html={html} />
</Base>
`;

const ARTICLE_PAGE = `---
import Base from "../../layouts/Base.astro";
import { loadPublished, loadSite, renderDocument, renderOptionsFor } from "twilda:content";

export function getStaticPaths() {
  return loadPublished().articles.map((article) => ({ params: { slug: article.slug }, props: { id: article.id } }));
}

const { id } = Astro.props;
const site = loadSite();
const article = loadPublished().articles.find((entry) => entry.id === id);
if (!article) throw new Error(\`Published article "\${id}" disappeared during the build.\`);
const html = renderDocument(article, renderOptionsFor(site, article));
---

<Base title={\`\${article.title} · \${site.chrome.name}\`} description={article.dek}>
  <Fragment set:html={html} />
</Base>
`;

const NOT_FOUND = `---
import Base from "../layouts/Base.astro";
import { loadSite } from "twilda:content";

const site = loadSite();
---

<Base title={\`Not found · \${site.chrome.name}\`} description="That page does not exist.">
  <div class="magazine">
    <header class="issue-intro">
      <p class="kicker">404</p>
      <h1>Page not found</h1>
      <p><a class="more" href="/">Back to the home page</a></p>
    </header>
  </div>
</Base>
`;

const FORMS_ROUTE = `import type { APIRoute, GetStaticPaths } from "astro";
import { FORMS_CLIENT_JS } from "@twilda/core";
import { loadSite } from "twilda:content";

// The one script a form page loads. It is built only when content/site.json has a "forms" setting,
// so a site with no form ships no script at all.
export const getStaticPaths: GetStaticPaths = () => (loadSite().forms ? [{ params: { asset: "twilda-forms" } }] : []);

export const GET: APIRoute = () =>
  new Response(FORMS_CLIENT_JS, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
`;

const THEME_ROUTE = `import type { APIRoute } from "astro";
import { loadSite, themeCss } from "twilda:content";

export const GET: APIRoute = () =>
  new Response(themeCss(loadSite().theme), { headers: { "Content-Type": "text/css; charset=utf-8" } });
`;

const ASTRO_CONFIG = `import { defineConfig } from "astro/config";
import { twilda } from "@twilda/astro";

/**
 * Fully static output, no adapter. The build never inlines a stylesheet or a small asset,
 * so the site works under a Content-Security-Policy with style-src 'self' and script-src 'none'.
 */
export default defineConfig({
  output: "static",
  integrations: [twilda({ contentDir: "./content" })],
  build: { inlineStylesheets: "never" },
  vite: { build: { assetsInlineLimit: 0 } },
});
`;

function readme(id: PresetId, kind: "example" | "project", name: string): string {
  const preset = PRESETS[id];
  const docs = starterDocuments(id);
  const site = starterSite(id);
  const hasForm = site.forms !== undefined;
  const headers = recommendedHeaders(site);
  const run =
    kind === "example"
      ? `From the root of the Twilda repository (Node.js 22.23.4 or newer):

\`\`\`bash
npm install
npm run starter:dev -- ${id}      # http://127.0.0.1:4321
npm run starter:build -- ${id}    # writes examples/starter-${id}/dist
\`\`\`

To start your own project from this starter instead, run \`npm run create:twilda -- ../my-site --mode ${id}\`.`
      : `Node.js 22.23.4 or newer:

\`\`\`bash
npm install
npm run dev        # http://127.0.0.1:4321
npm run build      # writes dist/
npm run preview
\`\`\``;
  return `# ${kind === "example" ? `Twilda starter: ${preset.label}` : name}

${preset.tagline} ${preset.audience}

This is a working Astro site wired to Twilda. It is fully static (\`output: "static"\`, no adapter, ${hasForm ? "one small script only on pages with the form, " : "no script on the page, "}no database). Content is JSON in \`content/\`, and the page is drawn by one renderer from prepared sections.

## Quickstart

${run}

The build reads \`content/<id>/published.json\` only. A draft never reaches the site.

## What you get

- Mode: **${preset.label}** (\`"mode": "${id}"\` in \`content/site.json\`). The mode picks the section library, the theme tokens, and the masthead.
- Sections you can add: ${preset.sections.join(", ")}.
- Article blocks you can add: ${preset.blocks.join(", ")}.
- Pages: ${docs.map((doc) => `\`${doc.kind === "page" ? "/" : `/articles/${doc.slug}`}\` (${doc.id})`).join(", ")}.
- All sample content is fictional.

## Edit it

1. **By hand.** Change the text in \`content/<id>/published.json\`. \`npm run build\` validates every file against the Twilda schema and stops with the field name if something is wrong. Edit \`draft.json\` too if you use the desk.
2. **With the Twilda desk.** The desk reads and writes this same layout (\`content/<id>/draft.json\`, \`published.json\`, \`public/media/\`) through your GitHub repository and publishes as a pull request. Saving a draft and publishing stay separate.
3. **Change the mode.** In the desk, open Theme and pick another mode, or edit \`content/site.json\` and copy the theme and masthead from the preset. Existing sections stay valid in every mode.

${
    hasForm
      ? `## Forms

The ${preset.label.toLowerCase()} starter has a form section. Twilda stores nothing a visitor types: the form posts to the address in \`forms.endpoint\` in \`content/site.json\`.

1. Make a form with a service (Formspree, Basin, Netlify Forms, a Zapier or Make webhook, and others) and copy its address.
2. Replace the placeholder \`${site.forms?.endpoint}\` with it. It must start with \`https://\`.
3. Serve the Content-Security-Policy under "Before you launch". It lists only that address. If you change the address, rebuild the header: \`npx tsx scripts/site-headers.ts content\` in a Twilda checkout prints it.
4. Read \`docs/forms-and-crm.md\` in the Twilda repository for each service, and for what to turn on to catch spam.

`
      : ""
  }## Layout

| Path | What it is |
| --- | --- |
| \`content/site.json\` | Mode, theme tokens, masthead and footer |
| \`content/<id>/draft.json\`, \`published.json\` | One document: a page (sections) or an article (blocks) |
| \`public/media/\` | Plates and photos. A page may print only files from this folder |
| \`src/pages/\` | Three small Astro pages that call \`renderDocument\` |
| \`astro.config.ts\` | \`output: "static"\` and no inlined styles |

## Before you launch

- [ ] Replace the fictional text and plates, and the name and links in \`content/site.json\`.
- [ ] Set \`site\` in \`astro.config.ts\` if you want a sitemap or absolute URLs.
- [ ] Serve \`dist/\` with security headers. ${hasForm ? "The page needs no inline script and no inline style, and the policy below opens only your form address (see Forms above), so it works as is:" : "The page needs no script and no inline style, so this policy works as is:"}

\`\`\`
${headers.map((header) => `${header.key}: ${header.value}`).join("\n")}
\`\`\`

- [ ] The sample content is not meant to be indexed. Remove it first, then decide on \`robots.txt\` (the one here allows crawlers).

## Rules the starter keeps

Keep \`output: "static"\` and add no adapter. Do not inline styles or scripts. Links in content must be site paths, \`https://\` addresses, or a plain \`mailto:\`. There is no form: the lead-gen call to action links to a form or booking page you host elsewhere.
`;
}

export function starterFiles(id: PresetId, kind: "example" | "project", options: StarterOptions): StarterFiles {
  const files: StarterFiles = new Map();
  files.set(
    "package.json",
    json({
      name: options.name,
      version: "0.1.0",
      private: true,
      type: "module",
      engines: { node: ">=22.23.4" },
      scripts: { dev: "astro dev --host 127.0.0.1 --port 4321", build: "astro build", preview: "astro preview --host 127.0.0.1 --port 4321" },
      dependencies: { "@twilda/astro": options.packages.astro, "@twilda/core": options.packages.core, astro: STARTER_ASTRO, ...FONTS },
    }),
  );
  files.set("astro.config.ts", ASTRO_CONFIG);
  files.set("tsconfig.json", json({ extends: "astro/tsconfigs/strict", include: [".astro/types.d.ts", "**/*"], exclude: ["dist"] }));
  files.set(".gitignore", "node_modules/\ndist/\n.astro/\n.DS_Store\n*.log\n");
  files.set("src/env.d.ts", '/// <reference types="astro/client" />\n/// <reference types="@twilda/astro/client" />\n');
  files.set("src/layouts/Base.astro", BASE_LAYOUT);
  files.set("src/pages/index.astro", INDEX_PAGE);
  files.set("src/pages/articles/[slug].astro", ARTICLE_PAGE);
  files.set("src/pages/404.astro", NOT_FOUND);
  files.set("src/pages/theme.css.ts", THEME_ROUTE);
  files.set("src/pages/[asset].js.ts", FORMS_ROUTE);
  files.set("public/favicon.svg", favicon(id));
  files.set("public/robots.txt", "User-agent: *\nAllow: /\n");
  const media = path.join(REPO, "public", "media");
  for (const name of fs.readdirSync(media).sort()) {
    if (/^plate-[a-z]+\.svg$/.test(name)) files.set(`public/media/${name}`, fs.readFileSync(path.join(media, name), "utf8"));
  }
  files.set("content/site.json", serializeSite(starterSite(id)));
  for (const [file, text] of documentFiles(id)) files.set(file, text);
  files.set("README.md", readme(id, kind, options.name));
  return files;
}

export function exampleFiles(id: PresetId): StarterFiles {
  return starterFiles(id, "example", { name: `twilda-starter-${id}`, packages: repoPackages() });
}

/** Write a starter's files under `dir`. Refuses to overwrite anything. */
export function writeFiles(dir: string, files: StarterFiles, options: { overwrite?: boolean } = {}): void {
  for (const file of files.keys()) {
    const target = path.join(dir, file);
    if (!options.overwrite && fs.existsSync(target)) throw new Error(`${file} already exists in ${dir}. Nothing was written.`);
  }
  for (const [file, text] of files) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, "utf8");
  }
}

export { PRESET_IDS };
