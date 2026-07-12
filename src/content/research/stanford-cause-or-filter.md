---
pubDate: 2026-07-12
team: "david-lee"
title: "Stanford: Cause or Filter?"
subtitle: "A pre-registered data investigation"
description: "Stanford alumni dominate US tech billionaire lists. Is the university a causal engine of Silicon Valley — or a sorting mechanism for people who were already going to win?"
readTime: "14 min"
status: "in-progress"
series: "Twilda Investigations"
tags:
  - stanford
  - causality
  - economics
  - pre-registered
preregistration: "https://github.com/kylesmcauliffe/twilda/blob/main/PREREGISTRATION.md"
dataRepo: "/research/stanford/"
---

Stanford alumni are wildly overrepresented among US tech billionaires. Nobody disputes the pattern. The question is **why** — and whether the honest answer is that Stanford *causes* extreme wealth, *filters* for people already positioned to win, or simply sits in the right geography.

This investigation is **pre-registered**. We committed to a falsifier and analysis plan in [`PREREGISTRATION.md`](https://github.com/kylesmcauliffe/twilda/blob/main/PREREGISTRATION.md) before collecting data or running models. The CSV, scripts, and results live in [`research/stanford/`](https://github.com/kylesmcauliffe/twilda/tree/main/research/stanford).

**Status:** Seed sample only (20 verified billionaire founders, 8 controls). Below our pre-committed minimums (N = 30 + 100). Numbers below are illustrative — the conclusion is **withheld** until collection completes.

---

## 1. The pattern

Google. PayPal. Sun Microsystems. The Stanford narrative is seductive: walk the palm-lined quad, absorb Terman's engineering culture, spin out a company before your thesis committee meets, and inherit the Valley's venture-capital conveyor belt.

The myth feels true because it rhymes with half the stories we already tell about Silicon Valley. And the credential counts back it up — Salas Díaz & Young (2024) rank Stanford second globally among billionaire-producing universities (~69 alumni), behind Harvard (~104). They had the person-level data but **did not separate self-made from inherited wealth** or control for family background. That gap is where this investigation lives.

---

## 2. The naive number

In our **incomplete** Forbes sweep of US tech billionaires, Stanford-affiliated founders are **40%** of the verified seed sample (8 of 20).

Every lazy article stops here. If Stanford is ~0.4% of the national CS/engineering degree pipeline (IPEDS, pending) and ~40% of outcomes, that implies something like a **~100× overrepresentation** — a headline that confirms what you already believed.

We have not yet populated IPEDS base rates in `data/ipeds/base_rates.csv`. Until we do, treat the ratio as unknown. The order of magnitude is the point: the raw share is enormous. **Raw share is not causation.**

---

## 3. The turn

Here is the error this project exists to avoid: **selection on the dependent variable**.

If you study only people who became billionaires and notice they went to Stanford, you have learned nothing about whether Stanford *caused* the outcome. You need a **control cohort** — founders who did not become billionaires — and you need to ask whether Stanford predicts the outcome *after* controlling for what Stanford selects for.

We pre-committed to three hypotheses:

| Hypothesis | Mechanism | Decisive pattern |
|---|---|---|
| **H1 — CAUSE** | Teaching, tech transfer, culture | Stanford effect persists among non-elite backgrounds |
| **H2 — FILTER** | Admissions select winners | Effect collapses when `family_wealth_tier` enters |
| **H3 — GEOGRAPHY** | Bay Area cluster, not the diploma | Effect collapses when `bay_area_at_founding` enters |

**Null:** No residual institutional effect after wealth and geography controls.

---

## 4. The controls

### Family background

We code every founder into wealth tiers 1–4 with mandatory `tier_justification` and source URLs. Tier coding is run **blind to education** (`scripts/blind_code_tiers.py`).

In the seed cross-tab (billionaires only):

| | Stanford | Non-Stanford |
|---|---|---|
| Tier 1–2 (non-elite) | 1 | 5 |
| Tier 3–4 (elite) | 7 | 7 |

Stanford rate among non-elite founders: **16.7%**. Among elite: **50.0%**. Directionally, that is filter-shaped — but N is tiny.

### Logistic models (seed sample, N = 28 combined)

| Model | Stanford OR | p-value |
|---|---|---|
| m1 — Stanford only | 4.67 | 0.19 |
| m2 — + wealth tier | 4.67 | 0.19 |
| m3 — + Bay Area + birth year | **1.37** | 0.83 |

In m3, the Stanford coefficient **collapses** and Bay Area approaches significance (p ≈ 0.08). On seed data alone, geography and selection look more plausible than a standalone Stanford causal effect. **We are not calling a conclusion yet.**

### Harvard check

Harvard appears in **25%** of our seed billionaire sample vs Stanford's 40%. If Harvard's IPEDS overrepresentation ratio is comparable after pipeline adjustment, the story becomes *elite credentialing*, not *Stanford specifically*.

### Dropouts

Musk (~2 days at Stanford). Page and Brin (PhD dropouts). Ballmer (MBA dropout). If admits-who-left perform like completers, **admission/selection** dominates **instruction**. Our dropout test (`05_dropouts.py`) finds 3 dropouts vs 5 completers among Stanford-affiliated billionaires in the seed — all ended up billionaires either way. Cheap natural experiment; needs full sample.

---

## 5. What survived (so far)

On seed data, **nothing survives our pre-registered causal threshold** (OR ≥ 2.0, p < 0.05 in m3, robustness checks passed). If the full Forbes sweep confirms this, we will publish that Stanford is best understood as a **filter and geography marker**, not a standalone cause — per our falsifier.

If the full sample contradicts the seed, **we lead with that.** A result that survives blind tier coding, a control cohort, and pre-committed robustness checks is the only result worth believing.

---

## 6. What it means

Stanford's myth is not random. The university sits at the intersection of defense-funded research, venture capital, and a geographic cluster that compounds network effects. Disentangling **institution**, **selection**, and **place** requires the boring work: every billionaire, a control group, IPEDS denominators, double-coded backgrounds, and models you report even when you hate them.

That is the edge. Not the pattern — everyone sees the pattern. The edge is proving what survives.

---

## Limitations

- **Incomplete sample.** 20 of ~? US tech billionaires; 8 of 100+ controls.
- **IPEDS base rates not yet filled.** Overrepresentation ratios are pending.
- **Second-coder κ not yet computed.** Target ≥ 0.6 on 25 blind-coded rows.
- **Wikipedia-sourced seed rows.** Full collection requires Forbes + primary biographies.
- **Convergence warnings** on small-N logistic models — expect stable estimates only at pre-registered N.

---

## References

- O'Mara, M. (2019). *The Code: Silicon Valley and the Remaking of America.*
- Harris, M. (2023). *Palo Alto.*
- Salas Díaz, A. & Young, H. (2024). Educational credentials of global elites.
- Saxenian, A. (1994). *Regional Advantage.*
- Pre-registration: [`PREREGISTRATION.md`](https://github.com/kylesmcauliffe/twilda/blob/main/PREREGISTRATION.md)
- Data & code: [`research/stanford/`](https://github.com/kylesmcauliffe/twilda/tree/main/research/stanford)

---

## Editor's note

This investigation was designed in active collaboration with AI tooling (Claude). The research questions, falsifier, and editorial framing are ours. Data collection, coding, analysis scripts, and draft prose are a directed partnership — with pre-registration specifically to bind our priors before results arrived.

— Artometrics Editorial
