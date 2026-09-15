"""WHO child growth standards: LMS-based z-score calculation.

Reference tables (backend/data/who_lms_tables) are indexed by age in days,
0..1856 (birth to 5 years), one row per day.
"""
import math
import os

import pandas as pd

from app.core.config import settings

WHO_DIR = os.path.join(settings.DATA_DIR, "who_lms_tables")


def _load(name: str, index: str = "Day") -> pd.DataFrame:
    df = pd.read_csv(os.path.join(WHO_DIR, f"{name}.csv"))
    if index != "Day":
        df[index] = (df[index] * 10).round().astype(int)
    return df.set_index(index)[["L", "M", "S"]]


TABLES = {
    ("lhfa", "male"): _load("lhfa_boys"),
    ("lhfa", "female"): _load("lhfa_girls"),
    ("wfa", "male"): _load("wfa_boys"),
    ("wfa", "female"): _load("wfa_girls"),
    ("bfa", "male"): _load("bfa_boys"),
    ("bfa", "female"): _load("bfa_girls"),
}

LENGTH_TABLES = {
    ("wfl", "male"): _load("wfl_boys", "Length"),
    ("wfl", "female"): _load("wfl_girls", "Length"),
    ("wfh", "male"): _load("wfh_boys", "Height"),
    ("wfh", "female"): _load("wfh_girls", "Height"),
}

MAX_AGE_DAYS = int(TABLES[("lhfa", "male")].index.max())
TWO_YEARS_DAYS = 731


def normalize_gender(gender: str) -> str:
    g = (gender or "").strip().lower()
    if g in ("male", "boy", "m", "l", "laki-laki"):
        return "male"
    if g in ("female", "girl", "f", "p", "perempuan"):
        return "female"
    raise ValueError(f"Unknown gender: {gender!r}")


def calculate_zscore(measurement: float, l: float, m: float, s: float) -> float:
    if l == 0:
        return math.log(measurement / m) / s
    return (((measurement / m) ** l) - 1) / (l * s)


def lms_value_at_z(z: float, l: float, m: float, s: float) -> float:
    """Inverse of calculate_zscore: the measurement at a given z-score."""
    if l == 0:
        return m * math.exp(s * z)
    return m * (1 + l * s * z) ** (1 / l)


NOT_COMPUTED = "Belum dihitung (Not computed)"


def classify_stunting(z: float | None) -> str:
    if z is None:
        return NOT_COMPUTED
    if z < -3.0:
        return "Sangat Pendek (Severely Stunted)"
    if z < -2.0:
        return "Pendek (Stunted)"
    if z <= 3.0:
        return "Normal"
    return "Tinggi"


def classify_weight(z: float | None) -> str:
    if z is None:
        return NOT_COMPUTED
    if z < -3.0:
        return "Berat Badan Sangat Kurang (Severely Underweight)"
    if z < -2.0:
        return "Berat Badan Kurang (Underweight)"
    if z <= 1.0:
        return "Berat Badan Normal"
    return "Risiko Berat Badan Lebih"


def classify_wasting(z: float | None) -> str:
    """Weight-for-length/height and BMI-for-age share the Permenkes 2/2020 cut-offs."""
    if z is None:
        return NOT_COMPUTED
    if z < -3.0:
        return "Gizi Buruk (Severely Wasted)"
    if z < -2.0:
        return "Gizi Kurang (Wasted)"
    if z <= 1.0:
        return "Gizi Baik (Normal)"
    if z <= 2.0:
        return "Berisiko Gizi Lebih (Possible risk of overweight)"
    if z <= 3.0:
        return "Gizi Lebih (Overweight)"
    return "Obesitas (Obese)"


def _lookup(metric: str, gender: str, age_in_days: int):
    table = TABLES[(metric, normalize_gender(gender))]
    if age_in_days < 0 or age_in_days > MAX_AGE_DAYS:
        raise ValueError(
            f"Age {age_in_days} days is outside the WHO reference range (0-{MAX_AGE_DAYS} days)"
        )
    row = table.loc[age_in_days]
    return float(row["L"]), float(row["M"]), float(row["S"])


def _analyze(metric: str, gender: str, age_in_days: int, value: float, classify) -> dict:
    if value is None or value <= 0:
        return {"error": "Measurement must be a positive number"}
    try:
        l, m, s = _lookup(metric, gender, age_in_days)
    except (ValueError, KeyError) as exc:
        return {"error": str(exc)}
    z = round(calculate_zscore(value, l, m, s), 2)
    return {"z_score": float(z), "status": classify(z)}


def analyze_stunting(gender: str, age_in_days: int, height_cm: float) -> dict:
    """Length/height-for-age."""
    return _analyze("lhfa", gender, age_in_days, height_cm, classify_stunting)


def analyze_weight(gender: str, age_in_days: int, weight_kg: float) -> dict:
    """Weight-for-age."""
    return _analyze("wfa", gender, age_in_days, weight_kg, classify_weight)


def bmi(weight_kg: float, height_cm: float) -> float:
    return round(weight_kg / ((height_cm / 100) ** 2), 2)


def analyze_bmi(gender: str, age_in_days: int, weight_kg: float, height_cm: float) -> dict:
    """BMI-for-age."""
    if height_cm <= 0 or weight_kg <= 0:
        return {"error": "Measurement must be a positive number"}
    result = _analyze("bfa", gender, age_in_days, bmi(weight_kg, height_cm), classify_wasting)
    if "error" not in result:
        result["bmi"] = bmi(weight_kg, height_cm)
    return result


def analyze_wasting(gender: str, age_in_days: int, weight_kg: float, height_cm: float) -> dict:
    """Weight-for-length (under 2 years) or weight-for-height (2-5 years)."""
    if weight_kg <= 0 or height_cm <= 0:
        return {"error": "Measurement must be a positive number"}
    metric = "wfl" if age_in_days < TWO_YEARS_DAYS else "wfh"
    try:
        table = LENGTH_TABLES[(metric, normalize_gender(gender))]
    except ValueError as exc:
        return {"error": str(exc)}
    key = int(round(height_cm * 10))
    lo, hi = int(table.index.min()), int(table.index.max())
    if key < lo or key > hi:
        return {
            "error": f"Height {height_cm} cm is outside the WHO {metric} range ({lo / 10:.0f}-{hi / 10:.0f} cm)"
        }
    row = table.loc[key]
    z = round(calculate_zscore(weight_kg, float(row["L"]), float(row["M"]), float(row["S"])), 2)
    return {"z_score": float(z), "status": classify_wasting(z), "metric": metric}
