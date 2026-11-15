# Phase 5: forms and CRM hand-off

Follows [phase4.md](phase4.md). Phase 5 lets a Twilda page **collect** something (an enquiry, a lead, a newsletter address) without turning Twilda into a server or a database. It adds one prepared **Form** section, one `site.json` setting for where submissions go, a per-site Content-Security-Policy that opens that one address and nothing else, a tiny same-origin script, and an **optional, separate** receiver template. Every earlier guarantee is kept. The person's guide is [forms-and-crm.md](forms-and-crm.md).

## Decisions

| Decision | Why |
| --- | --- |
| Integrate only. Twilda stores no lead data. | A CMS that keeps personal data becomes a data processor, needs a database, accounts and a breach plan. The form service already is one. |
| One address for the whole site, in `site.json`, not in a section. | The policy is per site (headers are per host), so the allowed address must be a site fact the build and the headers share. A section could not widen the policy for itself. |
| `https` only, parsed to an origin, never wildcards. | The host goes into `form-action` and `connect-src`. The origin is rebuilt from the parsed URL, so no character in the address can end a directive. |
| Default is fully shut. | No `forms` setting means `form-action 'none'`, `connect-src 'none'`, `script-src 'none'`: the exact policy `firebase.json` pins and `tests/csp.test.ts` checks. |
| A live form is a real `<form method="post">` with an `action`. | It works with JavaScript off. The script only adds validation and a nicer answer. |
| Two modes, `fetch` and `post`. | Many automation webhooks cannot be read by a browser (no CORS). `post` works with anything and keeps `connect-src 'none'`. |
| The preview is always inert. | The desk, the click-to-edit build and the starters' edit builds render with `preview: true`: the fieldset is disabled, there is no `action` and no script. A draft can never post by accident. |
| The receiver is a separate package that core never imports. | Owning the receiving end is useful but optional, and it brings platform code (Workers, Firebase) that a static site should not carry. |

## What changed for the contract

An additive change to `@twilda/core`. A document or `site.json` that was valid before is valid and prints the same (renderer golden files are unchanged).

| Change | Detail |
| --- | --- |
| New page section `form` | `id`, `kicker`, `heading`, `intro`, `variant` (`contact`, `lead`, `newsletter`), `fields` (1 to 8 of `name`, `email`, `phone`, `company`, `message`, `text`, `consent`), `submitLabel`, `successTitle`, `successText`, `errorText`, `privacy`. Field ids are unique, and a form needs a required email or phone field. |
| New optional `site.json` field | `forms`: `{ endpoint, mode, format, hidden }`. Strict. |
| New helpers | `siteCsp(site)`, `usesForms`, `formsOrigin`, `checkFormEndpoint`, `validateSubmission`, `createFormSection`, `previewOptionsFor`, `FORM_*` constants. |
| Renderer options | `forms` (live only when valid) and `preview` (always inert). Both default off, so a plain render is inert. |
| Static files | `/twilda-forms.js`, written by the starter generator (`src/pages/[asset].js.ts`) and emitted only when `site.forms` is set. |
| Scripts | `npm run check:forms [dir] [--strict]`, `npm run headers -- <contentDir> [--json]`. |

`CONTRACT_VERSION` is unchanged for the same reason as Phase 4.

## The form section

- Printed by the one renderer as `section.form-section.form-<variant>` with a `.form-card`. Every label is a `<label for>`; every hint and error is wired with `aria-describedby`; invalid fields get `aria-invalid`; the summary is `role="alert"`; success is `role="status"`; failure is `role="alert"`.
- Inputs are at least 44 px tall, font 16 px or more (iOS does not zoom), and the layout is checked at 320, 390 and 1280 px.
- Live markup uses `data-tf*` attributes only. `data-twilda*` still never appears in published output.
- The honeypot (`_hp`) is a 1 px, transparent, off-tab, `aria-hidden` field. It is not positioned off-screen, because the starters' layout test treats an element past the viewport edge as a bug.
- Presets: the corporate and lead-generation libraries offer **Form**; the corporate home template starts with a contact form and the lead-generation landing page with a lead form. The lead-generation hero button points at it (`/#join`). The magazine library does not offer it, and a form still renders and edits in any mode.

