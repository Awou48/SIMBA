"""AKG 2019 (Indonesian recommended dietary allowance) comparison for toddlers."""
import os
import re

import pandas as pd

from app.core.config import settings

_AKG_PATH = os.path.join(settings.DATA_DIR, "local_reference", "toddler_akg_2019.csv")


def _parse_bracket(label: str) -> tuple[int, int] | None:
    """'0-5 bulan' -> (0, 5); '1-3 tahun' -> (12, 47). Returns None if unparseable."""
    text = str(label).lower()
    nums = re.findall(r"\d+", text)
    if len(nums) != 2:
        return None
    lo, hi = int(nums[0]), int(nums[1])
    if "th" in text or "tahun" in text or "yr" in text or "year" in text:
        return lo * 12, hi * 12 + 11
    return lo, hi


def _load_brackets() -> list[dict]:
    df = pd.read_csv(_AKG_PATH)
    brackets = []
    for _, row in df.iterrows():
        span = _parse_bracket(row["Kelompok_Umur"])
        if span is None:
            continue
        brackets.append(
            {
                "label": str(row["Kelompok_Umur"]),
                "min_months": span[0],
                "max_months": span[1],
                "energy": float(row["Energi_kkal"]),
                "protein": float(row["Protein_g"]),
                "fat": float(row["Lemak_Total_g"]),
                "carbs": float(row["Karbohidrat_g"]),
            }
        )
    return brackets


AKG_BRACKETS = _load_brackets()


def find_akg_bracket(age_in_months: int) -> dict | None:
    for b in AKG_BRACKETS:
        if b["min_months"] <= age_in_months <= b["max_months"]:
            return b
    return None


def _pct(actual: float, target: float) -> float:
    return round(actual / target * 100, 2) if target else 0.0


def calculate_akg_fulfillment(age_in_months: int, total_protein: float, total_energy: float) -> dict:
    bracket = find_akg_bracket(age_in_months)
    if bracket is None:
        return {"error": f"Age {age_in_months} months not found in AKG data brackets"}

    return {
        "age_in_months": age_in_months,
        "age_bracket_found": bracket["label"],
        "target_protein": bracket["protein"],
        "target_energy": bracket["energy"],
        "target_fat": bracket["fat"],
        "target_carbs": bracket["carbs"],
        "protein_fulfillment_percent": _pct(total_protein, bracket["protein"]),
        "energy_fulfillment_percent": _pct(total_energy, bracket["energy"]),
    }


def daily_targets(age_in_months: int) -> dict | None:
    """Energy/protein/fat/carbs AKG targets for an age, or None if out of range."""
    bracket = find_akg_bracket(age_in_months)
    if bracket is None:
        return None
    return {
        "label": bracket["label"],
        "energy": bracket["energy"],
        "protein": bracket["protein"],
        "carbs": bracket["carbs"],
        "fat": bracket["fat"],
    }
