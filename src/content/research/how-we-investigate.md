---
pubDate: 2026-07-12
team: "david-lee"
title: "How We Pre-Register an Investigation"
subtitle: "Methodology for Twilda Investigations"
description: "Why we commit to a falsifier before touching data — and what we publish when the result contradicts our priors."
readTime: "8 min"
status: "complete"
series: "Twilda Investigations"
tags:
  - methodology
  - pre-registration
  - research
preregistration: "https://github.com/kylesmcauliffe/twilda/blob/main/PREREGISTRATION.md"
---

Most data-driven articles about elite universities fail the same way: they start with billionaires, notice Stanford on the list, and publish. That is **selection on the dependent variable** — studying winners and inferring what made them win.

Twilda Investigations runs differently. Before we collect a row or run a regression, we publish a **pre-registration**: the claim, the falsifier, the thresholds, and the population rules. We do not amend it silently. If plans change, we add a dated addendum and leave the original visible.

This piece documents that workflow so readers — and future us — can hold the work accountable.

---

## What pre-registration is (and is not)

Pre-registration is not a promise to be right. It is a promise to be **testable**.

For [*Stanford: Cause or Filter?*](/research/stanford-cause-or-filter/), we committed in advance:

1. **Claim under test** — Stanford causes tech wealth, not merely correlates with it.
2. **Falsifier** — If the fully controlled logistic model shows Stanford OR < 1.5 or p ≥ 0.05, we will call Stanford a **filter**, not a cause, in the published piece.
3. **Thresholds** — Causal language only if OR ≥ 2.0, p < 0.05, and robustness checks pass.
4. **Minimum N** — 30 verified US tech billionaire founders + 100 verified controls before interpreting.

The document lives at the repo root: [`PREREGISTRATION.md`](https://github.com/kylesmcauliffe/twilda/blob/main/PREREGISTRATION.md). It was the **first commit** on the investigation branch — before CSVs, before scripts, before narrative drafts.

---

## The control cohort problem

Pattern articles study outcomes. Science studies **contrasts**.

Our inclusion rules define two cohorts:

- **Cohort A:** Every US-based tech billionaire on the Forbes list (no skipping).
- **Cohort B:** Founders/CEOs of top-200 US tech companies without billionaire founders, plus YC founders — minimum 100 verified rows.

Without Cohort B, you cannot estimate whether Stanford predicts `billionaire = 1` in a logistic model. You can only describe billionaires — which is journalism, not inference.

---

## Family wealth tiers — the variable everything rests on

We code founders into tiers 1–4 (working class → connected wealth) with:

- Mandatory `tier_justification` text
- Source URLs
- **Blind coding** — education columns stripped before tier assignment (`scripts/blind_code_tiers.py`)
- **Second coder** on 25 random rows — target Cohen's κ ≥ 0.6

Rows with `verified != Y` are **excluded in code**, not by editorial discretion.

---

## Analysis scripts (run in order)

| Script | Purpose |
|---|---|
| `01_raw_share.py` | Naive school shares — the number lazy articles stop at |
| `02_base_rate.py` | Outcome share ÷ IPEDS pipeline share |
| `03_wealth_control.py` | Cross-tab + logistic models m1 → m3 |
| `04_robustness.py` | Drop low confidence, alt tier coding, bootstrap, leave-one-out |
| `05_dropouts.py` | Completers vs early exits — selection vs instruction |

Each script prints results and writes figures to `research/stanford/figures/`. Model tables append to `RESULTS.md` — **including specs that fail**.

---

## What we publish when we lose

If the full sample confirms our seed pattern — Stanford coefficient collapsing under controls — we **lead with that**. A finding that contradicts the seductive myth is more credible than one that confirms what everyone already believes.

We publish:

- The CSV (verified rows only in analysis; full sheet with provenance)
- All scripts
- Pre-registration, unedited
- Results that hurt

---

## Failure modes we watch for

| Bias | Symptom | Our counter |
|---|---|---|
| Selection on DV | Only studying billionaires | Control cohort + logistic models |
| Survivorship bias | Missing failed Stanford grads | Expand Cohort B; document exclusions |
| Confirmation bias | "The pattern keeps confirming" | Pre-registered falsifier |
| Motivated tier coding | Coding rich kids as middle class | Blind coding + second coder κ |

---

## Start your own

Copy the template in [`PREREGISTRATION.md`](https://github.com/kylesmcauliffe/twilda/blob/main/PREREGISTRATION.md). If you cannot complete the falsifier sentence, you do not have a testable thesis yet — stop and fix that before opening a spreadsheet.

Read the investigation: [*Stanford: Cause or Filter?*](/research/stanford-cause-or-filter/)

— Artometrics Editorial
