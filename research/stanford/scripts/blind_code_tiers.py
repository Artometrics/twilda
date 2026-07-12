#!/usr/bin/env python3
"""Strip education columns for blind family_wealth_tier coding."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = DATA / "coding" / "tier_coding_blind.csv"

BLIND_COLS = [
    "id",
    "name",
    "company",
    "birth_year",
    "father_occupation",
    "mother_occupation",
    "parental_education",
    "private_secondary",
    "source_url_background",
    "family_wealth_tier",
    "tier_justification",
    "coder_confidence",
]


def main() -> None:
    df = pd.read_csv(DATA / "founders.csv")
    blind = df[BLIND_COLS].copy()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    blind.to_csv(OUT, index=False)
    print(f"Wrote blind coding sheet (education columns stripped): {OUT}")
    print("Re-code family_wealth_tier from biography alone, then merge back.")


if __name__ == "__main__":
    main()
