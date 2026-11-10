# Host the phone demo

`npm run build:demo` writes a self-contained folder:

```text
demo-dist/index.html          the editor (needs JavaScript)
demo-dist/preview/            published sample site (no script tags)
```

The editor's published-preview button renders from the browser store. `demo-dist/preview` is the sample as built. Tapping Publish does not rebuild that folder.

Serve `demo-dist/` as a static site on a new project. Do not deploy it to the production Twilda site, `twilda-510519`, `artometrics-510519`, or artometrics.com. `firebase.json` in this repo points Firebase Hosting at `dist/` only, with `script-src 'none'`. There is no deploy script. Do not change that file to publish `demo-dist/`.

Firebase Hosting can serve the demo folder from a project you create for it. The Spark tier is a no-cost option; look up the current quota in the Firebase console before relying on it. This note does not record a quota. Set the public directory to `demo-dist`. Do not add that new project id to this repository.

The editor origin must allow its own scripts. The Field Desk production CSP would blank this page.

GitHub sign-in is optional and off until you create an OAuth App or a fine-grained personal access token. Put the client id in the editor form. Do not commit the client id, the token, or a client secret. The token is kept in the tab's memory.

Local check:

```bash
npm run build:demo
npx vite preview --config apps/demo-editor/vite.config.ts --host 127.0.0.1 --port 4175
```

Open `http://127.0.0.1:4175` at a narrow window. The sample site is under `/preview/`.
