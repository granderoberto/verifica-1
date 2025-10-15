from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Dict, Any

import pandas as pd
from fastapi import FastAPI, UploadFile, File, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, Response
from pydantic import BaseModel, Field

# ── ML utils (nostri moduli)
from ml.dataio import (
    read_and_prepare_from_bytes,
    read_and_prepare_from_file,
    preview_records,
    TARGET_DEFAULT,
)
from ml.search import train_multi_model, export_model, RUNS, reset_runs  # usa le tue funzioni esistenti

# ────────────────────────────────────────────────────────────────────────────────
# Config
# ────────────────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET_PATH = BASE_DIR / "ml" / "data" / "dataset.xml"

app = FastAPI(title="ML SPA XML", version="1.0.0")

# Consenti richieste dal frontend Vite (localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache in memoria dell'ultimo DataFrame caricato/pulito
CURRENT_DF: Optional[pd.DataFrame] = None


# ────────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ────────────────────────────────────────────────────────────────────────────────

class TrainPayload(BaseModel):
    target: str = Field(TARGET_DEFAULT, description="Nome colonna target")
    test_size: float = Field(0.2, ge=0.05, le=0.5)
    random_state: int = 42
    cv: int = Field(5, ge=2, le=10)
    scoring: str = Field("f1_macro")
    use_class_weight: bool = True
    selected_models: List[str] = Field(
        default_factory=lambda: ["logreg", "svc", "knn", "dt", "rf", "nb"]
    )
    search: str = Field("grid", description="grid | random")
    max_iters: int = Field(20, ge=1, description="Budget per RandomizedSearch (se usato)")


# ────────────────────────────────────────────────────────────────────────────────
# Helpers interni
# ────────────────────────────────────────────────────────────────────────────────

def _get_active_df() -> pd.DataFrame:
    """
    Restituisce il DF attivo in memoria se presente,
    altrimenti carica quello di default dal disco (pulito).
    """
    global CURRENT_DF
    if CURRENT_DF is not None:
        return CURRENT_DF
    # fallback: dataset di default
    df = read_and_prepare_from_file(str(DEFAULT_DATASET_PATH))
    CURRENT_DF = df
    return df


# ────────────────────────────────────────────────────────────────────────────────
# API
# ────────────────────────────────────────────────────────────────────────────────

@app.post("/api/upload-xml")
async def upload_xml(file: UploadFile | None = File(default=None)) -> JSONResponse:
    """
    Carica un XML (multipart). Se assente, usa dataset predefinito.
    Esegue: read → exclude → clean. Salva in memoria CURRENT_DF.
    Ritorna anteprima (prime righe post-cleaning).
    """
    global CURRENT_DF
    try:
        if file is not None:
            data = await file.read()
            df = read_and_prepare_from_bytes(data)
            CURRENT_DF = df
        else:
            df = read_and_prepare_from_file(str(DEFAULT_DATASET_PATH))
            CURRENT_DF = df

        prev = preview_records(df, limit=5)
        return JSONResponse(content=prev)
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Errore parsing XML: {str(e)}"},
        )


@app.get("/api/preview")
def api_preview(limit: int = Query(5, ge=1, le=50)) -> JSONResponse:
    """
    Anteprima N righe dal DF attivo (post-cleaning).
    """
    try:
        df = _get_active_df()
        prev = preview_records(df, limit=limit)
        return JSONResponse(content=prev)
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Impossibile generare l'anteprima: {str(e)}"},
        )


@app.post("/api/train")
def api_train(payload: TrainPayload) -> JSONResponse:
    """
    Avvia training multi-modello (Grid/Random CV=5) sul DF attivo.
    Ritorna risultati per modello + best_overall + run_id.
    """
    try:
        df = _get_active_df()
        out: Dict[str, Any] = train_multi_model(
            df=df,
            target=payload.target,
            test_size=payload.test_size,
            random_state=payload.random_state,
            cv=payload.cv,
            scoring=payload.scoring,
            use_class_weight=payload.use_class_weight,
            selected_models=payload.selected_models,
            search=payload.search,
            max_iters=payload.max_iters,
        )
        # Nota: assicurati che train_multi_model ritorni dict con keys
        # {"results": [...], "best_overall": {...}, "run_id": "..."}
        return JSONResponse(content=out)
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Errore durante il training: {str(e)}"},
        )


@app.get("/api/best")
def api_best(run_id: str = Query(...)) -> JSONResponse:
    """
    Ritorna il riepilogo del miglior modello per un run.
    """
    try:
        entry = RUNS.get(run_id)
        if not entry:
            return JSONResponse(status_code=404, content={"error": "run_id non trovato"})
        best = entry.get("best_overall") or entry.get("best") or {}
        return JSONResponse(content=best)
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Errore nel recupero best model: {str(e)}"},
        )


@app.get("/api/download/model")
def api_download_model(run_id: str = Query(...)) -> Response:
    try:
        pkl_path, json_path = export_model(run_id)
        if not Path(pkl_path).exists():
            return JSONResponse(status_code=404, content={"error": "Modello non trovato"})
        filename = Path(pkl_path).name
        return FileResponse(
            path=pkl_path,
            media_type="application/octet-stream",
            filename=filename,
        )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Errore export modello: {str(e)}"},
        )


@app.get("/api/download/metadata")
def api_download_metadata(run_id: str = Query(...)) -> Response:
    try:
        pkl_path, json_path = export_model(run_id)
        if not Path(json_path).exists():
            return JSONResponse(status_code=404, content={"error": "Metadata non trovati"})
        filename = Path(json_path).name
        return FileResponse(
            path=json_path,
            media_type="application/json",
            filename=filename,
        )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Errore export metadata: {str(e)}"},
        )

@app.post("/api/reset")
def api_reset() -> JSONResponse:
    global CURRENT_DF
    CURRENT_DF = None
    try:
        reset_runs()
    except Exception:
        pass
    return JSONResponse(content={"ok": True})