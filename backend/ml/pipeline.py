from __future__ import annotations
from typing import Dict, List, Tuple
from dataclasses import dataclass
from sklearn.base import TransformerMixin          
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import GaussianNB


@dataclass
class ModelSpec:
    key: str
    name: str
    estimator: object
    param_grid: Dict[str, List]

def make_preprocessor(numeric_cols: List[str], categorical_cols: List[str], scale_numeric: bool) -> ColumnTransformer:
    # Tipizza come lista di (nome, trasformatore) dove il trasformatore implementa TransformerMixin
    num_steps: List[Tuple[str, TransformerMixin]] = [
        ("imputer", SimpleImputer(strategy="median"))
    ]
    if scale_numeric:
        num_steps.append(("scaler", StandardScaler()))

    num_pipe = Pipeline(steps=num_steps)

    cat_steps: List[Tuple[str, TransformerMixin]] = [
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ]
    cat_pipe = Pipeline(steps=cat_steps)

    pre = ColumnTransformer(
        transformers=[
            ("num", num_pipe, numeric_cols),
            ("cat", cat_pipe, categorical_cols),
        ],
        remainder="drop",
    )
    return pre


def make_model_specs(use_class_weight: bool):
    cw = "balanced" if use_class_weight else None

    models = {
        "logreg": ModelSpec(
            key="logreg",
            name="Logistic Regression",
            estimator=LogisticRegression(solver="lbfgs", max_iter=500, class_weight=cw),
            param_grid={
                "clf__C": [0.1, 1, 10],
                "clf__class_weight": [cw] if cw else [None],
            },
        ),
        "svc": ModelSpec(
            key="svc",
            name="SVM (SVC)",
            estimator=SVC(probability=False, class_weight=cw),
            param_grid={
                "clf__kernel": ["rbf", "linear"],
                "clf__C": [0.1, 1, 10],
                "clf__gamma": ["scale", "auto"],
                "clf__class_weight": [cw] if cw else [None],
            },
        ),
        "knn": ModelSpec(
            key="knn",
            name="k-NN",
            estimator=KNeighborsClassifier(),
            param_grid={
                "clf__n_neighbors": [3, 5, 7, 9],
                "clf__weights": ["uniform", "distance"],
                "clf__p": [1, 2],
            },
        ),
        "dt": ModelSpec(
            key="dt",
            name="Decision Tree",
            estimator=DecisionTreeClassifier(class_weight=cw, random_state=42),
            param_grid={
                "clf__max_depth": [None, 5, 10, 20],
                "clf__min_samples_split": [2, 5, 10],
                "clf__class_weight": [cw] if cw else [None],
            },
        ),
        "rf": ModelSpec(
            key="rf",
            name="Random Forest",
            estimator=RandomForestClassifier(n_estimators=100, class_weight=cw, random_state=42, n_jobs=-1),
            param_grid={
                "clf__n_estimators": [100, 200],
                "clf__max_depth": [None, 10, 20],
                "clf__min_samples_split": [2, 5],
                "clf__class_weight": [cw] if cw else [None],
            },
        ),
        "nb": ModelSpec(
            key="nb",
            name="Gaussian Naive Bayes",
            estimator=GaussianNB(),
            param_grid={
                "clf__var_smoothing": [1e-9, 1e-8, 1e-7],
            },
        ),
    }
    return models


def build_pipeline(spec: ModelSpec, numeric_cols: List[str], categorical_cols: List[str]) -> Pipeline:
    # scaling solo per LR/SVC/kNN
    scale = spec.key in {"logreg", "svc", "knn"}
    pre = make_preprocessor(numeric_cols, categorical_cols, scale_numeric=scale)

    pipe = Pipeline(steps=[
        ("pre", pre),
        ("clf", spec.estimator),
    ])
    return pipe