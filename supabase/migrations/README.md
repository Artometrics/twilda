# Supabase migrations (Twilda)

## Run this on Supabase

1. Open Supabase Dashboard → **SQL Editor** → **New query**
2. Run **`001_initial_schema.sql`** (full base schema), then **`003_novel_drafts.sql`** (drafts / timelines)
3. Paste and click **Run** for each

The scripts are **idempotent** (safe to re-run).

`001` creates or upgrades:

- `profiles`, `subscriptions`
- `novels`, `chapters`, `scenes`
- `codex_entries`, `snippets`
- `chat_threads`, `chat_messages`
- RLS policies and `updated_at` triggers

`003` adds:

- `novel_drafts` (named drafts / timelines per novel)
- `draft_references` (cross-draft pins)
- `active_draft_id` on novels; `draft_id` on chapters, codex, snippets, chats
- Backfill of a Main draft for existing novels

## Files

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | **Canonical** full base schema — use this first |
| `002_fix_partial_schema.sql` | Pointer only (legacy recovery name) |
| `003_novel_drafts.sql` | Drafts / timelines + cross-draft references |
| `004_atlas_schema.sql` | Atlas DB tables + GOTHA genealogy tables + `gotha_ancestors` RPC |
| `005_atlas_museum.sql` | Museum collections (`atlas_collections`), enrich cache, `gotha_persons.atlas_seed_id` |
| `006_security_hardening.sql` | Harden `gotha_ancestors` to `auth.uid()`, revoke anon execute |
| `007_onboarding.sql` | `profiles.onboarding_completed` for welcome modal persistence |

## After migration

- Enable Google auth in Supabase → Authentication → Providers
- Set URL Configuration: Site URL + `/auth/callback/` redirect
- Sign in at `/forms/login/` → library at `/novels/`
- Starters: Gatsby, Trinity (v1 + v2 drafts), and Cardinal are seeded automatically
- Atlas and GOTHA: run `004_atlas_schema.sql` to enable DB-backed atlas entities and GOTHA genealogy
- Museum collections + enrich cache: run `005_atlas_museum.sql`
