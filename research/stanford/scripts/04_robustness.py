#!/usr/bin/env python3
"""04 — Robustness checks on Stanford coefficient."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _utils import ROOT, load_combined  # noqa: E402


def stanford_or(df: pd.DataFrame) -> tuple[float, float]:
    df = df.copy()
    for col in ("stanford_affiliated", "family_wealth_tier", "bay_area_at_founding", "birth_year"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    m = smf.logit(
        "billionaire ~ stanford_affiliated + family_wealth_tier + "
        "bay_area_at_founding + birth_year",
        data=df,
    ).fit(disp=0)
    beta = float(m.params["stanford_affiliated"])
    return float(np.exp(beta)), float(m.pvalues["stanford_affiliated"])


def main() -> None:
    df = load_combined()
    results = []

    or_full, p_full = stanford_or(df)
    results.append(("full sample", or_full, p_full, len(df)))

    no_low = df[df["coder_confidence"] != "low"]
    or_nl, p_nl = stanford_or(no_low)
    results.append(("drop low confidence", or_nl, p_nl, len(no_low)))

    alt = df.copy()
    alt.loc[alt["family_wealth_tier"] == 3, "family_wealth_tier"] = 2
    or_alt, p_alt = stanford_or(alt)
    results.append(("tier 3 as non-elite", or_alt, p_alt, len(alt)))

    # Bootstrap
    boots = []
    rng = np.random.default_rng(42)
    for _ in range(1000):
        sample = df.sample(n=len(df), replace=True, random_state=int(rng.integers(1e9)))
        try:
            boots.append(stanford_or(sample)[0])
        except Exception:  # noqa: BLE001
            pass
    if boots:
        lo, hi = np.percentile(boots, [2.5, 97.5])
        results.append(("bootstrap 95% CI", lo, hi, len(boots)))

    # Leave-one-out
    loo_flips = 0
    for drop_id in df["id"]:
        sub = df[df["id"] != drop_id]
        try:
            or_loo, p_loo = stanford_or(sub)
            if (or_full >= 2 and or_loo < 2) or (p_full < 0.05 and p_loo >= 0.05):
                loo_flips += 1
        except Exception:  # noqa: BLE001
            pass
    print(f"Leave-one-out conclusion flips: {loo_flips} / {len(df)}")

    print("\nRobustness summary:")
    for label, a, b, n in results:
        print(f"  {label:24s} OR={a:.3f}  p/upper={b:.4f}  n={n}")

    out = ROOT / "RESULTS.md"
    with out.open("a") as f:
        f.write("\n## Robustness (04_robustness.py)\n\n")
        for row in results:
            f.write(f"- {row[0]}: OR={row[1]:.3f}, secondary={row[2]:.4f}, n={row[3]}\n")


if __name__ == "__main__":
    main()
