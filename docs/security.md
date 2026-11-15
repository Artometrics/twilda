# Security

How Twilda is built to resist hostile content and protect the one secret it ever touches, what each control is checked by, and what is left. [SECURITY.md](../SECURITY.md) has the reporting policy.

## What is being protected

| Asset | Who needs it kept safe | Where it lives |
| --- | --- | --- |
| The reader's browser session on the published site | Readers | `dist/` on Firebase Hosting |
| The desk user's GitHub token | The person signed in to the desk | Browser memory, for as long as the tab is signed in |
| The repository's `main` branch | The owner | GitHub |
| The deploy credential | The owner | GitHub Actions (Workload Identity Federation), never in the tree |

Twilda has no server and no database. That removes most of the usual attack surface and puts the weight on two things: **everything that can be written into a content file is untrusted**, and **the pages that show it must stay inert**.

## Architecture and trust boundaries

```
 author / contributor                           reader
        |                                          ^
        v                                          |
  desk (browser) --token--> api.github.com   Firebase Hosting (dist/, static)
        |                         |                ^
        |  branch + pull request  v                |  astro build (published.json only)
        +---------------------> GitHub repo -------+
                                   |
                              review + merge  <-- the human gate
```

| Boundary | Trusted side | Untrusted side | What stands at the boundary |
| --- | --- | --- | --- |
| B1. Content files into the build | The Astro build and `@twilda/core` | `content/**/*.json`, `public/**`, `site.json`: anything a pull request can change | Structural JSON bounds, zod schema, link and media rules, theme closed lists, escaped renderer, CI content audit, human review |
| B2. Rendered HTML into the browser | The browser's origin | Text, links, embeds, and images from content | One renderer (`renderDocument`) that escapes every string and prints only prepared block types, plus a CSP that would stop script even if markup got through |
| B3. Uploaded files into `public/media` | The site's origin | Image bytes and file names from the desk | Re-encode to JPEG in the browser, magic-byte sniffing, polyglot and SVG audit, strict name pattern, size cap, CI audit of `public/` |
| B4. Desk page into GitHub | `api.github.com` | The desk's own JavaScript, extensions, injected markup | CSP `connect-src 'self' https://api.github.com`, token only in the `Authorization` header, fixed API origin |
| B5. Pull request into CI | Workflow secrets | Fork and branch code | No `pull_request_target`, read-only token in CI, hosting previews only for same-repo branches |
| B6. Draft into publish | `published.json` and the live site | `draft.json` | Separate files. Saving writes the draft. Publishing opens a pull request. Merging it is the publish decision. |

### Where `main` is the gate

Nothing a contributor does in the desk reaches the live site without a merge. A hostile `draft.json` in a pull request is dangerous only if it is merged, and the checks below exist so that the reviewer has the answer before merging. A merged hostile file is still rendered inertly (B1, B2).

## Controls, by threat

### Script and markup injection (XSS)

- One renderer prints everything. Every string goes through an escape function. Block types are a closed list in `packages/core/src/schema.ts`. There is no raw HTML block, no `dangerouslySetInnerHTML` of content, and no markdown-to-HTML library that accepts inline HTML. Inline marks (`bold`, `italic`, `link`, `code`) are parsed by `marks.ts` into a fixed set of tags.
- Every URL passes `url.ts`. A target must be a site path or an `http(s)` address with a host, no credentials, and none of whitespace, control and invisible characters, quotes, angle brackets, or backslash. `javascript:`, `data:`, `vbscript:`, `blob:`, `file:`, protocol-relative `//host`, `/\host`, and tab-split schemes are all refused. Hosts with a punycode label (`xn--`) are refused, because a look-alike domain is written that way. Link text that looks like an address but differs from its target is treated as phishing and refused.
- Embeds are YouTube and Vimeo only. The player URL is rebuilt from a validated video id on a fixed `youtube-nocookie.com` or `player.vimeo.com` origin, and the iframe carries a `sandbox` attribute and a `referrerpolicy`. The embed string in content is never printed.
- Images in documents are a repo path under `/media/<name>` or a raster `data:image/(png|jpeg|gif|webp);base64,` URL. SVG in a data URL is refused (a finding fixed in Phase 3).
- Theme settings are two closed font lists and six six-digit hex colors. A theme value is never concatenated into CSS. CSS custom properties are written from the validated list only.
- Tests: `tests/security/xss.test.ts` (a payload in every string field of every block and section type), `marks.test.ts`, `links.test.ts`, `theme-css.test.ts`.

### Content-Security-Policy and headers

Headers for the three hosting targets live in `firebase.json`. All start from `default-src 'none'` and list what is allowed.

