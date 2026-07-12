# Supabase migrations (Twilda)

## Run this on Supabase

1. Open Supabase Dashboard → **SQL Editor** → **New query**
2. Copy the entire contents of **`001_initial_schema.sql`**
3. Paste and click **Run**

The script is **idempotent** (safe to re-run). It creates or upgrades:

- `profiles`, `subscriptions`
- `novels`, `chapters`, `scenes`
- `codex_entries`, `snippets`
- `chat_threads`, `chat_messages`
- RLS policies and `updated_at` triggers

## Files

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | **Canonical** full schema — use this |
| `002_fix_partial_schema.sql` | Pointer only (legacy recovery name) |

## After migration

- Enable Google auth in Supabase → Authentication → Providers
- Set URL Configuration: Site URL + `/auth/callback/` redirect
- Sign in at `/forms/login/` → library at `/novels/`
