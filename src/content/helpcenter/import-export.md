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
lastUpdated: 2026-07-15
faq:
  - question: What export format is supported?
    answer: Manuscript export downloads a .txt file from the novel workspace. Additional formats are on the Studio roadmap.
  - question: Which open datasets does Twilda use?
    answer: Wikidata (CC0), Wikipedia REST summaries (CC BY-SA 4.0 with attribution), Wikimedia Commons (per-file licenses), and Met Museum Open Access (CC0).
  - question: Do you scrape WikiArt?
    answer: No. Twilda does not scrape or mirror WikiArt.
---

## Novels

- **Import:** Library → Import → plain text / markdown file becomes a new novel scene.
- **Export:** Workspace sidebar → Export → `.txt` download.

## Atlas enrichment

Optional server APIs hydrate Wikidata QIDs, Wikipedia extracts, and Met OA search. Responses are cached when migration 005 is applied. Always check the card’s Source · License footer.
