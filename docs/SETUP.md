# Project setup — Netlify, Supabase, Cursor (Twilda)

Product: **Twilda** · Company: **Artometrics** · Domain: **twilda.com**

Do not commit real secrets.

## 1. Local env

```bash
cp .env.example .env
```

| Variable | Where to get it | Notes |
|----------|-----------------|-------|
| `PUBLIC_SITE_URL` | Your Netlify URL or custom domain | No trailing slash |
| `PUBLIC_SUPABASE_URL` | Supabase project **twilda** → Settings → API | Browser-safe |
| `PUBLIC_SUPABASE_ANON_KEY` | Same → `anon` key | Browser-safe; protect with RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Same → `service_role` | **Server only** |

## 2. Supabase

Create project **`twilda`** under org **Artometrics**.

1. Copy URL + keys into `.env` and Netlify env.
2. Enable Auth providers (email + Google) when wiring login/signup.
3. RLS on for every table before production anon use.
4. Run database schema in Supabase **SQL Editor** (idempotent; see `supabase/migrations/README.md`):
   - `001_initial_schema.sql` — novels / profiles / subscriptions
   - `003_novel_drafts.sql` — drafts / timelines
   - `007_onboarding.sql` — `profiles.onboarding_completed` for welcome modal
   - `008_journal_entries.sql` — private journal entries (`/blog`)
   - `009_storyboard_panels.sql` — Board mode panels + private `storyboard` storage bucket

Older Atlas/GOTHA migrations (`004`–`006`) are unused by the current app and can be skipped for a fresh solo setup.

```bash
npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
```

## 3. Netlify

- Site: **twilda** — deploys from GitHub `kylesmcauliffe/twilda` on push to `main`
- Local: `npx netlify link`
- Dev with Netlify env: `npm run netlify:dev`

```bash
npx netlify env:set PUBLIC_SITE_URL "https://YOUR_DOMAIN"
npx netlify env:set PUBLIC_SUPABASE_URL "https://YOUR_REF.supabase.co"
npx netlify env:set PUBLIC_SUPABASE_ANON_KEY "…"
npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "…" --secret
```

### Custom domain (`twilda.com`)

1. Netlify → Domain management → Add `twilda.com` (+ `www` if you want).
2. Point DNS at Netlify using the records shown in the Netlify domain panel.

## 4. Verify

```bash
npm run dev          # http://localhost:4321/api/health
# Optional deep probe (needs service role locally): /api/health?deep=1
npm run build
```

Push to `main` → production deploy. Or `npx netlify deploy --prod`.

## 5. Google OAuth

1. Supabase → **Authentication → Providers → Google** → enable, paste Client ID + Secret from Google Cloud Console.
2. Google Cloud → OAuth client → Authorized redirect URI:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → URL Configuration**:
   - Site URL: same value as `PUBLIC_SITE_URL`
   - Redirect URLs: add `/auth/callback/` and `/forms/reset-password/` on prod and localhost
4. Publish OAuth consent screen (or add test users while in Testing).

## 6. Cursor

Rules in `.cursor/rules/`. Never paste service-role keys into chat.
