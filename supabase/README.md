# Supabase — Twilda

Schema migrations live in `migrations/`. Apply them to the **twilda** project (Artometrics org) before using auth in production.

## Apply migrations

**Option A — SQL Editor (recommended for first setup)**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **twilda** → **SQL Editor**.
2. Paste and run `migrations/20250712000000_initial_schema.sql`.
3. Confirm tables: `public.profiles`, `public.novels` (both with RLS enabled).

**Option B — Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push
```

## Auth redirect URLs

In Supabase → **Authentication** → **URL configuration**, add:

| Setting | Value |
|---------|--------|
| Site URL | Your production domain (e.g. from `PUBLIC_SITE_URL`) and `http://localhost:4321` for local dev |
| Redirect URLs | `{PUBLIC_SITE_URL}/auth/callback`, `http://localhost:4321/auth/callback` |

## Email templates

For email confirmation and password reset, point links at the Astro callback route.

**Confirm signup** template — set the confirmation link to:

```html
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email
```

**Reset password** uses `redirectTo` from the app (`/auth/callback`); ensure that URL is in the redirect allowlist above.

## Regenerate TypeScript types

After schema changes:

```bash
npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
```

## Tables

| Table | Purpose |
|-------|---------|
| `profiles` | One row per `auth.users`; auto-created on signup |
| `novels` | Per-user writing projects (`content` JSON for codex/chapters) |

All tables use Row Level Security — users can only access their own rows.
