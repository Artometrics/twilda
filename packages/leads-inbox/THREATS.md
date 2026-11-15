# Threat notes: @twilda/leads-inbox

Read this before you deploy the template. It says what the template defends, how, and what it leaves to you.

## What is being protected

- **Visitors**: what they type is personal data. It must go only where the site owner said, over https, and be kept no longer than needed.
- **The site owner**: the inbox must not let a hostile visitor run script in the owner's browser, send the owner a poisoned spreadsheet, or fill the store with junk until it costs money.
- **The store**: only this code, using the owner's credentials, writes to it.

## Threats and what the template does

| Threat | Defence | Left to you |
| --- | --- | --- |
| Another website posts to the receiver | Exact `Origin` allowlist, https only, no wildcard, checked at start. CORS headers are sent only for an allowed origin and never `*`. | A non-browser client can set any `Origin`. The allowlist stops other **websites**, not scripts. Use rate limiting. |
| Script in a lead runs in the owner's browser | Every value is escaped; the inbox policy is `default-src 'none'; script-src 'none'`, so even an escaping bug could not run script. No form, no script in the inbox at all. | Open the inbox only in a normal browser profile; do not paste leads into tools that render HTML. |
| Formula injection in a CSV | Leading `= + - @ tab CR` get an apostrophe. | Import the CSV as text where you can. |
| Email header injection | Email and every one-line field refuse line breaks (raw, `\u0085`, `\u2028`, `\u2029`), control characters and percent-encoded breaks; email also refuses `, ; < > ( ) : " \`. | If you forward a lead by email, use a mail API that takes structured fields, never a hand-built header. |
| Oversize body or field flood | Hard byte cap by `Content-Length` and by stream; field and total length caps; at most 24 fields. A bigger body is refused with 413 without being read. | The platform's own request limit and a rate-limit rule. |
| Prototype pollution, duplicate keys, nested JSON | Bodies decode into a `Map`; names must match a strict pattern and be known; a `__proto__` key is refused as unknown; non-string values are refused; duplicate urlencoded names are refused. | Do not add code that merges the body into other objects. |
| Bots | Honeypot (answered like a success, stored nowhere), time trap (1.5 s), optional inbound HMAC for forwarders. | A determined bot beats a honeypot. Add Turnstile or similar on your own page if spam gets through; it is a third-party script, so it changes the page's policy and is not part of Twilda's default. |
| Tampering with stored rows | Each row is signed with HMAC-SHA256 over a canonical encoding; the inbox shows rows that no longer match. | The signing secret must not be stored beside the data. Anyone who has the secret can forge rows. Rotate it by deploying with a new one; old rows will show as not matching. |
| Stealing the inbox password | Basic over https, constant-time compare, no cookie, `no-store`, `noindex`, `no-referrer`. A password under 16 characters is refused at start. | Basic has no lockout. Put the inbox behind Cloudflare Access or IAP if you can, and use a long random password. |
| Storing more than needed | Fields, form id, page and time only. No IP, no user agent, no cookies. Retention TTL on KV (default 90 days). | Set a retention that matches your privacy notice. Firestore has no automatic TTL here; add a TTL policy on `receivedAt` yourself. |
| Secrets in the repository | Secrets come from the platform's secret store. `wrangler.example.toml` has none. `npm run check:secrets` scans the tree. | Never commit `wrangler.toml` with a secret in it. |

## What this template does not do

- It does **not** deploy anything. You do, with your own account.
- It does **not** send email, call a CRM, or forward leads. It stores them. If you forward, do it from your own code with a structured API.
- It does **not** de-duplicate, rate limit, or block IPs. A stateless function cannot count.
- It does **not** verify that an email address exists.
- It is **not** required by Twilda. Core has no dependency on it.

## Reporting a problem

Follow the repository's [SECURITY.md](../../SECURITY.md).
