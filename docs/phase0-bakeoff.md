# Phase 0 bake-off: Twilda, EmDash, TinaCMS, CloudCannon

Date: 2026-11-15.

Method: public documentation and repositories only, read on this date. Nothing was installed, nothing was signed up for, and no paid service was used. CloudCannon is paid and was read from its docs and pricing page only. Twilda's column is from this repository and the Phase 0 prototype ([phase0-click-edit.md](phase0-click-edit.md)). Anything I could not confirm from a source is marked "not verified". Competitors move quickly (EmDash was created on 2026-04-01 and was at 1.3 by 2026-10-15), so treat this as a snapshot.

## Summary table

| | Twilda (today) | EmDash | TinaCMS | CloudCannon |
| --- | --- | --- | --- | --- |
| **Visual editing** | Prototype: click text or image on the real page, plain text and image swap, one page. The phone desk adds block reorder. No rich text. | Inline editing on public pages for authenticated editors: rich text (TipTap), images from the media library, saves drafts. The on-page image picker does not upload. | Click-to-edit through `data-tina-field`, with the form in a sidebar next to an iframe of the real page. Live preview as you type. | Visual Editor over a built preview, with "editable regions" (text, image, source, array, component) marked by `data-editable`. |
| **Astro fit** | Own integration and renderer. The site template is Twilda's string renderer, not arbitrary Astro components. | Native: an Astro integration, live content collections, typed content from the schema. | `@tinacms/astro` (integration, `TinaMarkdown`, `TinaIsland`). Docs say an SSR adapter is needed for the per-island refresh endpoint. | Documented Astro guide. `data-editable="source"` writes into `.astro` files. Framework-agnostic otherwise. |
| **Static, no server** | Yes. `output: "static"`, no adapter. Production has no editor code. But publishing by device flow needs a CORS proxy (see below). | No. `output: "server"` and an adapter are required. Content is read at request time. "No `getStaticPaths` for CMS content." A prerendered page cannot show later edits until a rebuild. | The site can be static. Editing needs a backend: TinaCloud, or a self-hosted API function plus a database. Visual editing on Astro leans on SSR per the docs. | The site you publish can be static. Editing, builds, and (optionally) hosting run on CloudCannon's servers. |
| **Git-native** | Yes. JSON in the repo, drafts and publishes as PRs. | No. Schema and content live in D1 or SQLite, and media in R2, S3, or disk. (Portable Text JSON, but not in git.) | Yes. Markdown and JSON in the repo. The database is an index and cache. | Yes. Connects GitHub, GitLab, or Bitbucket and commits through its UI. |
| **Mobile editing** | Phone desk tested at 390px. Click-edit prototype tested in Chromium emulating a 390px touch device. Not tested on real iOS or Android. | Passkeys work on phones per the auth docs. Mobile admin or inline editing: not verified. | Not documented, not verified. | Not documented, not verified (not tried, since it is paid). |
| **Security** | No server, no database, no accounts, so a small surface. The token is in tab memory. Device flow needs a proxy. `repo` OAuth scope is broad. An XSS in the edit page can read the token. | Passkey-first auth, roles (Subscriber to Admin), sandboxed plugins (Worker isolates). A real server, database, sessions, and API to run and patch. | Self-hosted: you own auth, database, and a GitHub PAT held by the backend. TinaCloud: Tina holds access. | SaaS holds repository access and builds. SSO/SAML is Enterprise. Details of its security posture: not reviewed. |
| **License** | Apache-2.0 | MIT | Apache-2.0, except `@tinacms/datalayer` and `@tinacms/graphql`, which have a separate license (not reviewed) | Proprietary SaaS. Paid plans, with a 21-day trial. |
| **Cost** | None. | Free software. Cloudflare Workers, D1, and R2 for the hosted path, or any Node host with SQLite. | TinaCloud Free: 2 users, 100 GB bandwidth. Team: $290 per project per year (listed $24 or $29 a month, the pricing page and the blog disagree). Self-hosted: infrastructure. | Standard $55 a month ($49 annual), 3 users. Team $350 a month ($300 annual), adds branching workflows. |

## Notes by criterion

### Visual editing

All three competitors have solved the hard part Twilda only prototyped: rich text, links, and an image picker on the page.

- EmDash 1.3 (2026-10-15) has a toolbar on the page, a slash menu, and an image picker over the media library. Its visual editing "saves replace the pending draft revision".
- Tina's model is the closest to Twilda's: an attribute on an element ties it to a field. Tina outlines those elements in edit mode, as the prototype does.
- CloudCannon's `data-editable` plus `data-prop` and `data-path` is the same idea again.

So the pattern Twilda tested (a ref attribute per element, an overlay, edit in place) is not novel. It is the industry pattern. Twilda's version is smaller and has fewer features.

### Astro fit

