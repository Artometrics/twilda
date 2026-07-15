---
page: Import, export & sources
description: Import drafts, export .txt manuscripts, and understand third-party open data.
iconId: 4
category: Account
keywords:
  - import
  - export
  - wikidata
  - wikipedia
  - met
  - license
  - cache
lastUpdated: 2026-07-15
faq:
  - question: What export format is supported?
    answer: Account → Export downloads a JSON bundle (novels, manuscripts, My Museum bookmarks, and GOTHA persons/relations when those tables exist). Per-novel workspace Export still downloads a .txt manuscript.
  - question: Which open datasets does Twilda use?
    answer: Wikidata (CC0), Wikipedia REST summaries (CC BY-SA 4.0 with attribution), Wikimedia Commons (per-file licenses), and Met Museum Open Access (CC0). Europeana, Rijksmuseum, Smithsonian, and FRED keys in .env.example are future optional stubs — not wired yet.
  - question: Are enrich API responses cached?
    answer: Yes. When supabase/migrations/005_atlas_museum.sql is applied, Wikidata enrich, Wikipedia summaries, and Met object lookups are cached server-side in atlas_enrich_cache (about 24 hours). If the table is missing, enrich still works without cache.
  - question: Do you scrape WikiArt?
    answer: No. Twilda does not scrape or mirror WikiArt.
  - question: Where do Atlas map images load from?
    answer: Seed portraits and Met previews are hotlinked from images.metmuseum.org and upload.wikimedia.org (see docs/SETUP.md). The catalog itself is TypeScript seeds under src/lib/atlas/, not atlas_entities rows.
---

## Novels

- **Import:** Library → Import → plain text / markdown file becomes a new novel scene.
- **Export:** Workspace sidebar → Export → `.txt` download. Account → Export my data → JSON (includes museum + GOTHA when migrations are applied).

## Atlas enrichment

Optional server APIs hydrate Wikidata QIDs, Wikipedia extracts, and Met OA search. Responses are cached server-side in `atlas_enrich_cache` when migration 005 is applied (TTL ~24h); if the cache table is missing, requests still succeed without caching. Always check the card’s Source · License footer.

Use Atlas **Discover** (Met / Wikidata tabs) to preview live results and save Met Open Access works to My Museum. Search/timeline catalog loads lazily from `/api/atlas/search-index` after the map shell paints.