| Target | Script | Style | Images | Connect | Frames |
| --- | --- | --- | --- | --- | --- |
| Site (`twilda-510519`) | none | `'self'` | `'self'` | none | YouTube no-cookie, Vimeo |
| Marketing (`www`, site `twilda-landing`) | none | `'self'` | `'self'` | none | none |
| Desk (`twilda-desk`) | `'self'` | `'self'` | `'self' data: blob:` | `'self' https://api.github.com` | `'self'`, YouTube no-cookie, Vimeo |

All three also set `base-uri 'none'`, `form-action 'none'`, `frame-ancestors 'none'`, `object-src 'none'`, `media-src 'none'`, `upgrade-insecure-requests`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, COOP and CORP `same-origin`, HSTS for a year (no `preload`: that is a one-way door and is the owner's call), a Permissions-Policy that denies camera, microphone, geolocation, payment, USB, serial, Bluetooth, sensors, and FLoC, and `X-Robots-Tag: noindex`.

There is no `unsafe-inline`, `unsafe-eval`, `*`, `http:`, or bare `https:` in any policy. There are no nonces or hashes either, on purpose: a static host cannot issue a fresh nonce per response, and a fixed nonce is not a nonce. The way to hold `style-src 'self'` and `script-src 'none'` with no inline code is to build without any: Astro is set to `build.inlineStylesheets: "never"` and `assetsInlineLimit: 0` (site and marketing), the desk's preview frame is a static HTML file with a linked stylesheet, and the edit build's JSON data blocks are `type="application/json"` (data, not script) with `<` escaped.

How it is checked:

- `tests/csp.test.ts` parses `firebase.json` and `EDIT_CSP` and fails on any weakening: a changed source list, an unsafe keyword, a wildcard, a missing header.
- `tests/dist-headers.test.ts` runs `astro build` for the site, the marketing site, and the edit build, then audits the actual output against the policy that host sends: no inline script or style, no `on*=` handler, no `javascript:`, no `<base>` or `<form>`, no `<meta http-equiv>`, every stylesheet and image same-origin, every iframe on the allowlist, `noindex` on every page, and no source map or dotfile in the folder.
- `packages/editor/src/dist-csp.test.ts` builds the desk and does the same.
- Browser tests run the desk (`packages/editor/e2e-csp`, `npm run test:e2e:csp`) and the click-to-edit build (`click-edit/e2e/csp.spec.ts`) under the real policy in WebKit and Chromium and fail on any CSP violation, including on tapping, typing, uploading, and publishing against a fake GitHub.

The dev server cannot carry the production policy (Vite's hot-reload client injects inline script). The preview server and the tests do.

### Hostile files from a pull request

`tests/security/hostile-pr.test.ts` and `scripts/check-content.ts` (`npm run check:content`, run in CI) take the stance that a pull request's files are an attack:

- JSON with `__proto__`, `constructor`, or `prototype` keys is refused at every level. `JSON.parse` makes `__proto__` an own key, so the merge, edit-path, and changed-reference code have their own guards as well.
- Structural bounds are checked before schema validation: depth 24, 50,000 nodes, 2,000 array items, 500 object keys, and a byte cap. These also contain the zod denial-of-service advisory (see below) cheaply.
- Public folders accept an extension allowlist only. Symlinks are refused, in content, `site.json`, and `public/`. Raster files must match their extension by magic bytes and contain no markup. SVGs are audited: no script, handler, `foreignObject`, external reference, or `data:` URL.
- File names in media must match `^[a-z0-9][a-z0-9-]{0,78}\.(svg|jpg|png|webp|gif)$`. A name with a slash, dot-dot, backslash, or encoded traversal is refused when the desk builds the pull request, and again by the CI audit.

### The token

The only credential Twilda touches is a GitHub token the person pastes or obtains by device flow. The review (`tests/security/token.test.ts`) found and now enforces:

| Rule | How it holds |
| --- | --- |
| In memory only | The token is React component state or a closure. It is never put in `localStorage`, `sessionStorage`, IndexedDB, a cookie, the URL, `postMessage`, or the service worker. A test scans shipped client code for those APIs near a token. The desk's browser test (`packages/editor/e2e/phase1.spec.ts`) asserts storage holds no token after sign-in. |
| Never logged | No `console.*` call in shipped code. Errors from GitHub or the network are rewritten into short messages that carry no request headers, and a test checks that a token planted in an error never appears in what the page shows. |
| Never persisted | Drafts are persisted, and the token is not part of any saved structure. The exports (ZIP, MDX) are built from the document alone and take no token. |
| Cleared | On sign-out, 30 minutes after it was pasted, and when the page is hidden. Token inputs are masked and opt out of autofill and spellcheck. |
| Sent only to GitHub | `GitHubBackend` fixes the API origin to `https://api.github.com` and refuses another origin unless the caller opts in. Owner, repo, branch, and path values are validated so they cannot change the host or smuggle a path. The CSP independently limits `connect-src`. |
| Publish never merges | Publishing creates a branch, writes files, and opens a pull request. It never calls the merge endpoint. A test fails if it does. |

#### Scopes and least privilege

| Route | What to grant | Notes |
| --- | --- | --- |
| Fine-grained personal access token (recommended) | One repository. **Contents: read and write**, **Pull requests: read and write**. Nothing else. Set an expiry of days or weeks. | This is what the desk needs to create a branch, write files, and open a pull request. It cannot reach other repositories. |
| Device flow with an OAuth App | Classic `repo` scope, or `public_repo` for a public repository. | `repo` reads and writes **every** repository the person can access. Prefer the fine-grained token until the GitHub App route exists. |
| GitHub App (not built; owner item) | Install on one repository with Contents and Pull requests only. User-to-server tokens expire in hours. | The right long-term answer. It needs an owner-created App, so it is listed below and not done here. |
| No token | Nothing | Drafts and exports stay on the device. |

Tips: use a separate GitHub account or a bot for a shared desk. Protect `main` with a branch rule that requires review so that a leaked write token still cannot publish by itself. Revoke the token in GitHub settings if a device is lost. Branch protection and required review are repository settings the owner controls, and Twilda does not change them.

A token in memory is still readable by script running in the desk's origin. That is why the desk's CSP forbids inline script and every outside script and why dependency changes are reviewed.

#### Proxy reference

The device flow needs a proxy because github.com sends no CORS headers. `examples/device-flow-proxy/` is a reference for the smallest safe one: stateless (no KV, no Durable Object, no cache), silent (no logging), one client id, one allowed origin, two paths, bodies under 2 KB, a fixed scope, a whitelist of response fields, and `Cache-Control: no-store`. It needs no client secret. `tests/security/proxy.test.ts` checks each of those, including that a wildcard origin is refused. Read its [README](../examples/device-flow-proxy/README.md) before hosting one. The desk's `connect-src` must be edited to name the proxy, which is a deliberate extra step.

### Secrets and dependencies

- `npm run check:secrets` scans every tracked and untracked-but-not-ignored file for vendor-shaped secrets (GitHub, npm, AWS, Google, Slack, Stripe, and SendGrid tokens, private keys and service-account keys, JWTs, credentials inside URLs, and assigned `secret =` values), and for key and environment files by name. An example or placeholder value is skipped. `twilda-secret-allow` on a line is a reviewed opt-out. Test fixtures that look like tokens are built at run time, so the tree itself stays clean.
- CI runs gitleaks over the full git history as well (`.github/workflows/security.yml`). Two old placeholder fingerprints from the retired Supabase setup are recorded in `.gitleaksignore`. They are not real credentials.
- No `.env` is needed or tracked. `.firebaserc` holds project ids only, and a test checks that.
- `npm run check:audit` runs `npm audit` in the root, `www/`, and `packages/editor/` and fails on a new high or critical advisory. Advisories that cannot be fixed without a breaking upgrade are listed in `security/audit-allowlist.json`, each with the advisory id, package, a reason of at least 40 characters, and a `reviewBy` date. An expired entry fails the check, so an exception cannot be forgotten. A stale entry (the advisory is gone) is reported.

#### Accepted advisories

| Package | Advisory | Why it is accepted for now |
| --- | --- | --- |
| astro 5.x | GHSA-26w7-cxv4-gfx2 (critical), GHSA-2pvr-wf23-7pc7, GHSA-8hv8-536x-4wqp | The first needs Astro's image service to process an untrusted AVIF. Twilda uses no `astro:assets` and no image endpoint. The other two affect server rendering or request-derived slot names. Twilda is `output: "static"` with no adapter. The fix is Astro 7 (Node 22.23 or later), a major upgrade that changes the `@twilda/astro` peer range. |
| sharp | GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, GHSA-wq5f-xc86-pv6w | Only present as Astro's optional image service. Nothing calls it. |
| zod 3.x | GHSA-mrhx-c7xc-m3w5 | A denial of service on crafted input. The structural bounds above run first, so deeply nested or huge input never reaches zod. The fix is zod 4, which changes the published API. |

All seven entries are due for review on 2027-02-15. Upgrading Astro and zod is a decision for the owner, because it changes what `@twilda/astro` promises its users.

### Workflows

`tests/security/workflows.test.ts` fails on: `pull_request_target`, `workflow_run`, or comment triggers; a workflow with no declared `permissions`; write scopes outside the three hosting workflows; outsider-controlled expressions (`github.event.pull_request.title`, `head_ref`, and similar) inside a `run:` step; secrets echoed in a shell step; third-party actions outside `actions/`, `google-github-actions/`, and `FirebaseExtended/` that are not pinned to a commit; and CI or the security workflow touching hosting. CI and security workflows have a read-only token and do not persist git credentials. Hosting previews run only for branches in this repository, and live deploys only on a push to `main`.

## What Twilda does and does not protect

Twilda does:

- Keep published content inert: no script, no inline style, no outside asset, no framing.
- Refuse unsafe links and media at write time, at build time, and in CI.
- Hold the token in memory only and send it to `api.github.com` only.
- Keep draft and published apart, and leave the merge to a person.
- Give the reviewer an automated first pass over a pull request's files.

Twilda does not:

- Protect against someone who can merge to `main`, or who holds the maintainer's GitHub or Firebase accounts.
- Authenticate readers or authors. Access to the desk is access to the static page. What an author can do is bounded by their GitHub token, not by Twilda.
- Hide drafts. A draft on a branch in a public repository is public.
- Defend a browser that is itself compromised, or a token that its owner pastes into the wrong site.
- Scan the content of text for libel, spam, or misleading claims. It checks structure and safety, not editorial.
- Make a hosting provider's own failures safe.

## Remaining risks

| Risk | Why it remains | What would reduce it |
| --- | --- | --- |
| Astro, zod, and sharp advisories are allowlisted | Fixes are major upgrades that change the peer range and published API | Astro 7 and zod 4 behind a planned major release |
| `firebase-deploy*.yml` previews build pull-request code in the job that holds the Workload Identity credential (same-repo branches only) | Merging the build and deploy jobs is how the preview action is documented | Split into an unprivileged build job that uploads an artifact and a privileged deploy job that only deploys it |
| Token in memory is readable by script in the desk origin | A browser cannot hide a secret from its own page | The CSP and review. A GitHub App with short-lived tokens. A server-side exchange is a different product. |
| Device flow `repo` scope is broad | GitHub OAuth Apps have no narrower write scope for private repositories | GitHub App migration (owner) |
| `GitHubBackend.mergePullRequest` exists | It is inside the token's pull-request write scope and the desk never calls it | Remove it if no feature needs it, and require review in branch protection |
| Trusted Types are not enabled | The click-to-edit overlay (`packages/core/src/edit/overlay.ts`) and the dev-only `editor/` preview set `innerHTML` from escaped renderer output. These are few code paths, covered by the XSS tests, and `require-trusted-types-for` would need a policy for each | Add a Trusted Types policy around the renderer output and enforce it |
| Desk `img-src data: blob:` | Needed to show an upload before it is committed. Images are inert in a browser, and uploads are re-encoded | Serve previews from a worker or accept a narrower preview |
| Link look-alikes are refused by design | Internationalised domain names written in punycode cannot be linked | Maintain an owner-reviewed allowlist if one is needed |
| The renderer prints an external `https` link as `#` in some contexts | A safe default, and a product limitation | Decide the policy for external links, then add them to the renderer and tests |
| Not verified on real devices or against real GitHub | Tests use WebKit and Chromium emulation and a fake GitHub | A manual run on an iPhone, and one real pull request |
| The proxy origin must be added to the desk `connect-src` by hand | A static header cannot know the deployer's proxy | Document the change, and update `tests/csp.test.ts` with it |
| Two historic gitleaks findings | Placeholder text in old CI history. History is not rewritten | None needed. They are recorded in `.gitleaksignore` with a reason. |

## Items that need the owner

None of these are created or changed by this work.

1. **GitHub App migration.** Create a GitHub App (Contents and Pull requests, installed on one repository, device flow enabled) to replace the OAuth App `repo` scope, and decide how its client id is supplied to the desk.
2. **npm publish token.** If `@twilda/core` and `@twilda/astro` are to be published, create an npm automation token or trusted publisher, and add it as a repository secret. Use provenance. Do not add a publish script to this repository without the owner's decision on it.
3. **Optional paid outside review.** An independent review or penetration test of the desk and the build, once the Astro and zod upgrades are decided.
4. **Settings only an owner can change** (small, no cost): enable private vulnerability reporting, enable Dependabot alerts, and protect `main` with required review and required status checks (`CI`, `Security`).

## Reproducing the checks

```
npm test                 # unit, hostile-content, header, and built-output tests
npm run check:content    # audit content and public folders
npm run check:secrets    # scan the tree for secrets
npm run check:audit      # npm audit against security/audit-allowlist.json (needs network)
cd packages/editor && npm test && npm run test:e2e:csp
npm run test:e2e:edit
```
