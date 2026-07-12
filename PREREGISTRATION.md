# Pre-registration

Date: 2026-07-12

## Claim under test

Stanford University does not merely correlate with extreme tech wealth — it CAUSES it.
Stanford is the causal engine of Silicon Valley, not a sorting mechanism that
collects people who were already positioned to succeed.

## Falsifier (complete the sentence)

"If the Stanford affiliation odds ratio falls below 1.5 (or becomes statistically
insignificant at α = 0.05) in the fully controlled logistic model (m3: billionaire ~
stanford_affiliated + family_wealth_tier + bay_area_at_founding + birth_year), then
Stanford is best understood as a FILTER rather than a CAUSE, and I will say so
explicitly in the published piece."

## Pre-committed thresholds

- I will call the Stanford effect **CAUSAL** only if: the stanford_affiliated
  coefficient in m3 has OR ≥ 2.0, p < 0.05, and the result survives all pre-specified
  robustness checks in `04_robustness.py` (including dropping low-confidence rows,
  alternative tier coding, bootstrap CI excluding 1.0, and leave-one-out stability).
- I will call it a **FILTER** if: adding `family_wealth_tier` to m1 reduces the
  Stanford OR by ≥ 50% or renders it insignificant (p ≥ 0.05), OR the dropout test
  in `05_dropouts.py` shows no difference between Stanford completers and admits who
  left early (evidence that admission/selection, not instruction, drives the effect).
- Minimum sample size before I interpret anything: **N = 30** verified US tech
  billionaire founders (Cohort A) **and N = 100** verified control-cohort founders
  (Cohort B).

## Population definition (inclusion rules)

**Cohort A — outcome group**

All individuals on the most recent Forbes World's Billionaires list whose primary
source of wealth is technology (software, internet, semiconductors, hardware,
consumer tech) AND who are US-based. Take every single one. No skipping.

**Cohort B — control group**

Founders/CEOs of the top 200 US tech companies by valuation that did *not* produce
a billionaire founder, plus a random sample of Y Combinator–funded founders (target
n = 100 minimum, stratified by founding decade).

**Exclusion from analysis**

Any row with `verified != Y` is excluded from all statistics. Enforced in code.

## Signature

Artometrics Editorial / Twilda Investigations — pre-registered 2026-07-12 via
commit to this repository before data collection or analysis scripts were run.
