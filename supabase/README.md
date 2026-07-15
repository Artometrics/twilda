# Supabase (Twilda)

Run migrations in the Supabase SQL Editor in order:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `migrations/001_initial_schema.sql` | Profiles, subscriptions, novels, Codex, chats |
| 2 | `migrations/003_novel_drafts.sql` | Drafts / timelines |
| 3 | `migrations/004_atlas_schema.sql` | Atlas + GOTHA tables |
| 4 | `migrations/005_atlas_museum.sql` | My Museum collections + enrich cache |
| 5 | `migrations/006_security_hardening.sql` | Harden `gotha_ancestors` (auth.uid, no anon) |

Scripts are idempotent. After migrating, enable Auth providers and set Site URL + `/auth/callback/` redirects.

See also `docs/SETUP.md` and `migrations/README.md`.
