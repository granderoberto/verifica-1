# ML SPA — Classificazione da XML (FastAPI + React)

SPA per caricare un dataset **XML**, pulire i dati, addestrare e valutare **modelli di classificazione** (scikit-learn) con **CV=5**, mostrare **confusion matrix** e **classification report**, ed effettuare il **download** del **miglior modello (.pkl)** e dei **metadata (.json)**.

## Stack

- **Backend**: FastAPI, scikit-learn, pandas, numpy, joblib
- **Frontend**: React + Vite, Fetch API, Chart.js (+ plugin matrix)
- **Persistenza**: in memoria; salvataggio su disco **solo al download**
- **Lingua UI**: Italiano

## Requisiti

- Python 3.10+
- Node 18+

## Avvio rapido

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload

# Frontend
cd ../frontend
npm install
npm run dev
```

Apri il browser su l'URL mostrato da Vite (tipicamente http://localhost:5173).

## Dataset

- Se non carichi alcun file, il backend usa il dataset di default: `/mnt/data/dataset.xml` (se presente).
- Parsing: `pandas.read_xml(..., xpath=".//row")`
- Target predefinito: `NObeyesdad` (multiclasse)
- Colonne escluse: `Id`

## Endpoints principali

- `POST /api/upload-xml` — multipart `file` (opzionale) → `{rows, cols, preview}`
- `GET /api/preview?limit=5` — prime N righe (post-cleaning)
- `POST /api/train` — body configurazione ML → risultati per modello + `run_id`
- `GET /api/best?run_id=...` — riepilogo vincitore
- `GET /api/download/model?run_id=...` — scarica `.pkl`
- `GET /api/download/metadata?run_id=...` — scarica `.json`
- `POST /api/reset` — resetta lo stato in memoria

## Design decisions (breve)

- scikit-learn puro per semplicità e tempi brevi
- `ColumnTransformer` + `Pipeline` per preprocessing robusto
- `F1-macro` come metrica principale (classi non perfettamente bilanciate)
- Griglie compatte per l'hyperparameter tuning, `cv=5`

## Struttura

```


ml-spa/
  backend/
    app.py
    ml/
      data/
	dataset.xml
      __init__.py
      dataio.py
      pipeline.py
      search.py
      metrics.py
    requirements.txt
  frontend/
    index.html
    vite.config.js
    package.json
    src/
      main.jsx
      App.jsx
      api.js
      components/
        UploadPanel.jsx
        PreviewTable.jsx
        ModelSelector.jsx
        TrainControls.jsx
        ResultsBoard.jsx
        ConfusionMatrix.jsx
	ErrorBoundary.jsx
	ThemeToggle.jsx
      styles.css
  README.md
  prompts.md
  .gitignore
```

## Note

- I modelli vengono mantenuti **in memoria** finché non fai **Reset** o riavvii il backend.
- Il download salva i file temporaneamente in `backend/exports/`.
