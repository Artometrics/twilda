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
2. Apply the initial schema — see **`supabase/README.md`** (SQL Editor or `supabase db push`).
3. Configure Auth redirect URLs (see **`supabase/README.md`** § Auth redirect URLs).
4. Enable **Email** provider under Authentication → Providers.
5. RLS is enabled in the migration — verify before production anon use.

```bash
npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
```

### Auth routes (after schema + redirects)

| Route | Purpose |
|-------|---------|
| `/forms/login` | Sign in (Supabase email + password) |
| `/forms/signup` | Create account |
| `/forms/forgot` | Password reset email |
| `/auth/callback` | Email confirm + OAuth / PKCE callback (SSR) |

Successful sign-in redirects to `/novels/`. Contact form stays on **Netlify Forms** (`/forms/contact`).

OAuth (Google, GitHub, Apple, Microsoft): see **`docs/OAUTH_SETUP.md`**.

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

## 5. Cursor

Rules in `.cursor/rules/`. Never paste service-role keys into chat.
