# Results log

Pre-registered investigation: **Stanford: Cause or Filter?**

> Results below are appended by analysis scripts. **Seed sample only** — below
> minimum N (30 billionaires, 100 controls). Do not cite until collection complete.

## Status

| Deliverable | Status |
|-------------|--------|
| Pre-registration | Committed 2026-07-12 |
| founders.csv | 20 verified seed rows (incomplete Forbes sweep) |
| control_cohort.csv | 8 verified seed rows |
| IPEDS base_rates | Placeholder — manual download pending |
| Second-coder κ | Not yet run |
| Final conclusion | **Withheld** until thresholds met |

## Model table (03_wealth_control.py)

_(Run `python scripts/03_wealth_control.py` after `pip install -r requirements.txt`)_

## Robustness (04_robustness.py)

_(Run after models)_

## Model table (03_wealth_control.py)

| model   |   stanford_or |   stanford_p |   n |   pseudo_r2 |
|:--------|--------------:|-------------:|----:|------------:|
| m1      |         4.667 |       0.1851 |  28 |      0.0661 |
| m2      |         4.667 |       0.1851 |  28 |      0.0663 |
| m3      |         1.368 |       0.831  |  28 |      0.1837 |

## Robustness (04_robustness.py)

- full sample: OR=1.368, secondary=0.8310, n=28
- drop low confidence: OR=1.627, secondary=0.7317, n=27
- tier 3 as non-elite: OR=1.267, secondary=0.8883, n=28
- bootstrap 95% CI: OR=0.000, secondary=11322376421762.7383, n=889
