from __future__ import annotations
import os, json, io
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import pandas as pd
from pathlib import Path

from ml.dataio import read_xml_bytes, read_xml_file, clean_dataframe, preview_records, get_feature_sets, exclude_columns, TARGET_DEFAULT, DEFAULT_DATASET_PATH
from ml.search import train_multi_model, export_model, RUNS

app = FastAPI(title="ML SPA - Classificazione da XML")

# CORS (sviluppo: vite su 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stato in memoria
STATE: Dict[str, Any] = {
    "df": None,
    "source": None,
}


def ensure_df_loaded():
    if STATE.get("df") is None:
        # Prova a caricare dataset predefinito
        try:
            df = read_xml_file(str(DEFAULT_DATASET_PATH))
            df = exclude_columns(clean_dataframe(df))
            STATE["df"] = df
            STATE["source"] = "default"
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Nessun dataset caricato e dataset di default non disponibile: {e}")

@app.post("/api/upload-xml")
async def upload_xml(file: Optional[UploadFile] = File(None)):
    try:
        if file is None:
            # Usa dataset default
            df = read_xml_file(DEFAULT_DATASET_PATH) # type: ignore
            src = "default"
        else:
            content = await file.read()
            df = read_xml_bytes(content)
            src = f"upload:{file.filename}"
        df = exclude_columns(clean_dataframe(df))
        STATE["df"] = df
        STATE["source"] = src
        prev = preview_records(df, limit=5)
        return JSONResponse({"ok": True, "source": src, **prev})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Errore parsing XML: {e}")

@app.get("/api/preview")
async def preview(limit: int = Query(5, ge=1, le=50)):
    ensure_df_loaded()
    df = STATE["df"]
    prev = preview_records(df, limit=limit)
    return JSONResponse(prev)

@app.post("/api/train")
async def train(
    payload: Dict[str, Any] = Body(...)
):
    ensure_df_loaded()
    df = STATE["df"]

    target = payload.get("target", TARGET_DEFAULT)
    test_size = float(payload.get("test_size", 0.2))
    random_state = int(payload.get("random_state", 42))
    cv = int(payload.get("cv", 5))
    scoring = str(payload.get("scoring", "f1_macro"))
    use_class_weight = bool(payload.get("use_class_weight", True))
    selected_models = payload.get("selected_models", ["logreg","svc","knn","dt","rf","nb"])
    search = str(payload.get("search", "grid")).lower()
    max_iters = int(payload.get("max_iters", 20))

    if target not in df.columns:
        raise HTTPException(status_code=400, detail=f"Target '{target}' non presente nelle colonne.")

    try:
        out = train_multi_model(
            df=df,
            target=target,
            test_size=test_size,
            random_state=random_state,
            cv=cv,
            scoring=scoring,
            use_class_weight=use_class_weight,
            selected_models=selected_models,
            search=search,
            max_iters=max_iters,
        )
        return JSONResponse(out)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante il training: {e}")

@app.get("/api/best")
async def best(run_id: str = Query(...)):
    info = RUNS.get(run_id)
    if not info:
        raise HTTPException(status_code=404, detail="run_id non trovato")
    return JSONResponse(info["metadata"]["best_model"])

@app.get("/api/download/model")
async def download_model(run_id: str = Query(...)):
    try:
        pkl_path, json_path = export_model(run_id)
        return FileResponse(pkl_path, media_type="application/octet-stream", filename=os.path.basename(pkl_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/download/metadata")
async def download_metadata(run_id: str = Query(...)):
    try:
        pkl_path, json_path = export_model(run_id)
        return FileResponse(json_path, media_type="application/json", filename=os.path.basename(json_path))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/reset")
async def reset_state():
    STATE["df"] = None
    STATE["source"] = None
    RUNS.reset()
    return JSONResponse({"ok": True})