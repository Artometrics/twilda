# Host the phone demo

`npm run build:demo` writes a self-contained folder:

```text
demo-dist/index.html          the editor (needs JavaScript)
demo-dist/preview/            published sample site (no script tags)
```

The editor's published-preview button renders from the browser store. `demo-dist/preview` is the sample as built. Tapping Publish does not rebuild that folder.

Serve `demo-dist/` as a static site on a new project. Do not deploy it to the production Twilda site, `twilda-510519`, `artometrics-510519`, or artometrics.com. This repo has no `firebase.json` and no deploy script. `npm run check:static` fails if those files appear at the repo root.

Firebase Hosting can serve the folder. The Spark tier is a no-cost option; look up the current quota in the Firebase console before relying on it. This note does not record a quota. Use a project you create for the demo. Set the public directory to `demo-dist`. Do not add the project id to this repository.

The editor origin must allow its own scripts. The Field Desk production build does not include this editor. If the live Twilda host sends a Content-Security-Policy of `script-src 'none'`, that header belongs on the production site only. It was not rechecked from this repo, and it would blank the demo editor.

GitHub sign-in is optional and off until you create an OAuth App or a fine-grained personal access token. Put the client id in the editor form. Do not commit the client id, the token, or a client secret. The token is kept in the tab's memory.

Local check:

```bash
npm run build:demo
npx vite preview --config apps/demo-editor/vite.config.ts --host 127.0.0.1 --port 4175
```

Open `http://127.0.0.1:4175` at a narrow window. The sample site is under `/preview/`.
