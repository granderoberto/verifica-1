from __future__ import annotations
import time
import uuid
import json
import os
from typing import Dict, Any, List
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV, RandomizedSearchCV, StratifiedKFold
from sklearn.utils.multiclass import unique_labels
from sklearn.preprocessing import LabelEncoder
from typing import Any, Dict, List, Protocol, runtime_checkable, cast
from .dataio import EXCLUDE_COLS, TARGET_DEFAULT
from .pipeline import make_model_specs, build_pipeline
from .metrics import compute_metrics

EXPORT_DIR = os.path.join(os.path.dirname(__file__), "..", "exports")
os.makedirs(EXPORT_DIR, exist_ok=True)

@runtime_checkable
class HasPredict(Protocol):
    def predict(self, X: Any) -> Any: ...

class RunStore:
    def __init__(self):
        self.runs: Dict[str, Dict[str, Any]] = {}

    def create(self, best_estimator, metadata: Dict[str, Any]) -> str:
        run_id = str(uuid.uuid4())
        self.runs[run_id] = {
            "best_estimator": best_estimator,
            "metadata": metadata,
        }
        return run_id

    def get(self, run_id: str):
        return self.runs.get(run_id)

    def reset(self):
        self.runs.clear()


RUNS = RunStore()


def train_multi_model(
    df: pd.DataFrame,
    target: str = TARGET_DEFAULT,
    test_size: float = 0.2,
    random_state: int = 42,
    cv: int = 5,
    scoring: str = "f1_macro",
    use_class_weight: bool = True,
    selected_models: List[str] | None = None,
    search: str = "grid",
    max_iters: int = 20,
) -> Dict[str, Any]:
    """
    Esegue il training multi-modello con Grid/Random Search e restituisce:
    - results: lista con metriche per ogni modello
    - best_overall: il migliore per F1-macro
    - run_id: per download modello/metadata
    """

    if selected_models is None:
        selected_models = ["logreg", "svc", "knn", "dt", "rf", "nb"]

    # Escludi colonne non desiderate
    df = df[[c for c in df.columns if c not in EXCLUDE_COLS]].copy()

    # Feature/Target
    if target not in df.columns:
        raise ValueError(f"Target '{target}' non presente nelle colonne.")

    X = df[[c for c in df.columns if c != target]]
    y_raw = df[target].astype(str)

    # Label encoding del target (fix per k-NN e robustezza generale)
    le = LabelEncoder()
    y_all = le.fit_transform(y_raw)

    # Split stratificato
    X_train, X_test, y_train_enc, y_test_enc = train_test_split(
        X, y_all, test_size=test_size, random_state=random_state, stratify=y_all
    )

    # Rileva tipi colonna per il ColumnTransformer
    numeric_cols = [c for c in X.columns if X[c].dtype.kind in "if"]
    categorical_cols = [c for c in X.columns if X[c].dtype.kind not in "if"]

    # CV
    cv_splitter = StratifiedKFold(n_splits=cv, shuffle=True, random_state=random_state)

    model_specs = make_model_specs(use_class_weight)
    results: List[Dict[str, Any]] = []
    best_overall: Dict[str, Any] | None = None
    best_estimator = None

    for key in selected_models:
        if key not in model_specs:
            continue

        spec = model_specs[key]
        pipe = build_pipeline(spec, numeric_cols, categorical_cols)
        param_grid = spec.param_grid

        # Searcher
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
        train_time = time.time() - t0

        # Predizione su test
        best_est = cast(HasPredict, searcher.best_estimator_)  # Pylance ora sa che ha .predict
        y_pred_enc = best_est.predict(X_test)
        # Inverse-transform a etichette originali
        y_true = le.inverse_transform(y_test_enc)
        y_pred = le.inverse_transform(y_pred_enc)

        # Labels per confusion matrix nell'ordine naturale
        labels = list(le.classes_)

        met = compute_metrics(y_true, y_pred, labels)

        res = {
            "key": key,
            "name": spec.name,
            "best_params": searcher.best_params_,
            "metrics": met,
            "train_time_s": round(train_time, 3),
        }
        results.append(res)

        # Best by f1-macro
        if (best_overall is None) or (met["f1_macro"] > best_overall["metrics"]["f1_macro"]):
            best_overall = res
            best_estimator = searcher.best_estimator_

    # Dopo il for sui modelli, prima dei metadata
    if best_overall is None or best_estimator is None:
        raise ValueError(
            "Nessun risultato disponibile: verifica che 'selected_models' non sia vuoto e "
            "che almeno un modello abbia completato il training."
        )
    
    # Metadata best
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
        "class_labels": list(le.classes_),
    }

    run_id = RUNS.create(best_estimator, metadata)

    return {
        "run_id": run_id,
        "results": results,
        "best_overall": best_overall,
    }


def export_model(run_id: str):
    """Salva il modello best e i metadata su disco e restituisce i percorsi (pkl_path, json_path)."""
    entry = RUNS.get(run_id)
    if not entry:
        raise ValueError("run_id non valido")
    model = entry["best_estimator"]
    meta = entry["metadata"]

    pkl_path = os.path.join(EXPORT_DIR, f"best_model_{run_id}.pkl")
    json_path = os.path.join(EXPORT_DIR, f"metadata_{run_id}.json")

    from joblib import dump  # import locale per ridurre overhead all'import
    dump(model, pkl_path)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    return pkl_path, json_path

# Deve esistere già qualcosa tipo: RUNS = {}
# Se è un oggetto custom, lascia com’è.

def reset_runs():
    """Svuota l'archivio dei run, indipendentemente dall'implementazione interna."""
    try:
        # se RUNS è un dict o espone clear()
        RUNS.clear()  # type: ignore[attr-defined]
        return
    except Exception:
        pass

    # fallback per implementazioni custom: RUNS.store (dict interno)
    if hasattr(RUNS, "store") and isinstance(RUNS.store, dict):  # type: ignore[attr-defined]
        RUNS.store.clear()  # type: ignore[attr-defined]
        return

    # ultimo fallback: rimpiazza le chiavi se è mappabile
    try:
        for k in list(RUNS.keys()):  # type: ignore[attr-defined]
            del RUNS[k]  # type: ignore[index]
    except Exception:
        # se proprio non è gestibile, ignora
        pass