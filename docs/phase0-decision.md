# Phase 0 decision: go, narrow, or switch

Date: 2026-11-15. Evidence: [phase0-click-edit.md](phase0-click-edit.md) (prototype, tests, blockers) and [phase0-bakeoff.md](phase0-bakeoff.md) (EmDash, TinaCMS, CloudCannon).

Status: the renderer decision (2) was carried out in [phase1.md](phase1.md). Auth (1) is unchanged: token paste by default, the optional proxy hook kept, no GitHub App yet.

## Recommendation: NARROW

Keep building Twilda, but only as **a static, git-native, no-database editor for prepared-section Astro sites that works from a phone**. Do not try to become a general CMS. Do not switch now.

## Why not "go" as originally framed

"Static, git-native CMS for Astro with visual editing" is not an empty field. The three rivals each already have click-on-the-page editing with the same technique the prototype used (an attribute per element that names its field). On breadth they are well ahead: rich text, an image picker, roles, plugins. Competing on features loses. The prototype proved that Twilda can do the editing, and it proved that editing is not the differentiator.

Two things the prototype found also stop an unqualified "go":

1. **"No server" is not literally achievable for sign-in.** GitHub's device-flow endpoints are not callable from a browser (no CORS). Without a proxy, the honest options are a pasted token, or one small stateless proxy. This decides what "no-server" means in the product, and the owner has to choose (see below).
2. **The renderer story is split.** `@twilda/core` `renderDocument` is browser-safe but is a preview renderer, not the site template, and the package root cannot be bundled for a browser because it pulls in `node:fs`. The real template is outside the package. "What you edit is what ships" needs one renderer.

## Why not "switch"

Each alternative fails at least one hard requirement from the brief:

| Option | Fails | Why it matters |
| --- | --- | --- |
| EmDash | Static output, git-native | It requires `output: "server"` and a database. Adopting it replaces the product, not just the editor. It is the best choice only if the owner drops "static" and "git". |
| TinaCMS | No-server (needs TinaCloud or a self-hosted API plus database), and its PR-per-edit workflow is paid on TinaCloud | It is the closest match and the most credible fallback. Apache-2.0, git-native, Astro-aware. |
| CloudCannon | Open source, no paid services | Proprietary and paid. Useful only as a benchmark. |

Twilda keeps a real position: a static site, git as the only store, no accounts or database to run, Apache-2.0, a phone-first desk, and prepared section types that stop an editor from wrecking a layout. Nothing else in the bake-off has that exact combination. It is a narrow position, but a coherent one.

## What "narrow" means

In scope for Phase 1:

- One edit target for a Twilda site (`astro.edit.config.ts` pattern), with a single shared renderer that has an `annotate` mode.
- Text and image editing on prepared sections, plus add, remove, and reorder on the page.
- Owner or collaborator publishing as a pull request, from a phone.
- Draft on the device, publish as a PR, merge is the decision.

Out of scope: rich text beyond plain and a short list of inline marks, user accounts, roles, plugins, a hosted service, a database, free-form layout, and any competition with EmDash or Tina on general content modeling.

## Decisions needed from the owner

1. **Auth.** Choose one: (a) token paste only, which is truly no-server and clunky on a phone; (b) a stateless CORS proxy for device flow, such as a free Cloudflare Worker with about 20 lines and no secrets, which is nicer and adds one deployed piece; or (c) both, with the proxy optional. My pick is (c), using a GitHub App (per-repo permissions and expiring tokens) rather than an OAuth App with `repo` scope. Note `PUBLIC_TWILDA_GITHUB_CLIENT_ID` was not readable from this run, so device flow against GitHub was not exercised.
2. **Renderer.** Promote `src/render/document.ts` into the package as the one renderer, split the Node-only `loadContentTree` into its own entry, and retire the preview renderer or make it a thin wrapper. This is a contract-adjacent change and needs a note per `docs/architecture.md`.
3. **Who edits.** Owner and collaborators only (what the prototype supports), or also people without push access (needs a fork-and-PR path).

## Kill criteria for Phase 1

Switch (most likely to TinaCMS if "no server" can bend, or to EmDash if "static" and "git" can bend) if any of these hold at the next gate:

- Editing is not usable on a real iPhone (Safari) and a real Android phone. The prototype was only tested in emulated Chromium, so this is the largest unknown and the first thing to check.
- Auth cannot be made acceptable on a phone with the owner's chosen constraint.
- Generalizing beyond Twilda's own renderer (annotating a user's own Astro components) needs a server, or needs a large amount of per-site integration work that Tina and CloudCannon already provide.
- Phase 1 spends more effort matching rival features than on the narrow position above.

## Confidence and caveats

- Confident: the technique works on static Astro with no editor code in production (output is byte-identical to `main`), and the schema validation, local draft, and PR publish flow works end to end against a mocked GitHub.
- Not verified: real GitHub sign-in, real iOS and Android, image upload, conflicts with a moved `main`, anything with articles.
- The bake-off is from documentation, not hands-on use. It could be wrong about details of the rivals, mainly their mobile behavior, which no source documents.
