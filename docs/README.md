# Docs

Twilda has two editors. They do not share a process.

| Doc | What it decides |
| --- | --- |
| [architecture.md](architecture.md) | Files the static build reads, drafts versus publish, the phone editor, auth, and open questions |
| [franchise-slice.md](franchise-slice.md) | How the public Franchise article maps onto blocks, what is left out, and how to test it off production |
| [content-model.md](content-model.md) | Article blocks and page sections from `@twilda/core` |
| [phone-drafting-audit.md](phone-drafting-audit.md) | Audit of drafting an article from a phone, what was added, and the export format |
| [editor.md](editor.md) | The phone desk in `packages/editor` |
| [demo-hosting.md](demo-hosting.md) | How to build `demo-dist/` and host it on a new static site |
| [phase0-click-edit.md](phase0-click-edit.md) | Phase 0 click-on-the-page prototype: how it works, how to run it, `renderDocument` in the browser, blockers |
| [phase0-bakeoff.md](phase0-bakeoff.md) | Twilda against EmDash, TinaCMS, and CloudCannon |
| [phase0-decision.md](phase0-decision.md) | Go, narrow, or switch, and why |
| [phase1.md](phase1.md) | The single renderer, the drafting dashboard and page view, the design refresh, and auth scope limits |

The production site is still `npm run build`. Output is `dist/`. The phone demo is `npm run build:demo`. Output is `demo-dist/`. Do not point either build at an existing Artometrics or Twilda hosting project.