EmDash is the most native: it is an Astro integration and the whole app is an Astro app. Twilda's click-edit works because Field Desk's template is a pure function from document to HTML string, which can run in the browser. That is a fit for Twilda's prepared sections. It is not a fit for "any Astro component", which is what the other three offer by marking up the user's own markup. Twilda's generic answer would be to annotate during the user's own Astro build and patch the DOM by ref (see [phase0-click-edit.md](phase0-click-edit.md)), which Phase 0 did not test.

### Static, no server

This is where Twilda and EmDash are opposite. EmDash's own docs say pages must be server-rendered, and its content is in a database. If "static and no server" is a hard requirement, EmDash fails it by design.

Tina and CloudCannon let the published site be static, but production editing needs their backend. Twilda has no backend at all, with one catch from the prototype: GitHub's device-flow endpoints send no CORS headers, so a browser cannot sign in with device flow without a proxy. Another git-backed Astro CMS, `@codeyam/cms`, documents the same constraint: its zero-infrastructure path is pasting a token, and its "Sign in with GitHub" needs a deployed auth worker. So "no server" is strictly true only with token sign-in. A stateless proxy would give a nicer sign-in at the cost of one deployed component.

### Git-native

Twilda, Tina, and CloudCannon are git-native. Twilda's edits arrive as pull requests, so review and rollback are plain git. Tina's equivalent (branch and PR per edit) is the "Editorial Workflow", which is on paid TinaCloud plans, and I did not find it in the self-hosted docs. CloudCannon's branching workflow is on the Team plan. EmDash keeps its own revision history in its database.

### Mobile editing

This is the least verified row for everyone, and the one that matters most to Twilda's pitch. EmDash documents mobile passkeys, which is sign-in, not editing. Tina and CloudCannon do not document phone editing. The only direct evidence in this bake-off is Twilda's own, and that is emulated Chromium. A fair statement is that nobody has shown it works well, and Twilda has the best chance of making that its differentiator because the desk was designed at 390px.

### Security

A static site with no server and no accounts has the smallest attack surface of the four. The costs are in the editor: a token in a browser, a broad OAuth scope, and no server-side check that an edit is legitimate beyond GitHub's own permissions and the PR review. EmDash is the opposite: the most capable (roles, passkeys, plugin sandboxing) and the most to operate. Tina self-hosted puts a PAT in your backend. CloudCannon holds your repository access as a vendor.

### License

Twilda (Apache-2.0), EmDash (MIT), and Tina (Apache-2.0, with a separate license on two data-layer packages) are all usable and forkable. CloudCannon is proprietary. Its client-side editable-region markup is not a lock-in in the sense that the attributes are inert HTML, but the editor is not available without the service.

## What this says about positioning

- EmDash is a different product: a WordPress-style, database-backed CMS on Astro. If the goal were "a CMS with an admin, users, plugins, and inline editing", adopting EmDash would beat building. The cost is giving up static output and git as the store.
- Tina is the closest rival to what Twilda wants to be. It is git-native, Apache-2.0, and Astro-aware, with click-to-edit. Its weaknesses against Twilda's brief are the backend and data layer, SSR leaning for Astro visual editing, and the paywalled PR workflow.
- CloudCannon is the polished commercial answer to the same idea, and the benchmark for the visual editor. It is closed and paid.

Twilda's defensible ground, from the table: static output with no server, git as the only store, Apache-2.0, prepared section types instead of a free canvas, and a phone-first desk. Its gaps are everything about breadth: rich text, uploads, plugin or component generality, multi-user roles, and real mobile verification.

## Sources (read 2026-11-15)

- EmDash: github.com/emdash-cms/emdash (MIT, created 2026-04-01), emdashcms.com/blog/emdash-1-3, docs.emdashcms.com (configuration and authentication guides), developers.cloudflare.com/workers/framework-guides/web-apps/emdash, and the `concepts/architecture.mdx` and `skills/building-emdash-site/SKILL.md` files in the repo for the server-rendering requirement.
- TinaCMS: tina.io/docs/contextual-editing/astro, tina.io/docs/contextual-editing/tinafield, tina.io/docs/self-hosted/overview, tina.io/docs/tinacloud/editorial-workflow, tina.io/pricing, tina.io/blog/tinacloud-pricing-changes, and the repository LICENSE.
- CloudCannon: cloudcannon.com/pricing, cloudcannon.com/astro-cms, docs.astro.build/en/guides/cms/cloudcannon, and cloudcannon.com/documentation (editable regions, visually edit text). Docs only. No account was created.
- `@codeyam/cms` on npm, as a point of comparison for the sign-in constraint.
- Twilda's GitHub CORS finding is from `curl` against `github.com/login/device/code`, `github.com/login/oauth/access_token`, and `api.github.com`, run on 2026-11-15.
