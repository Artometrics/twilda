# Stanford: Cause or Filter?

Pre-registered data investigation for Twilda / Artometrics.

## Before you touch data

Read [`/PREREGISTRATION.md`](../../PREREGISTRATION.md) at the repo root. It was committed **before** this folder's data and scripts. Do not amend it — add dated addenda if plans change.

## Layout

```
research/stanford/
├── README.md
├── requirements.txt
├── RESULTS.md              # Model output (including failures)
├── data/
│   ├── founders.csv        # Cohort A: US tech billionaires
│   ├── control_cohort.csv  # Cohort B: non-billionaire founders
│   ├── coding/
│   │   └── tier_coding_blind.csv   # Background-only tier coding
│   └── ipeds/
│       └── base_rates.csv  # Pipeline denominator
└── scripts/
    ├── 01_raw_share.py
    ├── 02_base_rate.py
    ├── 03_wealth_control.py
    ├── 04_robustness.py
    ├── 05_dropouts.py
    ├── blind_code_tiers.py
    └── fetch_ipeds_base_rates.py
```

## Setup

```bash
cd research/stanford
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run analysis (in order)

```bash
python scripts/01_raw_share.py
python scripts/02_base_rate.py
python scripts/03_wealth_control.py   # requires both cohorts + verified rows
python scripts/04_robustness.py
python scripts/05_dropouts.py
```

## Data rules

1. **`verified != Y` → excluded** in every script (`load_verified()` helper).
2. Code `family_wealth_tier` **blind to education** via `blind_code_tiers.py`.
3. Every tier needs `tier_justification` + `source_url_background`.
4. Second coder: independently code 25 random rows; target Cohen's κ ≥ 0.6.

## Family wealth tiers

| Tier | Definition |
|------|------------|
| 1 | Working class / poor / refugee. No professional parents. |
| 2 | Middle class. No elite access. |
| 3 | Professional class (doctor, lawyer, professor, engineer, executive). |
| 4 | Wealthy and/or connected (legacy, elite prep, industry/finance/politics). |

## IPEDS

- Source: NCES IPEDS Completions (C), 1975–2010
- CIP 11 (Computer & Information Sciences) + CIP 14 (Engineering)
- Stanford UNITID: **243744**
- Run `python scripts/fetch_ipeds_base_rates.py` (manual download instructions if API unavailable)

## Published articles

- `/research/stanford-cause-or-filter/` — narrative investigation
- `/research/stanford-workbook/` — interactive workbook (README · DATA · ANALYSIS · FALSIFIER)
- `/research/how-we-investigate/` — methodology companion
