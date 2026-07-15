---
page: GOTHA genealogy
description: Build a personal family tree, load classic samples, and link ancestors to Atlas.
iconId: 2
category: Features
keywords:
  - gotha
  - genealogy
  - family
  - ancestry
lastUpdated: 2026-07-15
faq:
  - question: What is GOTHA?
    answer: GOTHA is Twilda’s personal genealogy tool, inspired by the Almanach de Gotha—add people, relations, and map birthplaces against Atlas history.
  - question: Are there examples?
    answer: Yes. On an empty tree, load a classic sample such as the Habsburg sample or other templates when available.
  - question: Do I need a database migration?
    answer: Yes. Run supabase/migrations/004_atlas_schema.sql (and 005 for My Museum) in Supabase so persons and relations persist.
---

GOTHA lets you add yourself and ancestors generation by generation.

## Getting started

1. Open GOTHA from the top bar.
2. Add yourself first, or load a classic sample family.
3. Add relations (parent, partner, sibling).
4. Birth places with coordinates appear as map pins.

## Zodiac and lore

When birth month/day are known, Twilda shows western zodiac, Celtic Ogham tree, and Chinese year animal. Surname lookup uses Wikidata SPARQL.

## Atlas links

People can reference an Atlas seed id so you can jump from a relative to a historical figure or place.
