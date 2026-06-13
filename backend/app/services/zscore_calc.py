import pandas as pd
import math
import os
from app.core.config import settings

WHO_DIR = os.path.join(settings.DATA_DIR, 'who_lms_tables')
lhfa_boys = pd.read_csv(os.path.join(WHO_DIR, 'lhfa_boys.csv'))
lhfa_girls = pd.read_csv(os.path.join(WHO_DIR, 'lhfa_girls.csv'))
wfa_boys = pd.read_csv(os.path.join(WHO_DIR, 'wfa_boys.csv'))
wfa_girls = pd.read_csv(os.path.join(WHO_DIR, 'wfa_girls.csv'))

def calculate_zscore(measurement: float, l: float, m: float, s: float) -> float:
    if l == 0:
        return math.log(measurement / m) / s
    else:
        return (((measurement / m) ** l) - 1) / (l * s)

def analyze_stunting(gender: str, age_in_days: int, height_cm: float) -> dict:
    df = lhfa_boys if gender.lower() == 'male' else lhfa_girls
    
    row = df[df['Day'] == age_in_days]
    if row.empty:
        return {"error": "Age out of WHO reference range"}
    
    l, m, s = row['L'].values[0], row['M'].values[0], row['S'].values[0]
    z_score = round(calculate_zscore(height_cm, l, m, s), 2)
    
    if z_score < -3.0: status = "Sangat Pendek (Severely Stunted)"
    elif -3.0 <= z_score < -2.0: status = "Pendek (Stunted)"
    elif -2.0 <= z_score <= 3.0: status = "Normal"
    else: status = "Tinggi"
    return {"z_score": float(z_score), "status": status}

def analyze_weight(gender: str, age_in_days: int, weight_kg: float) -> dict:
    df = wfa_boys if gender.lower() == 'male' else wfa_girls
    
    row = df[df['Day'] == age_in_days]
    if row.empty:
        return {"error": "Age out of WHO reference range"}
    
    l, m, s = row['L'].values[0], row['M'].values[0], row['S'].values[0]
    z_score = round(calculate_zscore(weight_kg, l, m, s), 2)
    
    if z_score < -3.0: status = "Berat Badan Sangat Kurang (Severely Underweight)"
    elif -3.0 <= z_score < -2.0: status = "Berat Badan Kurang (Underweight)"
    elif -2.0 <= z_score <= 1.0: status = "Berat Badan Normal"
    else: status = "Risiko Berat Badan Lebih"

    return {"z_score": float(z_score), "status": status}