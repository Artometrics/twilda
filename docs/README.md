# Docs

Twilda has two editors. They do not share a process.

| Doc | What it decides |
| --- | --- |
| [architecture.md](architecture.md) | Files the static build reads, drafts versus publish, the phone editor, auth, and open questions |
| [franchise-slice.md](franchise-slice.md) | How the public Franchise article maps onto blocks, what is left out, and how to test it off production |
| [content-model.md](content-model.md) | The localhost desk already in `src/schema/sections.ts` |
| [phone-drafting-audit.md](phone-drafting-audit.md) | Audit of drafting an article from a phone, what was added, and the export format |
| [editor.md](editor.md) | The phone desk in `packages/editor` |
| [demo-hosting.md](demo-hosting.md) | How to build `demo-dist/` and host it on a new static site |

The production site is still `npm run build`. Output is `dist/`. The phone demo is `npm run build:demo`. Output is `demo-dist/`. Do not point either build at an existing Artometrics or Twilda hosting project.
