# Supabase (Twilda)

Run migrations in the Supabase SQL Editor in order:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `migrations/001_initial_schema.sql` | Profiles, subscriptions, novels, Codex, chats |
| 2 | `migrations/003_novel_drafts.sql` | Drafts / timelines |
| 3 | `migrations/004_atlas_schema.sql` | GOTHA + reserved Atlas entity tables |
| 4 | `migrations/005_atlas_museum.sql` | My Museum collections + enrich cache |
| 5 | `migrations/006_security_hardening.sql` | Harden `gotha_ancestors` (auth.uid, no anon) |
| 6 | `migrations/007_onboarding.sql` | `profiles.onboarding_completed` |

Scripts are idempotent. After migrating, enable Auth providers and set Site URL + `/auth/callback/` redirects.

**Note:** Live Atlas catalog content comes from TypeScript seeds (`src/lib/atlas/`), not from `atlas_entities` rows. See `migrations/README.md`.

See also `docs/SETUP.md` and `migrations/README.md`.
