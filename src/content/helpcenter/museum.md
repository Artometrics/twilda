---
page: My Museum
description: Save Atlas and Met Open Access artifacts to a private collection on your account.
iconId: 3
category: Features
keywords:
  - museum
  - collection
  - artifacts
  - account
lastUpdated: 2026-07-15
faq:
  - question: Where is My Museum?
    answer: On your Account page after you sign in. Saved items appear in a gallery with title, venue, year, and license.
  - question: How do I add items?
    answer: From Atlas, open an artifact card and click Save to My Museum. You can also load starter kits from Account.
  - question: Is My Museum public?
    answer: Not yet. Collections are private to your account. Shareable museum pages are on the roadmap.
---

My Museum is your private shelf of Atlas artifacts.

## Requirements

Run migration `005_atlas_museum.sql` so `atlas_collections` exists. Without it, saves will fail with a clear error.

## Starter kits

From Account you can load classic kits (Met classical, Vienna circuit, family history) to seed bookmarks quickly.
