"""Shared helpers for Stanford cause-or-filter analysis."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
FIGURES = ROOT / "figures"
FIGURES.mkdir(exist_ok=True)


def load_founders() -> pd.DataFrame:
    df = pd.read_csv(DATA / "founders.csv")
    return df[df["verified"] == "Y"].copy()


def load_control() -> pd.DataFrame:
    df = pd.read_csv(DATA / "control_cohort.csv")
    return df[df["verified"] == "Y"].copy()


def load_combined() -> pd.DataFrame:
    """Merge cohort A (billionaires) and cohort B (controls) for regression."""
    a = load_founders()
    a["billionaire"] = 1
    b = load_control()
    b["billionaire"] = b.get("billionaire", 0)
    cols = [
        "id",
        "name",
        "stanford_affiliated",
        "stanford_type",
        "family_wealth_tier",
        "bay_area_at_founding",
        "birth_year",
        "billionaire",
        "coder_confidence",
    ]
    return pd.concat([a[cols], b[cols]], ignore_index=True)


def elite_tier(df: pd.DataFrame) -> pd.Series:
    return df["family_wealth_tier"].isin([3, 4]).astype(int)


def non_elite_tier(df: pd.DataFrame) -> pd.Series:
    return df["family_wealth_tier"].isin([1, 2]).astype(int)
