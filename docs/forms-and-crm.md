# Forms and your CRM

Twilda has one prepared **Form** section with three kinds (contact, lead, newsletter). It is an integration point, not a database. **Twilda stores no lead data and runs no server.** When a visitor presses the button, their browser sends what they typed to one https address that you chose, and that service keeps it.

This page is for the person setting a form up. [phase5.md](phase5.md) is the design record, and [security.md](security.md) is the threat model.

## The five-minute setup

1. In the desk, open a page, **Add a section → Form**, and pick the kind (contact, lead, newsletter). Edit the wording and the fields like any other section.
2. Open **Theme → Forms** and paste the address your form service gave you. It must start with `https://`. The desk checks it with the same rule the build uses and does not save a half-typed or unsafe one.
3. Copy the **security header** the card shows into your host's headers (or run `npm run headers -- content` for the same text). It opens exactly one address.
4. `npm run check:forms` before you publish. It fails if a published form has no address, and warns (fails with `--strict`) if an address is set but no form uses it, or if it is still the starter's placeholder.
5. Send yourself a test submission from the live page.

Without step 2 a form prints but cannot send, the site's policy stays `form-action 'none'; connect-src 'none'`, and no script is loaded.

## What a form is

| Kind | Fields it starts with | Use it for |
| --- | --- | --- |
| `contact` | name, email, message | an enquiry on a company site |
| `lead` | name, email, phone, company | a lead-generation page; the hero button can point at it (`/#join`) |
| `newsletter` | email, consent | a mailing-list sign-up |

A form has 1 to 8 fields. Each field has a **kind** (name, email, phone, company, message, text, consent), a label, an optional hint, and a required switch. A form must have a required email or phone field, so a lead can always be answered. The desk's **Start from** control replaces the fields and wording with another kind's set.

## What gets sent

A submission is the visible fields by name (`name`, `email`, `phone`, `company`, `message`, `text`, `consent`; a second field of one kind is `email_2`, and so on) plus:

| Name | Meaning |
| --- | --- |
| `_form` | the section id, so one address can serve several forms |
| `_page` | the page address the form was on (JavaScript only) |
| `_elapsed_ms` | milliseconds between the page opening and the press (JavaScript only) |
| your `hidden` fields | up to five fixed `name=value` pairs from `site.json` (a campaign tag, a form-service key) |

`_hp` is the honeypot. It is never sent: a person cannot see it, a robot fills it, and a filled one is dropped on the page.

Two settings in `site.json` shape the request. Both are in **Theme → Forms**.

```json
{
  "forms": {
    "endpoint": "https://formspree.io/f/your-form-id",
    "mode": "fetch",
    "format": "form",
    "hidden": { "source": "website" }
  }
}
```

| Setting | Values | Effect |
| --- | --- | --- |
| `mode: "fetch"` (default) | the page sends the form in the background and shows a thank-you without leaving | The service must answer the browser (see CORS below). The policy opens `form-action` and `connect-src` to the address. |
| `mode: "post"` | an ordinary form post; the browser goes to the service, which shows its own page | Works with any service. The policy opens `form-action` only; `connect-src` stays `'none'`. |
| `format: "form"` (default) | `application/x-www-form-urlencoded` | What nearly every service takes. |
| `format: "json"` | a flat JSON object | Only with `mode: "fetch"`. Only for a service that takes flat JSON. |

**CORS.** In `fetch` mode a browser only lets the page read the answer if the service sends `Access-Control-Allow-Origin` for your site. Form services built for websites do. A raw automation webhook often does not. If the page shows the failure message when the service did get the message, switch to `mode: "post"`.

## The address rules

The address is checked when you save it, when the site is built, and again when the page is printed. It must be:

- `https://`, nothing else. No `http:`, `javascript:`, `data:`, `mailto:`, protocol-relative `//`, or `ftp:`.
- a host name: no IP address, no `localhost`, no `.local` or `.internal`, no user name or password (`@`), no port that is not plain digits, no punycode (`xn--`) label.
- at most 300 characters, with none of `; , * ' " < > \`, no whitespace or control character, no `#` fragment, and no percent-encoded control.

Why so strict: the host of this address is pasted into the page's Content-Security-Policy. A character that is harmless in a URL (`;` or `,`) would end a directive or start a new one. The policy is built from the parsed origin, never from your text.

## Recipes

Each recipe names the one thing to paste and the one thing to check. **[verify]** marks behavior of a third-party service that this repository cannot test. Services change; read their current documentation and send one real test before you launch.

### Formspree

- Address: `https://formspree.io/f/<your form id>`.
- `mode: "fetch"`, `format: "form"`. Formspree documents background submission when the request asks for JSON, which Twilda's request does. [verify]
- Policy it needs: `form-action https://formspree.io; connect-src https://formspree.io`.
- Formspree has its own spam filter and plan limits. [verify]

### Basin

- Address: `https://usebasin.com/f/<your form id>`.
- `mode: "fetch"`, `format: "form"`; Basin documents background submission with a JSON Accept header. [verify] If the page cannot read the answer, use `mode: "post"` and set Basin's thank-you redirect.
- Policy: `form-action https://usebasin.com; connect-src https://usebasin.com`.

### Netlify Forms

