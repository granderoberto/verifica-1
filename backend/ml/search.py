from __future__ import annotations

import json
import os
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable, cast

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import (
    GridSearchCV,
    RandomizedSearchCV,
    StratifiedKFold,
    train_test_split,
)
from sklearn.preprocessing import LabelEncoder

from .dataio import EXCLUDE_COLS, TARGET_DEFAULT
from .metrics import compute_metrics
from .pipeline import build_pipeline, make_model_specs


# ────────────────────────────────────────────────────────────────────────────────
# Persistenza export
# ────────────────────────────────────────────────────────────────────────────────
EXPORT_DIR = Path(__file__).resolve().parent.parent / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)


# ────────────────────────────────────────────────────────────────────────────────
# Tipi/utility
# ────────────────────────────────────────────────────────────────────────────────
@runtime_checkable
class HasPredict(Protocol):
    def predict(self, X: Any) -> Any: ...


class RunStore:
    """
    Mini store in memoria per conservare il best estimator e i suoi metadata
    per ciascun run. Niente DB per scelta progettuale.
    """
    def __init__(self) -> None:
        self.runs: Dict[str, Dict[str, Any]] = {}

    def create(self, best_estimator: Any, metadata: Dict[str, Any]) -> str:
        run_id = str(uuid.uuid4())
        self.runs[run_id] = {
            "best_estimator": best_estimator,
            "metadata": metadata,
        }
        return run_id

    def get(self, run_id: str) -> Optional[Dict[str, Any]]:
        return self.runs.get(run_id)

    # offro sia clear() che reset() per compatibilità con l'app
    def clear(self) -> None:
        self.runs.clear()

    def reset(self) -> None:
        self.clear()


RUNS = RunStore()


