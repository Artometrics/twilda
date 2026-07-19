# Project setup — Expo, Supabase, Netlify (Twilda)

Product: **Twilda** · Company: **Artometrics** · Domain: **twilda.com**

Do not commit real secrets.

## 1. Local env

```bash
cp .env.example .env
```

| Variable | Where to get it | Notes |
|----------|-----------------|-------|
| `EXPO_PUBLIC_SITE_URL` | Netlify URL or custom domain | No trailing slash; used for OAuth redirects on web |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project **twilda** → Settings → API | Safe for the app |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same → `anon` key | Protected by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Same → `service_role` | **Optional / server tooling only** — never embed in the app |

Legacy Astro names (`PUBLIC_*`) are no longer used.

## 2. Supabase

Create project **`twilda`** under org **Artometrics**.

1. Copy URL + anon key into `.env`.
2. Enable Auth providers (email + Google).
3. RLS on for every table before production anon use.
4. Run database schema in Supabase **SQL Editor** (see `supabase/migrations/README.md`):
   - `001_initial_schema.sql` — novels / profiles / subscriptions
   - `003_novel_drafts.sql` — drafts / timelines
   - `007_onboarding.sql` — `profiles.onboarding_completed`
   - `008_journal_entries.sql` — private journal
   - `009_storyboard_panels.sql` — Board mode + `storyboard` storage bucket

Older Atlas/GOTHA migrations (`004`–`006`) can be skipped for a fresh solo setup.

```bash
npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
```

## 3. Auth redirect URLs

Supabase → **Authentication → URL Configuration**:

- Site URL: same as `EXPO_PUBLIC_SITE_URL`
- Redirect URLs (examples):
  - `https://YOUR_DOMAIN/auth/callback`
  - `http://localhost:8081/auth/callback`
  - `twilda://auth/callback` (native scheme)

Google Cloud OAuth client → Authorized redirect URI:

- `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

## 4. Run locally

```bash
npm install
npm run dev          # Expo: press `w` for web, or use Expo Go
npm run web          # web only
```

## 5. Netlify (web)

- Site: **twilda** — Git deploy from `kylesmcauliffe/twilda`
- Build: `npm run build` → publish `dist/` (`netlify.toml`)
- Set `EXPO_PUBLIC_*` env vars in Netlify (same values as `.env`)

```bash
npx netlify env:set EXPO_PUBLIC_SITE_URL "https://YOUR_DOMAIN"
npx netlify env:set EXPO_PUBLIC_SUPABASE_URL "https://YOUR_REF.supabase.co"
npx netlify env:set EXPO_PUBLIC_SUPABASE_ANON_KEY "…"
```

## 6. Native builds

Use EAS when you are ready for store builds (`eas build`). Dev can use Expo Go with the `twilda` scheme for OAuth.

## 7. Cursor

Rules in `.cursor/rules/`. Never paste service-role keys into chat.
