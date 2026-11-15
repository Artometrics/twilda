# Phase 3: security hardening

Follows [phase2.md](phase2.md). No new features. This phase audits what the first three phases built against a hostile author, a hostile pull request, and a hostile page, fixes what it found, and adds tests and CI so it stays fixed. The architecture and the reasoning are in [security.md](security.md). The reporting policy is [SECURITY.md](../SECURITY.md).

## Findings fixed

| # | Finding | Fix | Checked by |
| --- | --- | --- | --- |
| 1 | The desk's CSP had `style-src 'self' 'unsafe-inline'`, `default-src 'self'`, `connect-src` including `https://github.com`, and `base-uri 'self'`. | `default-src 'none'`, `style-src 'self'`, `base-uri 'none'`, `connect-src 'self' https://api.github.com`, `media-src 'none'`, and every fetch directive listed. The desk's preview frame lost its inline `<style>` and now links `preview-frame.css`. | `tests/csp.test.ts`, `packages/editor/src/dist-csp.test.ts`, desk CSP browser test |
| 2 | No `frame-src` on the marketing site, so it fell back to `default-src 'self'`. Several headers were missing or thin on all targets (COOP, CORP, HSTS, X-Permitted-Cross-Domain-Policies, sensors in Permissions-Policy). | Added, with `frame-src 'none'` for the marketing site. | `tests/csp.test.ts`, `tests/boundaries.test.ts` |
| 3 | Production output could not be proven free of inline style and script. | `inlineStylesheets: "never"` and `assetsInlineLimit: 0` for the site and marketing builds. The built output of the site, marketing site, edit build, and desk is audited against the real policy. | `tests/dist-headers.test.ts`, `packages/editor/src/dist-csp.test.ts` |
| 4 | The edit build had no policy of its own. | `EDIT_CSP`, exported and applied to its dev and preview servers, and tested in a browser. | `tests/csp.test.ts`, `click-edit/e2e/csp.spec.ts` |
| 5 | An image `src` accepted `data:image/svg+xml`, which can carry script. | Raster data URLs only: PNG, JPEG, GIF, WebP, AVIF, base64. | `tests/security/links.test.ts`, `media.test.ts` |
| 6 | A site path accepted `..` and `.` segments, written plainly or percent-encoded. A browser resolves them, so the path that was stored was not the path that loaded. | `isSitePath` refuses dot segments. The renderer test corpus used one as its "bad image"; it now uses a path that is valid for the schema and unsafe for the renderer. | `tests/security/links.test.ts` |
| 7 | Link targets were checked by prefix (`/`, `https://`, `http://`). Tabs and newlines, backslashes (`/\host`), invisible characters, credentials, and punycode look-alike hosts got through the string check but not the browser's reading of it. | One rule in `packages/core/src/url.ts` used by the schema, marks, renderer, and embeds. Link text that is itself a web address but points elsewhere is refused as phishing. | `tests/security/links.test.ts`, `marks.test.ts` |
| 8 | Content JSON had no bounds. Deeply nested or very wide input reached zod (GHSA-mrhx-c7xc-m3w5). | `assertJsonBounds` before schema validation in `parseDocument`, `parseSite`, the content store, and the click-edit stores. | `tests/security/oversize.test.ts`, `pollution.test.ts` |
| 9 | `__proto__`, `constructor`, and `prototype` keys in a JSON file could reach merge, edit-path, and changed-reference code. | Refused when parsing, and guarded again in each of those functions. | `tests/security/pollution.test.ts` |
| 10 | Media names and uploads: a name could carry a separator or traversal, and a file's bytes were not checked against its extension. | `MEDIA_FILE_NAME`, `sniffImage`, `containsActiveContent`, `auditSvg`, a size cap, and the same checks in CI. | `tests/security/media.test.ts`, `hostile-pr.test.ts` |
| 11 | `GitHubBackend` accepted any API base, owner, repo, branch, and path, and sent the token with them. | The token goes only to `https://api.github.com` unless the caller sets `allowCustomApiBase`. Names, branches, and paths are validated so they cannot change the host or the endpoint. | `tests/security/token.test.ts` |
| 12 | `site.json` and public folders could be symlinks to files outside the repository. | `readSite` and the content audit refuse symlinks. Public folders accept an extension allowlist. | `tests/security/hostile-pr.test.ts`, `npm run check:content` |
| 13 | The token stayed in memory until the tab closed, and the masthead navigation printed `href` values from `site.json` without the link rule. | The desk and click-to-edit forget the token 30 minutes after it was pasted, on `pagehide`, and on sign-out. Navigation links pass the same rule as every other link, and an unsafe one becomes `#`. | `tests/security/token.test.ts`, `xss.test.ts` |
| 14 | CI had no declared token permissions, kept git credentials in the checkout, had no secret scan, and no audit. | `permissions: contents: read`, `persist-credentials: false`, `security.yml` with a content audit, secret scan, gitleaks, and an audit policy, plus Dependabot. | `tests/security/workflows.test.ts` |

## What was added

| Area | Files |
| --- | --- |
| Hostile-content suite | `tests/security/` (xss, links, marks, media, theme-css, pollution, oversize, hostile-pr, token, proxy, secrets, audit-policy, workflows) with shared fixtures in `tests/security/support.ts` |
| Header and output tests | `tests/csp.test.ts`, `tests/dist-headers.test.ts`, `tests/support/csp.ts`, `tests/support/dist.ts`, `packages/editor/src/dist-csp.test.ts` |
| Browser tests under the real policy | `packages/editor/e2e-csp/`, `packages/editor/playwright.csp.config.ts`, `click-edit/e2e/csp.spec.ts` |
| Checks you can run | `npm run check:content`, `npm run check:secrets`, `npm run check:audit` |
| CI | `.github/workflows/security.yml`, changes to `ci.yml`, `.github/dependabot.yml`, `.gitleaksignore`, `security/audit-allowlist.json` |
| Proxy reference | `examples/device-flow-proxy/` (`worker.ts` and a README). Not deployed, not imported by the build. |
| Docs | `SECURITY.md`, `docs/security.md`, this file |

## Running it

```
npm test                          # 360+ tests, including the hostile-content suite and built-output audits
npm run check:content && npm run check:secrets && npm run check:audit
cd packages/editor && npm test && npm run test:e2e && npm run test:e2e:csp
npm run test:e2e:edit
```

`tests/dist-headers.test.ts` builds the site, the edit build, and (when `www/node_modules` is present) the marketing site into temporary folders. Run `npm ci --prefix www` once to include it. CI does.

## Not done, on purpose

- No deploy script, no hosting change beyond the headers in `firebase.json`, no new adapter, and no change to the deploy workflows.
- No GitHub App, npm token, or paid review. See "Items that need the owner" in [security.md](security.md#items-that-need-the-owner).
- No major upgrades of Astro or zod in this phase. They were made afterwards (Astro 7, zod 4), which emptied the allowlist; see [security.md](security.md#accepted-advisories).
- No Trusted Types, no nonces. See [security.md](security.md#remaining-risks) for why and what would change that.
