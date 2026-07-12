#!/usr/bin/env python3
"""
Fetch IPEDS Completions base rates for CIP 11 + 14 (1975–2010).

NCES IPEDS does not expose a stable unauthenticated bulk API for all years.
This script documents the manual download path and validates base_rates.csv once filled.

Manual steps:
1. https://nces.ed.gov/ipeds/use-the-data/download-public-data
2. Download Completions (C) survey complete data files for target years
3. Filter UNITID 243744 (Stanford) vs all US institutions
4. CIP codes starting with 11 or 14, award level bachelor's + master's
5. Fill research/stanford/data/ipeds/base_rates.csv
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "ipeds" / "base_rates.csv"
STANFORD_UNITID = 243744


def main() -> None:
    if not OUT.exists():
        print(f"Missing {OUT}")
        return
    df = pd.read_csv(OUT)
    filled = df["stanford_share"].fillna(0).gt(0).any()
    if not filled:
        print("base_rates.csv exists but stanford_share is empty.")
        print(f"Stanford UNITID for filtering: {STANFORD_UNITID}")
        print("Populate per README after IPEDS download.")
    else:
        pooled = df["stanford_degrees"].sum() / df["all_us_cs_eng_degrees"].sum()
        print(f"Pooled Stanford pipeline share: {pooled:.4%}")


if __name__ == "__main__":
    main()