## The script

`packages/core/src/forms-client.ts` is a plain string (about 6 KB) served as a file. It runs only on `form[data-tf]`, does nothing else on the page, and has no dependencies.

- Validates with the same rules as `validateSubmission` (limits, one-line fields, safe email, phone, consent). A test runs both over one corpus in a `vm` and requires agreement.
- Honeypot filled: shows the success message and sends nothing. Time trap (under 1.5 s): "press the button again".
- `fetch` mode: one `fetch(form.action, ...)` with `credentials: "omit"`, `referrerPolicy: "no-referrer"`, `Accept: application/json`; the body is urlencoded or flat JSON. `post` mode: adds `_elapsed_ms` and `_page`, then `form.submit()`.
- Never reads cookies or storage, never evaluates strings, never touches `innerHTML`.

## The policy

`siteCsp(site)` starts from the pinned policy and changes exactly three directives when `site.forms` is valid:

| Directive | No form | With a form |
| --- | --- | --- |
| `form-action` | `'none'` | `<origin>` |
| `script-src` | `'none'` | `'self'` |
| `connect-src` | `'none'` | `<origin>` in `fetch` mode, `'none'` in `post` mode |

`tests/forms.test.ts` proves the no-form policy equals `firebase.json` byte for byte and that the form policy differs in only those directives. `tests/support/csp.ts policyProblems` is told the one allowed origin and still rejects wildcards, `http:`, bare `https:`, `unsafe-*`, and any second origin. The starters' README and `npm run headers` print the policy; the desk's **Theme → Forms** card shows it. `firebase.json` itself is unchanged: the Twilda demo site has no form.

## Desk

- **Add a section → Form** (corporate and lead-generation libraries). A **Start from** control switches the kind. A new `choice` field kind draws a `<select>` from the field list in core.
- **Theme → Forms** takes the address. It is checked with `checkFormEndpoint` as you type; an invalid one shows the rule it broke and is **not saved**. It also edits mode, format and fixed fields, and shows the header the host must send.
- Previews are inert (`previewOptionsFor`).

## Tests added

| Where | What |
| --- | --- |
| `tests/forms.test.ts` | Section and site schema, address recipes, CSP derivation and equality with `firebase.json`, render and accessibility wiring, annotate parity, submissions, script-vs-validator parity, `check:forms`. |
| `tests/security/forms-hostile.test.ts` | 33 hostile addresses, origin invariants, XSS in every string field (live, inert, annotated), hidden-field abuse, oversize, email header injection, one-line fields, prototype keys, spam signals. |
| `tests/support/dist.ts` | The built-output audit of every `<form>` (post, action allowed by `form-action`, no `target`, no file input) and the one allowed script. |
| `tests/e2e-starters` | At 320, 390 and 1280 px under the production policy (as each starter sends it): layout, targets, labels, empty submit, too fast, good submit payload, honeypot, failure and retry, the policy blocking other hosts, and the no-JavaScript post. |
| `packages/editor/e2e/phase5.spec.ts` | The desk: add and edit a form, kind switch, hostile labels, address checking, the header it shows. |
| `packages/leads-inbox/test` | Receiver abuse, inbox escaping and CSV guard, stores, adapters, parity with core. |

Screenshots are in `docs/screenshots/phase5-*.png`.

## What this phase does not do

- It does not deploy, host, or pay for anything, and it does not change `firebase.json` or any workflow's permissions.
- It does not send email or call a CRM. A form posts to a service you chose.
- It has no CAPTCHA. A third-party script would break the default policy; see [forms-and-crm.md](forms-and-crm.md#spam-and-robots).
- It does not verify third-party service behavior (marked **[verify]** in the recipes).
- No file uploads from visitors. The generated pages carry no file input, and the build audit rejects one.
- The desk's `iphone` end-to-end project uses WebKit, which could not start on the box this was built on (missing system libraries and no root package install). It runs in CI (`desk` job). Everything else, including the starters at 320, 390 and 1280 px, ran in Chromium here.
