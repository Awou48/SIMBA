import pandas as pd
import os
import re
from app.core.config import settings

def calculate_akg_fulfillment(age_in_months: int, total_protein: float, total_energy: float) -> dict:
    file_location = os.path.join(settings.DATA_DIR, 'local_reference', 'toddler_akg_2019.csv')
    df = pd.read_csv(file_location)
    target_row = pd.DataFrame()

    for index, row in df.iterrows():
        umur_str = str(row['Kelompok_Umur']).lower()
        nums = re.findall(r'\d+', umur_str)
        
        if len(nums) == 2:
            min_val = int(nums[0])
            max_val = int(nums[1])
            if 'th' in umur_str or 'tahun' in umur_str:
                min_months = min_val * 12
                max_months = (max_val * 12) + 11  
            else:
                min_months = min_val
                max_months = max_val
                
            if min_months <= age_in_months <= max_months:
                target_row = df.iloc[[index]]
                break
                
    if target_row.empty:
        return {"error": f"Age {age_in_months} months not found in AKG data brackets"}
    target_protein = target_row['Protein_g'].values[0]
    target_energy = target_row['Energi_kkal'].values[0]
    
    protein_percent = (total_protein / target_protein) * 100
    energy_percent = (total_energy / target_energy) * 100
    
    return {
        "age_bracket_found": str(target_row['Kelompok_Umur'].values[0]), 
        "target_protein": float(target_protein),
        "target_energy": float(target_energy),
        "protein_fulfillment_percent": round(float(protein_percent), 2),
        "energy_fulfillment_percent": round(float(energy_percent), 2)
    }