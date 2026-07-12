#!/usr/bin/env python3
"""02 — Overrepresentation ratio vs IPEDS pipeline base rate."""

from __future__ import annotations

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _utils import DATA, FIGURES, load_founders  # noqa: E402


SCHOOLS = {
    "Stanford": lambda r: r["stanford_affiliated"] == 1,
    "Harvard": lambda r: "Harvard" in str(r.get("undergrad_institution", ""))
    or "Harvard" in str(r.get("grad_institution", "")),
    "MIT": lambda r: "MIT" in str(r.get("undergrad_institution", ""))
    or "MIT" in str(r.get("grad_institution", "")),
    "Berkeley": lambda r: "Berkeley" in str(r.get("undergrad_institution", ""))
    or "Berkeley" in str(r.get("grad_institution", "")),
}


def main() -> None:
    df = load_founders()
    n = len(df)
    ipeds = pd.read_csv(DATA / "ipeds" / "base_rates.csv")
    pooled = ipeds.loc[ipeds["year"] == ipeds["year"].max(), "stanford_share"]
    pipeline_share = (
        float(pooled.iloc[0]) if len(pooled) and pooled.iloc[0] > 0 else None
    )

    print(f"Billionaire sample N = {n}")
    rows = []
    for school, pred in SCHOOLS.items():
        outcome_share = df.apply(pred, axis=1).mean()
        if school == "Stanford" and pipeline_share:
            ratio = outcome_share / pipeline_share
            rows.append((school, outcome_share, pipeline_share, ratio))
            print(
                f"{school}: outcome {outcome_share:.3%} / pipeline {pipeline_share:.3%} "
                f"= {ratio:.1f}x overrepresentation"
            )
        else:
            rows.append((school, outcome_share, None, None))
            print(f"{school}: outcome share {outcome_share:.1%} (no pipeline row yet)")

    if pipeline_share is None or pipeline_share == 0:
        print(
            "\nWARNING: IPEDS base_rates.csv not populated. "
            "Run fetch_ipeds_base_rates.py after downloading Completions files."
        )

    plot_df = pd.DataFrame(rows, columns=["school", "outcome_share", "pipeline", "ratio"])
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.bar(
        plot_df["school"],
        plot_df["outcome_share"] * 100,
        color="#2C3E6B",
        label="Outcome share (%)",
    )
    ax.set_ylabel("Share of billionaire sample (%)")
    ax.set_title("School share vs pipeline (Stanford ratio pending IPEDS fill)")
    fig.tight_layout()
    out = FIGURES / "02_base_rate.png"
    fig.savefig(out, dpi=150)
    print(f"\nWrote {out}")


if __name__ == "__main__":
    main()
