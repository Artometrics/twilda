#!/usr/bin/env python3
"""05 — Dropout vs completer comparison among Stanford-affiliated billionaires."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _utils import load_founders  # noqa: E402


def main() -> None:
    df = load_founders()
    stanford = df[df["stanford_affiliated"] == 1]
    dropouts = stanford[stanford["stanford_type"].isin(["dropout"])]
    completers = stanford[stanford["stanford_type"].isin(["grad", "undergrad"])]

    print(f"Stanford-affiliated billionaires: {len(stanford)}")
    print(f"  Completers (grad/undergrad): {len(completers)}")
    print(f"  Dropouts / early exit:     {len(dropouts)}")
    for _, row in dropouts.iterrows():
        print(f"    - {row['name']} ({row['stanford_type']})")

    if len(dropouts) and len(completers):
        print(
            "\nInterpretation: if dropouts ≈ completers in outcome (all billionaires here), "
            "selection/admission may dominate over instruction."
        )
    else:
        print("\nInsufficient Stanford dropout/completer split in current seed data.")


if __name__ == "__main__":
    main()