# ────────────────────────────────────────────────────────────────────────────────
# Training multi-modello
# ────────────────────────────────────────────────────────────────────────────────
def train_multi_model(
    df: pd.DataFrame,
    target: str = TARGET_DEFAULT,
    test_size: float = 0.2,
    random_state: int = 42,
    cv: int = 5,
    scoring: str = "f1_macro",
    use_class_weight: bool = True,
    selected_models: Optional[List[str]] = None,
    search: str = "grid",  # "grid" | "random"
    max_iters: int = 20,
) -> Dict[str, Any]:
    """
    Esegue il training multi-modello (pipelines + CV + hyperparameter search)
    restituendo:
      - results: lista con metriche e iperparametri per ciascun modello
      - best_overall: modello migliore per F1-macro
      - run_id: id per scaricare .pkl e metadata .json
    """
    if selected_models is None or len(selected_models) == 0:
        selected_models = ["logreg", "svc", "knn", "dt", "rf", "nb"]

    # Escludi colonne indesiderate a monte
    df = df[[c for c in df.columns if c not in EXCLUDE_COLS]].copy()

    if target not in df.columns:
        raise ValueError(f"Target '{target}' non presente nelle colonne del dataset.")

    # Feature / Target
    X = df.drop(columns=[target])
    y_raw = df[target].astype(str)

    # Label encoding del target per stabilità (es. k-NN)
    le = LabelEncoder()
    y_all = le.fit_transform(y_raw)
    labels_order = list(le.classes_)  # ordine FISSO usato per CM e UI

    # Train/test split stratificato
    X_train, X_test, y_train_enc, y_test_enc = train_test_split(
        X, y_all, test_size=test_size, random_state=random_state, stratify=y_all
    )

    # Rileva colonne numeriche/categoriche per il ColumnTransformer
    numeric_cols = [c for c in X.columns if X[c].dtype.kind in "if"]
    categorical_cols = [c for c in X.columns if X[c].dtype.kind not in "if"]

    # CV splitter
    cv_splitter = StratifiedKFold(n_splits=cv, shuffle=True, random_state=random_state)

    # Specifiche modelli e griglie
    model_specs = make_model_specs(use_class_weight)

    results: List[Dict[str, Any]] = []
    best_overall: Optional[Dict[str, Any]] = None
    best_estimator: Optional[Any] = None

    for key in selected_models:
        if key not in model_specs:
            # modello non supportato: skip silenzioso
            continue

        spec = model_specs[key]
        pipe = build_pipeline(spec, numeric_cols, categorical_cols)
        param_grid = spec.param_grid

        # Se "random", limitiamo n_iter al numero di combinazioni o a max_iters
        if search == "random":
            total = 1
            for v in param_grid.values():
                total *= len(v)
            n_iter = min(max_iters, total)
            searcher = RandomizedSearchCV(
                estimator=pipe,
                param_distributions=param_grid,
                n_iter=n_iter,
                scoring=scoring,
                cv=cv_splitter,
                n_jobs=-1,
                refit=True,
                random_state=random_state,
                verbose=0,
            )
        else:
            searcher = GridSearchCV(
                estimator=pipe,
                param_grid=param_grid,
                scoring=scoring,
                cv=cv_splitter,
                n_jobs=-1,
                refit=True,
                verbose=0,
            )

        t0 = time.time()
        searcher.fit(X_train, y_train_enc)
        train_time = round(time.time() - t0, 3)

        # Predizione su test con il best estimator
        best_est = cast(HasPredict, searcher.best_estimator_)
        y_pred_enc = best_est.predict(X_test)

        # Torna alle etichette originali (stringhe) per report e CM
        y_true = le.inverse_transform(y_test_enc)
        y_pred = le.inverse_transform(y_pred_enc)

        # Calcolo metriche coerenti e complete (F1-macro, accuracy, report, CM, labels)
        # compute_metrics deve creare la CM con labels=labels_order e restituire anche "labels"
        metrics = compute_metrics(y_true, y_pred, labels_order)

        res = {
            "key": key,
            "name": spec.name,
            "best_params": searcher.best_params_,
            "metrics": metrics,
            "train_time_s": train_time,
        }
        results.append(res)

        if (best_overall is None) or (metrics["f1_macro"] > best_overall["metrics"]["f1_macro"]):
            best_overall = res
            best_estimator = searcher.best_estimator_

    if best_overall is None or best_estimator is None:
        raise ValueError(
            "Nessun modello ha prodotto risultati. Verifica 'selected_models' e i dati forniti."
        )

    # Metadata del best model (utili per export e audit)
    metadata = {
        "run_created_at": pd.Timestamp.utcnow().isoformat(),
        "target": target,
        "test_size": test_size,
        "random_state": random_state,
        "cv": cv,
        "scoring": scoring,
        "selected_models": selected_models,
        "best_model": {
            "key": best_overall["key"],
            "name": best_overall["name"],
            "best_params": best_overall["best_params"],
            "metrics": best_overall["metrics"],
        },
        "feature_schema": {
            "numeric": numeric_cols,
            "categorical": categorical_cols,
        },
        "columns": list(X.columns),
        "class_labels": labels_order,
    }

    run_id = RUNS.create(best_estimator, metadata)

    return {
        "run_id": run_id,
        "results": results,
        "best_overall": best_overall,
    }


# ────────────────────────────────────────────────────────────────────────────────
# Export del best model e metadata
# ────────────────────────────────────────────────────────────────────────────────
def export_model(run_id: str) -> tuple[str, str]:
    """
    Salva su disco il modello migliore e i metadati del run.
    Ritorna (pkl_path, json_path).
    """
    entry = RUNS.get(run_id)
    if not entry:
        raise ValueError("run_id non valido")

    model = entry["best_estimator"]
    meta = entry["metadata"]

    pkl_path = EXPORT_DIR / f"best_model_{run_id}.pkl"
    json_path = EXPORT_DIR / f"metadata_{run_id}.json"

    # import locale per evitare overhead all'import modulo
    from joblib import dump

    dump(model, pkl_path)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    return str(pkl_path), str(json_path)


# ────────────────────────────────────────────────────────────────────────────────
# Reset runs (usato dall'endpoint /api/reset)
# ────────────────────────────────────────────────────────────────────────────────
def reset_runs() -> None:
    """
    Svuota l'archivio dei run indipendentemente dall'implementazione.
    """
    try:
        RUNS.clear()
        return
    except Exception:
        pass

    if hasattr(RUNS, "store") and isinstance(getattr(RUNS, "store"), dict):
        RUNS.store.clear()  # type: ignore[attr-defined]
        return

    try:
        for k in list(RUNS.keys()):  # type: ignore[attr-defined]
            del RUNS[k]              # type: ignore[index]
    except Exception:
        pass