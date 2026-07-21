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
| `008_journal_entries.sql` | Private journal entries for Journal (`/(tabs)/journal`) (RLS per user) |
| `009_storyboard_panels.sql` | Storyboard panels + private Storage bucket `storyboard` |

## Atlas: TypeScript seeds vs DB tables

**Runtime Atlas** (map scenes, pins, search index) is served from **TypeScript seed modules** under `src/lib/atlas/` (e.g. `seed-met.ts`, `seed-vienna.ts`). Those are the source of truth today.

DB tables from `004_atlas_schema.sql` (`atlas_entities`, `atlas_links`, `atlas_scenes`) are **reserved / future** — they are not required for the current seed-driven Atlas UX. Apply `004` mainly for **GOTHA** (`gotha_persons`, `gotha_relations`, `gotha_ancestors`).

User-facing museum + enrich cache live in `005_atlas_museum.sql` (`atlas_collections`, `atlas_enrich_cache`, plus `gotha_persons.atlas_seed_id`).

`007_onboarding.sql` adds `profiles.onboarding_completed` so the `/novels/` welcome modal can persist dismissals.

`008_journal_entries.sql` adds `journal_entries` for the in-app Journal (`/blog`).

## After migration

- Enable Google auth in Supabase → Authentication → Providers
- Set URL Configuration: Site URL + `/auth/callback/` redirect
- Sign in at `/forms/login/` → library at `/novels/`
- Starters: Gatsby, Trinity (v1 + v2 drafts), and Cardinal are seeded automatically
- GOTHA: run `004_atlas_schema.sql` (+ `006_security_hardening.sql`) — optional / unused by solo app
- Museum collections + enrich cache: run `005_atlas_museum.sql` — optional / unused by solo app
- Onboarding flag: run `007_onboarding.sql`
- Journal: run `008_journal_entries.sql`
- Storyboard / Board: run `009_storyboard_panels.sql` (creates table + Storage bucket)
