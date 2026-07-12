#!/usr/bin/env python3
"""01 — Raw school share among verified US tech billionaire founders."""

from __future__ import annotations

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _utils import FIGURES, load_founders  # noqa: E402


def school_label(row: pd.Series) -> str:
    if row["stanford_affiliated"] == 1:
        return "Stanford"
    u = str(row.get("undergrad_institution", "") or "")
    g = str(row.get("grad_institution", "") or "")
    if "Harvard" in u or "Harvard" in g:
        return "Harvard"
    if "MIT" in u or "MIT" in g:
        return "MIT"
    if "Berkeley" in u or "Berkeley" in u:
        return "Berkeley"
    if "Illinois" in u or "Illinois" in g:
        return "Illinois"
    if row.get("undergrad_completed") == "N" and row.get("grad_completed") == "N":
        return "No degree"
    return "Other"


def main() -> None:
    df = load_founders()
    n = len(df)
    print(f"Verified US tech billionaire founders: N = {n}")
    if n == 0:
        sys.exit("No verified rows in founders.csv")

    df["school_bucket"] = df.apply(school_label, axis=1)
    counts = df["school_bucket"].value_counts()
    shares = (counts / n * 100).round(1)

    print("\nRaw share of billionaire sample by school bucket:")
    for school, share in shares.items():
        print(f"  {school:12s} {counts[school]:3d}  ({share:5.1f}%)")

    stanford_share = shares.get("Stanford", 0)
    print(f"\nHeadline naive number: Stanford = {stanford_share:.1f}% of sample")
    print("(This is where lazy articles stop. See 02_base_rate.py for pipeline adjustment.)")

    fig, ax = plt.subplots(figsize=(8, 5))
    shares.sort_values().plot(kind="barh", ax=ax, color="#C0392B")
    ax.set_xlabel("Share of billionaire sample (%)")
    ax.set_title("Raw university share — US tech billionaires (seed sample)")
    fig.tight_layout()
    out = FIGURES / "01_raw_share.png"
    fig.savefig(out, dpi=150)
    print(f"\nWrote {out}")


if __name__ == "__main__":
    main()
