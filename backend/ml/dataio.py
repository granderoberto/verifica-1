from __future__ import annotations
import io
from typing import Dict, List, Tuple
import pandas as pd

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET_PATH =  Path(__file__).resolve().parent / "data" / "dataset.xml"

# Feature schema (vincoli dal brief)
NUMERIC_COLS = ["Age", "FCVC", "NCP", "CH2O", "FAF", "TUE"]
CATEGORICAL_COLS = ["Gender", "family_history_with_overweight", "FAVC", "CAEC", "SMOKE", "SCC", "CALC", "MTRANS"]
TARGET_DEFAULT = "NObeyesdad"
EXCLUDE_COLS = ["Id"]


def read_xml_bytes(data: bytes, xpath: str = ".//row") -> pd.DataFrame:
    buf = io.BytesIO(data)
    df = pd.read_xml(buf, xpath=xpath)
    return df


def read_xml_file(path: str = str(DEFAULT_DATASET_PATH), xpath: str = ".//row") -> pd.DataFrame:
    # Usa file handle per evitare il FutureWarning “Passing literal xml…”
    with open(path, "rb") as f:
        df = pd.read_xml(f, xpath=xpath)
    return df


def trim_strings(df: pd.DataFrame) -> pd.DataFrame:
    df2 = df.copy()
    obj_cols = df2.select_dtypes(include=["object"]).columns
    for col in obj_cols:
        df2[col] = df2[col].astype(str).str.strip()
    return df2


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Pulizia leggera (pre-imputazione):
    - trim stringhe
    - deduplica
    - normalizza token di missing in NaN (unknown, na, ?, stringa vuota)
    - forza il tipo numerico sulle colonne numeriche (valori non validi -> NaN)
    - rimuove eventuali colonne costanti
    Nota: l'imputazione dei NaN è delegata alla Pipeline (SimpleImputer).
    """
    df2 = trim_strings(df)
    df2 = df2.drop_duplicates().reset_index(drop=True)

    # 1) normalizza missing comuni
    missing_tokens = ["unknown", "Unknown", "UNKWN", "na", "NA", "NaN", "?", ""]
    df2 = df2.replace(missing_tokens, pd.NA)

    # 2) forza tipo numerico sulle colonne dichiarate numeriche (se esistono nel DF)
    for col in NUMERIC_COLS:
        if col in df2.columns:
            df2[col] = pd.to_numeric(df2[col], errors="coerce")

    # 3) rimuovi colonne costanti (stessa singola modalità)
    nunique = df2.nunique(dropna=False)
    constant_cols = nunique[nunique <= 1].index.tolist()
    # tieni il target anche se costante, per sicurezza
    constant_cols = [c for c in constant_cols if c not in (TARGET_DEFAULT,)]
    if constant_cols:
        df2 = df2.drop(columns=constant_cols, errors="ignore")

    return df2

def get_feature_sets(df: pd.DataFrame) -> Tuple[List[str], List[str]]:
    nums = [c for c in NUMERIC_COLS if c in df.columns]
    cats = [c for c in CATEGORICAL_COLS if c in df.columns]
    return nums, cats


def exclude_columns(df: pd.DataFrame) -> pd.DataFrame:
    cols = [c for c in df.columns if c not in EXCLUDE_COLS]
    return df[cols].copy()


def load_default_or_raise() -> pd.DataFrame:
    return read_xml_file(str(DEFAULT_DATASET_PATH))


def preview_records(df: pd.DataFrame, limit: int = 5) -> Dict:
    # escludi colonne vietate (es. Id), poi pulisci
    df_view = exclude_columns(df)
    df_view = clean_dataframe(df_view)

    df_prev = df_view.head(limit)
    return {
        "rows": len(df_view),
        "cols": len(df_view.columns),
        "preview": df_prev.to_dict(orient="records"),
        "columns": list(df_view.columns),
    }

# === Helper comodi per “leggi → escludi → pulisci” ===
def read_and_prepare_from_file(path: str = str(DEFAULT_DATASET_PATH), xpath: str = ".//row") -> pd.DataFrame:
    with open(path, "rb") as f:
        df = pd.read_xml(f, xpath=xpath)
    df = exclude_columns(df)
    df = clean_dataframe(df)
    return df


def read_and_prepare_from_bytes(data: bytes, xpath: str = ".//row") -> pd.DataFrame:
    buf = io.BytesIO(data)
    df = pd.read_xml(buf, xpath=xpath)
    df = exclude_columns(df)
    df = clean_dataframe(df)
    return df