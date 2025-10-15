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
    # Deduplica e trim stringhe
    df2 = trim_strings(df)
    df2 = df2.drop_duplicates().reset_index(drop=True)
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
    df_prev = df.head(limit)
    return {
        "rows": len(df),
        "cols": len(df.columns),
        "preview": df_prev.to_dict(orient="records"),
        "columns": list(df.columns),
    }