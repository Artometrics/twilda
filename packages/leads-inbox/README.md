# @twilda/leads-inbox

An **optional** way to keep the leads from a Twilda form in a place you own, with a read-only inbox to look at them.

Twilda itself never needs this. A Twilda site posts its forms to an address you choose, and that can be Formspree,
Basin, Netlify Forms, a Zapier or Make webhook and so on (see [docs/forms-and-crm.md](../../docs/forms-and-crm.md)).
Use this package only if you would rather own the whole path. It is a **template**: Twilda does not deploy it, host it,
or hold any data for it. Nothing in the core packages imports it.

## What is in it

| File | What it does |
| --- | --- |
| `src/receiver.ts` | `createReceiver(config)`: one function from a Web `Request` to a `Response`. Validates, signs, appends. Keeps nothing between calls. |
| `src/validate.ts` | The form rules, copied in so this package deploys alone. `test/parity.test.ts` checks them against `@twilda/core`. |
| `src/sign.ts` | HMAC-SHA256 with WebCrypto, canonical record encoding, constant-time compare. |
| `src/store.ts` | `KvStore` (Cloudflare KV), `FirestoreStore` (Firestore, structural type, no `firebase-admin` import), `MemoryStore` (tests). |
| `src/inbox.ts` | `createInbox(config)`: read-only pages behind HTTP Basic, plus a CSV download. No form, no script. |
| `src/cloudflare.ts` | A ready Worker: `POST /lead` receives, `GET /inbox`, `/inbox.csv` read. |
| `src/firebase.ts` | `receiveLead` and `readInbox` wrappers for a Firebase `onRequest` function. |
| `wrangler.example.toml` | Example configuration. Secrets are set with `wrangler secret put`, never in a file. |

There are no runtime dependencies. The only thing you bring is a store you own.

## What the receiver does to every request

1. Method must be `POST` (or a preflight `OPTIONS` from an allowed origin).
2. `Origin` must be one of `allowedOrigins`, exactly. A missing `Origin` is refused unless you opt in.
3. Content type must be form-urlencoded or JSON. Nothing else is parsed.
4. The body is read with a hard cap (16 KB by default, 64 KB at most), by header and by stream, then decoded strictly as UTF-8.
5. If you set `inboundSecret`, the body must carry a matching `X-Twilda-Signature: sha256=<hex>`.
6. Each field is checked with the same rules the page uses: allowed names only, one line where a line is expected, a safe email address (no line break, comma, semicolon, angle bracket or header name, raw or percent-encoded), a phone number, length caps and a total cap.
7. A filled honeypot gets the same "thanks" answer and **nothing is stored**. A form sent faster than 1.5 seconds is refused.
8. The record gets a random id, the receiver's own clock, and an HMAC-SHA256 signature over a canonical encoding. It is appended to your store with a retention time. It is never updated.

It stores: the fields, the form id, the page address and the time. It stores no IP address and no user agent.

## Use it on Cloudflare

```sh
cd packages/leads-inbox
cp wrangler.example.toml wrangler.toml     # edit the origins and the KV id
npx wrangler kv namespace create LEADS
npx wrangler secret put SIGNING_SECRET
npx wrangler secret put INBOX_USER
npx wrangler secret put INBOX_PASSWORD
npx wrangler deploy                        # you run this, with your account; nothing here does
```

Then in `content/site.json`:

```json
{ "forms": { "endpoint": "https://twilda-leads.<you>.workers.dev/lead", "mode": "fetch" } }
```

and serve the policy that `npm run headers -- content` prints, which lets the form talk to that one address and nothing else.
Open `https://twilda-leads.<you>.workers.dev/inbox` and sign in.

Add rate limiting in front of the Worker (a Cloudflare rate-limiting rule). A Worker that keeps no state cannot count requests by itself, and this template does not pretend to.

## Use it on Firebase

```ts
// functions/src/index.ts, in your own project
import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { FirestoreStore } from "@twilda/leads-inbox";
import { readInbox, receiveLead } from "@twilda/leads-inbox/firebase";

const store = () => new FirestoreStore(getFirestore());
const secrets = ["SIGNING_SECRET", "INBOX_PASSWORD"];

export const lead = onRequest({ secrets }, (req, res) =>
  receiveLead({ allowedOrigins: ["https://example.com"], signingSecret: process.env.SIGNING_SECRET!, store: store() })(req, res),
);
export const inbox = onRequest({ secrets }, (req, res) =>
  readInbox({ store: store(), signingSecret: process.env.SIGNING_SECRET!, user: "owner", password: process.env.INBOX_PASSWORD! })(req, res),
);
```

Firestore security rules for the collection should deny every client read and write (`allow read, write: if false;`). Only the functions, which use the Admin SDK, touch it.

## The inbox

- HTTP Basic over https, a password of at least 16 characters, compared in constant time.
- Read only: no form, no script, no button that writes. A response policy of `default-src 'none'; style-src 'self'; script-src 'none'; form-action 'none'`.
- Every stored value is HTML-escaped. A value that looks like markup is shown as text.
- Each row says whether its signature still matches. A row someone edited in the store directly shows **SIGNATURE DOES NOT MATCH**.
- CSV: a cell that starts with `=`, `+`, `-`, `@`, tab or carriage return gets a leading apostrophe so a spreadsheet does not run it as a formula.

## Tests

`npm test` at the repository root runs this package's tests (`packages/leads-inbox/test`): the receiver's abuse cases
(wrong origin, oversize, header injection, prototype keys, duplicate fields, honeypot, time trap, bad signature),
the inbox's escaping and CSV guard, the stores, both adapters, and the parity check against `@twilda/core`.

See [THREATS.md](THREATS.md) for what this template defends against and what it leaves to you.
