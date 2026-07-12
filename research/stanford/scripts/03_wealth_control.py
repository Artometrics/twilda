#!/usr/bin/env python3
"""03 — Wealth and geography controls; logistic models m1–m3."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import statsmodels.formula.api as smf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _utils import ROOT, load_combined, load_founders  # noqa: E402


def crosstab_wealth(df: pd.DataFrame) -> None:
    founders = df[df["billionaire"] == 1].copy()
    founders["elite"] = founders["family_wealth_tier"].isin([3, 4])
    founders["non_elite"] = founders["family_wealth_tier"].isin([1, 2])

    a = founders[(founders["stanford_affiliated"] == 1) & founders["non_elite"]].shape[0]
    b = founders[(founders["stanford_affiliated"] == 0) & founders["non_elite"]].shape[0]
    c = founders[(founders["stanford_affiliated"] == 1) & founders["elite"]].shape[0]
    d = founders[(founders["stanford_affiliated"] == 0) & founders["elite"]].shape[0]

    print("Cross-tab (billionaire founders only):")
    print("                      Stanford    Non-Stanford")
    print(f"Tier 1-2 (non-elite)     {a:4d}          {b:4d}")
    print(f"Tier 3-4 (elite)         {c:4d}          {d:4d}")
    if a + b:
        print(f"Stanford rate among non-elite: {a / (a + b):.1%}")
    if c + d:
        print(f"Stanford rate among elite:     {c / (c + d):.1%}")


def fit_models(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["stanford_affiliated"] = df["stanford_affiliated"].astype(int)
    df["family_wealth_tier"] = df["family_wealth_tier"].astype(float)
    df["bay_area_at_founding"] = df["bay_area_at_founding"].astype(int)
    df["birth_year"] = df["birth_year"].astype(float)

    specs = [
        ("m1", "billionaire ~ stanford_affiliated"),
        ("m2", "billionaire ~ stanford_affiliated + family_wealth_tier"),
        (
            "m3",
            "billionaire ~ stanford_affiliated + family_wealth_tier + "
            "bay_area_at_founding + birth_year",
        ),
    ]
    rows = []
    for name, formula in specs:
        try:
            m = smf.logit(formula, data=df).fit(disp=0)
            or_stanford = float(m.params.get("stanford_affiliated", float("nan")))
            import numpy as np

            or_val = float(np.exp(or_stanford))
            p = float(m.pvalues.get("stanford_affiliated", float("nan")))
            rows.append(
                {
                    "model": name,
                    "stanford_or": round(or_val, 3),
                    "stanford_p": round(p, 4),
                    "n": int(m.nobs),
                    "pseudo_r2": round(m.prsquared, 4),
                }
            )
            print(f"\n{name}: {formula}")
            print(m.summary().tables[1])
        except Exception as exc:  # noqa: BLE001
            rows.append({"model": name, "error": str(exc)})
            print(f"\n{name} failed: {exc}")

    out = pd.DataFrame(rows)
    out_path = ROOT / "RESULTS.md"
    with out_path.open("a") as f:
        f.write("\n## Model table (03_wealth_control.py)\n\n")
        f.write(out.to_markdown(index=False))
        f.write("\n")
    return out


def main() -> None:
    founders = load_founders()
    combined = load_combined()
    print(f"Founders N={len(founders)} | Combined N={len(combined)}")
    if len(founders) < 30 or len(combined) < 100:
        print(
            "WARNING: Below pre-registered minimums (30 billionaires, 100 controls). "
            "Results are illustrative only — do not interpret as final."
        )

    crosstab_wealth(combined)
    fit_models(combined)


if __name__ == "__main__":
    main()
