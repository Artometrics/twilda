# Project setup — Netlify, Supabase, Cursor (Twilda)

Product: **Twilda** · Company: **Artometrics** · Domain: **twilda.com**

Do not commit real secrets.

## 1. Local env

```bash
cp .env.example .env
```

| Variable | Where to get it | Notes |
|----------|-----------------|-------|
| `PUBLIC_SITE_URL` | `https://twilda.com` | Use Netlify URL until DNS propagates |
| `PUBLIC_SUPABASE_URL` | Supabase project **twilda** → Settings → API | Browser-safe |
| `PUBLIC_SUPABASE_ANON_KEY` | Same → `anon` key | Browser-safe; protect with RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Same → `service_role` | **Server only** |

## 2. Supabase

Create project **`twilda`** under org **Artometrics** (separate from other apps).

1. Copy URL + keys into `.env` and Netlify env.
2. Enable Auth providers when wiring login/signup.
3. RLS on for every table before production anon use.
4. Run database schema in Supabase **SQL Editor** (idempotent; see `supabase/migrations/README.md`):
   - `001_initial_schema.sql` — novels / profiles / subscriptions
   - `003_novel_drafts.sql` — drafts / timelines
   - **`004_atlas_schema.sql` — required for Atlas user tables + GOTHA**
   - **`005_atlas_museum.sql` — required for My Museum collections + enrich cache**

```bash
npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
```

## 3. Netlify

- Site: **twilda** — deploys from GitHub `kylesmcauliffe/twilda` on push to `main`
- Local: `npx netlify link`
- Dev with Netlify env: `npm run netlify:dev`
- Contact form: Netlify Forms on `/forms/contact`

```bash
npx netlify env:set PUBLIC_SITE_URL "https://twilda.com"
npx netlify env:set PUBLIC_SUPABASE_URL "https://YOUR_REF.supabase.co"
npx netlify env:set PUBLIC_SUPABASE_ANON_KEY "…"
npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "…" --secret
```

### Custom domain (`twilda.com`)

1. Netlify → Domain management → Add `twilda.com` (+ `www` if you want).
2. At Squarespace Domains → DNS for `twilda.com`, point to Netlify:

| Type | Host | Value |
|------|------|--------|
| **A** | `@` | `75.2.60.5` (Netlify load balancer — confirm in Netlify UI) |
| **CNAME** | `www` | `twilda.netlify.app` (or the hostname Netlify shows) |

Prefer Netlify’s exact records from the domain panel if they differ.

## 4. Verify

```bash
npm run dev          # http://localhost:4321/api/health
npm run build
```

Push to `main` → production deploy. Or `npx netlify deploy --prod`.

## 5. Stripe billing (optional until you enable paid plans)

Twilda uses **Stripe** for Pro subscriptions. Supabase does not process payments; Polar is not wired in this repo.

1. [Stripe Dashboard](https://dashboard.stripe.com/) → create products:
   - **Pro** — $19/mo recurring → copy **Price ID**
   - **Studio** — contact/sales (no self-serve checkout in app)
2. Netlify env (server-only):

```bash
npx netlify env:set STRIPE_SECRET_KEY "sk_live_..." --secret
npx netlify env:set STRIPE_WEBHOOK_SECRET "whsec_..." --secret
npx netlify env:set STRIPE_PRICE_PRO "price_..." --secret
# Optional if you add Studio self-serve later:
npx netlify env:set STRIPE_PRICE_STUDIO "price_..." --secret
```

3. Stripe → **Developers → Webhooks** → Add endpoint:
   - URL: your `PUBLIC_SITE_URL` + `/api/billing/webhook/`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
4. Stripe → **Settings → Billing → Customer portal** → enable (cancel, update payment method).
5. Test: sign up with `?plan=pro` → `/account/billing/` auto-starts Checkout → return → **Manage subscription** opens portal.

## 6. Google OAuth

1. Supabase → **Authentication → Providers → Google** → enable, paste Client ID + Secret from Google Cloud Console.
2. Google Cloud → OAuth client → Authorized redirect URI:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → URL Configuration**:
   - Site URL: same value as `PUBLIC_SITE_URL`
   - Redirect URLs: add `/auth/callback/` and `/forms/reset-password/` on prod and localhost
4. Publish OAuth consent screen (or add test users while in Testing).

## 7. Cursor

Rules in `.cursor/rules/`. Never paste service-role keys into chat.
