import os
import pandas as pd

# Fichier d'entrée
file_path = r"C:\Users\chaym\Desktop\NasaChallenge\data\raw\Kepler.csv"

# Dossier de sortie
output_dir = r"C:\Users\chaym\Desktop\NasaChallenge\data\processed"
output_path = os.path.join(output_dir, "Kepler_filtered.csv")
os.makedirs(output_dir, exist_ok=True)

# Colonnes à garder
columns_to_keep = [
    "kepid", "kepoi_name", "koi_disposition",
    "koi_period", "koi_period_err1", "koi_period_err2",
    "koi_duration", "koi_duration_err1", "koi_duration_err2",
    "koi_depth", "koi_depth_err1", "koi_depth_err2",
    "koi_prad", "koi_prad_err1", "koi_prad_err2",
    "koi_srad", "koi_srad_err1", "koi_srad_err2","koi_model_snr"
]

# Charger le CSV en ignorant les commentaires
df = pd.read_csv(file_path, sep=",", comment="#", on_bad_lines="skip")

# Vérifier les colonnes disponibles
available_cols = [col for col in columns_to_keep if col in df.columns]
missing_cols = [col for col in columns_to_keep if col not in df.columns]

print("Colonnes conservées :", available_cols)
print("Colonnes manquantes :", missing_cols)

# Garder seulement les colonnes valides
df_selected = df[available_cols]

# Sauvegarde
df_selected.to_csv(output_path, index=False)
print(f"Fichier filtré sauvegardé dans : {output_path}")
