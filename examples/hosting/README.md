# Hosting the static build

`npm run build` writes a static site to `dist/`. `firebase.json` points Firebase Hosting at that folder for site `twilda-510519` and sets the response headers, including `X-Robots-Tag: noindex`. A second hosting entry serves the phone desk from `packages/editor/dist` on site `twilda-desk-510519`. `/desk` on the magazine site redirects there. A third entry is target `www` → site `twilda-landing`, public `www/dist` (the marketing site). `.firebaserc` names the same project and the `www` target mapping. Neither file holds a credential.

There is no `npm run deploy` and no `netlify.toml`. Do not add a deploy script, and do not point a hosting CLI at `artometrics-510519`. See [HISTORY.md](../../HISTORY.md).

The header set assumes the built HTML has no `<script>` tags and no inline styles. Hashed files under `/_astro/` are cached as immutable. Every other response is revalidated. Astro emits real HTML files, so the config has no rewrites.
