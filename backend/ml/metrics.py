from __future__ import annotations
from typing import Dict, List, Any
import numpy as np
from sklearn.metrics import f1_score, accuracy_score, classification_report, confusion_matrix

def compute_metrics(y_true, y_pred, labels: List[str]):
    f1m = f1_score(y_true, y_pred, average="macro", zero_division=0)
    acc = accuracy_score(y_true, y_pred)
    report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    return {
        "f1_macro": float(f1m),
        "accuracy": float(acc),
        "report": report,
        "confusion_matrix": cm.tolist(),
        "labels": labels,
    }