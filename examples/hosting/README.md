# Hosting the static build

`npm run build` writes a static site to `dist/`. That folder can be uploaded to any static host. This repository does not do that upload.

There is no `npm run deploy`. There is no `netlify.toml`, `firebase.json`, or `.firebaserc`. Do not add a project id for `twilda-510519` or `artometrics-510519`, and do not point a hosting CLI at those projects from this repo. Those names belong to the previous product and to Artometrics. See [HISTORY.md](../../HISTORY.md).

An inert reminder, not a config file a CLI will pick up:

```text
publish directory: dist
project id: example-only-do-not-deploy
rewrites: none required for this demo (Astro emits real HTML files)
```

If you later host the demo yourself, do it on a new project that you create for that purpose.
