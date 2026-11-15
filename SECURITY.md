# Security policy

Twilda is a static, git-native CMS. There is no Twilda server, no database, and no Twilda-run account system, so most of what could go wrong is in three places: the content files a pull request can change, the browser pages that render and edit them, and the GitHub token a person pastes into the desk. [docs/security.md](docs/security.md) is the full architecture and trust-boundary write-up. This file is the short policy.

## Reporting a vulnerability

Please report privately. Do not open a public issue or pull request that describes the problem.

1. Use GitHub's private reporting: on the repository page choose **Security**, then **Report a vulnerability**.
2. If that button is not there (the owner has to switch it on in repository settings), open a public issue titled "Security contact request" with **no details** and ask for a private channel. A maintainer will reply with one.

Please include: what you found, the smallest steps or file that shows it, the commit or version, and what you think an attacker gains. A working proof of concept is welcome and not required.

What to expect:

| Step | Target |
| --- | --- |
| Acknowledge your report | 3 working days |
| First assessment (accepted, needs more, or not a vulnerability) | 7 days |
| Fix or mitigation for a confirmed high or critical issue | 30 days |
| Public advisory and credit, if you want credit | After the fix is released |

This is a small open-source project with one maintainer's attention, so these are goals and not a contract. If a deadline slips you will be told why.

### In scope

- Script execution or markup injection in the published site, the desk, or the edit build, through any content field, link, image, embed, theme value, or uploaded file.
- A way to make Twilda read, write, or publish outside what its prepared types allow: path traversal in media or content paths, prototype pollution, a draft that publishes without the separate publish step.
- Anything that stores, logs, sends, or exposes a GitHub token other than to `api.github.com` (or the configured device-flow proxy), including in the reference proxy.
- A weakening of the response headers or Content-Security-Policy in `firebase.json` that the tests in `tests/csp.test.ts` and `tests/dist-headers.test.ts` do not catch.
- CI or workflow changes that would let a fork's pull request reach a secret or a deploy credential.

### Out of scope

- Findings that need an attacker who can already merge to `main`, or who already controls the reader's browser or the owner's GitHub account.
- Problems in GitHub, Firebase Hosting, or a browser themselves. Report those upstream.
- Denial of service by sending a very large request to a static host.
- Advisories already listed in `security/audit-allowlist.json` with a written reason, unless you can show that the reason is wrong. That is in scope and valuable.
- Missing headers on a hosting target that this repository does not configure.
- Social engineering of maintainers or users.

## Safe harbor

If you act in good faith, stay within your own accounts and test repositories, do not read or change anyone else's data, and give a reasonable time to fix, we will not pursue legal action and will say so publicly if asked. Do not run tests against `twilda.com` or any live site that is not yours.

## Supported versions

Twilda is pre-1.0. Only the current `main` branch is supported. `@twilda/core` and `@twilda/astro` are at 0.1.0 and are not published to npm from this repository yet. When they are, only the latest 0.x release will receive fixes, and a fix will land on `main` first.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Any earlier commit, branch, or fork | No |
| The retired Expo novel workspace (commits through `106b96f`, see [HISTORY.md](HISTORY.md)) | No. It is history. |

## Threat model in one paragraph

The things Twilda defends: a reader of the published site, a person using the desk, and the maintainer reviewing a pull request. The attackers it plans for: an author or contributor who writes hostile content (a pull request with a crafted `draft.json`, image, or `site.json`), a hostile page or extension that tries to reach the desk's token, a link in content that tries to send a reader somewhere else, and a compromised or careless dependency. The attackers it does not plan for: someone with write access to `main`, someone with the maintainer's GitHub account, and a malicious browser. Read [docs/security.md](docs/security.md) for the controls, the boundaries, and the risks that remain.

## Checks that run on every pull request

- `tests/security/` (hostile-content suite), `tests/csp.test.ts`, `tests/dist-headers.test.ts`, and `packages/editor/src/dist-csp.test.ts` run in CI.
- `.github/workflows/security.yml`: content and public-file audit, a secret scan of the tree, gitleaks over full history, and `npm audit` evaluated against a reviewed allowlist. It also runs weekly.
- `.github/dependabot.yml` opens update pull requests for npm and GitHub Actions.