- Only if the site is on Netlify. Netlify finds forms by reading the built HTML for `data-netlify`, and Twilda's markup does not carry that attribute, so a one-time companion file is needed. [verify]
- Add `public/forms.html` to your project with a hidden skeleton form that names the same fields:

  ```html
  <form name="enquiry" data-netlify="true" hidden>
    <input name="name"><input name="email"><textarea name="message"></textarea>
  </form>
  ```

  (`enquiry` is the section id.) Set the address to your own site, for example `https://example.com/forms.html`, and add the hidden field `form-name` = `enquiry` in **Theme → Forms**.
- `mode: "post"` is the safest choice here. Netlify answers with its own thank-you page.
- Policy: `form-action https://example.com` (your own origin, written out, never `'self'`, so the same rule applies everywhere).

### Zapier catch hook

- Address: the **Catch Hook** URL, `https://hooks.zapier.com/hooks/catch/<account>/<hook>/`.
- Use `mode: "post"`. Zapier's catch hooks answer a plain post but are not built to be read by a browser page (no CORS), and the visitor sees a small confirmation. [verify] If you want your own thank-you page, put the hook behind a function you own (see the [leads inbox](../packages/leads-inbox/README.md)).
- Each field arrives as a named value you can map in a Zap.
- Policy: `form-action https://hooks.zapier.com`.

### Make (Integromat) webhook

- Address: the **Custom webhook** URL from a Make scenario, `https://hook.<region>.make.com/<token>`.
- `mode: "post"` for the same reason. [verify]
- Policy: `form-action https://hook.eu1.make.com` (your region's host, exactly as Make gives it).

### HubSpot forms

- HubSpot's public submission API takes a different JSON shape (`{ "fields": [{ "name": ..., "value": ... }] }`) than Twilda's flat one, so Twilda does not post to it directly. [verify]
- Two honest routes: send the form to **Zapier or Make** and use the HubSpot "create or update contact" step, or use the [leads inbox](../packages/leads-inbox/README.md) and forward from your own function with HubSpot's API.
- Do not paste a HubSpot **private app token** anywhere in a Twilda site. It would be public.

### Airtable

- Airtable can receive a webhook through an automation ("When webhook received") and then create a record. [verify]
- Use `mode: "post"` with that webhook address, or send through Make or Zapier with an "Airtable: Create record" step.
- Never put an Airtable personal access token in the page or in `hidden`: a secret in `site.json` is public.

### Google Sheets

- Route through **Make or Zapier** ("Add row") or through Airtable.
- A Google **Apps Script web app** is not supported: its address redirects to a second origin (`script.googleusercontent.com`), and Twilda's policy opens one origin only.

### Your own inbox

[`packages/leads-inbox`](../packages/leads-inbox/README.md) is a template for a receiver you own: a Cloudflare Worker or a Firebase function that checks, signs and stores each lead in your own KV or Firestore, with a read-only inbox page. It is optional, never deployed by Twilda, and has its own [threat notes](../packages/leads-inbox/THREATS.md).

## Spam and robots

Built in, with nothing third-party:

- **Honeypot.** A field no person sees. A filled one gets a normal-looking thank-you and nothing is sent.
- **Time trap.** A submission less than 1.5 seconds after the page opened shows "press the button again". The page sends `_elapsed_ms` so a receiver can repeat the check.
- **Client-side validation.** Required fields, email shape, phone shape, length, one-line fields. It runs before sending and says what is wrong next to the field.

These stop casual robots, not a determined one. **Repeat the checks on the receiving side** (the honeypot is not sent, but `_elapsed_ms`, length caps and email shape are), and turn on your form service's own filtering. A CAPTCHA is a third-party script and is deliberately not part of Twilda's default policy. If you add one, it changes the policy by hand and the test that pins it.

## Privacy

You, not Twilda, are the one collecting personal data. Use the form's **Privacy note** field to say who receives it and why, and link your full notice. Use a **consent** field when your law needs one. Twilda sends no cookie, no identifier, and no referrer (`referrerPolicy: "no-referrer"`, `credentials: "omit"`). The form service has its own retention and its own sub-processors.

## No-JavaScript fallback

A live form is a real `<form method="post" action="https://...">`. With JavaScript off, a visitor can still submit it: the browser posts straight to the service. Because the production policy allows script only from the site itself, and the form works without it, a blocked script costs nothing but the nicer messages. (The honeypot and the time trap need the script for `_elapsed_ms`; the receiver should treat a missing one as unknown, not as a bot.)

## Troubleshooting

| What you see | Cause | Fix |
| --- | --- | --- |
| The form shows a note and the fields are greyed out | No form address in **Theme → Forms** (or it is invalid) | Paste the address. Run `npm run check:forms`. |
| "Something went wrong and your message was not sent" but the service got it | The service sends no CORS headers | Use `mode: "post"`. |
| The same message and the service got nothing | The host is not sending the policy for this address, so the browser blocked the send | Serve the header from **Theme → Forms** or `npm run headers`. Check the browser console for a CSP message. |
| `check:forms` warns about the placeholder | The starter's example address is still set | Replace it. |
| An address is rejected in the desk | It broke a rule above | Read the message under the field; it names the rule. |
