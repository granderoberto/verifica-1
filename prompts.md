# **Prompt utilizzati per la realizzazione della Single Page Application**

## PROMPT 1 - Orario = 8.30

Sulla base della consegna della verifica di informatica relativa al ML e realizzazione di una SPA, riscrivi il prompt facendomi delle domande per ricevere una risposta ottimale:
Sviluppo SPA - La SPA dovrà permettere all'utente di:

1. Visualizzare i primi cinque record del dataset
2. Scegliere uno o più algoritmi di ML disponibili
3. Addestrare i modelli selezionati sui dati forniti
4. visualizzare i risultati dei modelli, mostrando la confusion matrix migliore ottenuta, il classification report e il valore del/degli iperparametro/i che ha prodotto le migliori performance.
5. Indicare il migliore tra i modelli selezionati con i relativi iperparametri
6. Consetire all'utente di provare più volte
7. Una volta trovato il modello con le performance migliori, permettere di scaricare il modello addestrato

Per la realizzazione di questa SPA utilizza linguaggi come python (pandas etc), js, html, css e dimmi se è necessario qualche altro linguaggio. In allegato trovi il dataset in .xml (ricordati che dovrai includere anche la parte iniziale di pulizia dei dati).
Includi anche la struttura delle cartelle e file, alla fine il progetto deve essere caricato su github con relativi .gitignore(in un secondo momento).
L'obbiettivo è: Realizzare una SPA che consenta di creare, addestrare e valutare modelli di ML su un dataset fornito.
Al prompt che crei aggiungi parole chiavi in inglese così da aiutare AI durante la ricerca.

Tutto il progetto deve essere realizzato in 3 ore.

Rispondi come se fossi un programmatore avanzato nel mondo dell'AI.
Se necessario fammi altre domande inerenti al testo.

---

## PROMPT 2 - Orario 8.40

Sei un senior AI/ML engineer e full-stack developer. Realizza una **Single Page Application (SPA)** in **italiano** per caricare, pulire, addestrare e valutare modelli di **classificazione** su un dataset **XML** allegato. Progetto production-ready, **timebox: 3 ore**.

### **CONSTRAINTS & PREFERENCES (VINCOLI)**

* **ML stack:** Python + **scikit-learn** (niente XGBoost/LightGBM).
* **Persistenza modello:**.pkl** (joblib) + ** **metadata .json** **.**
* **UI lingua:** **Italiano** **.**
* Nessun database; mantieni i modelli in memoria e salva su disco solo al download.
* Ottimizza per semplicità, modularità e tempi di training brevi.

### **DATASET (ALLEGATO)**

* **File:**dataset.xml
* **Root:**`<data>`** — ****record xpath:**.//row
* **Target (multiclasse, 7 classi):**NObeyesdad
* **Da escludere:**Id
* **Feature numeriche:**Age**, **FCVC**, **NCP**, **CH2O**, **FAF**, **TUE
* **Feature categoriche:**Gender**, **family_history_with_overweight**, **FAVC**, **CAEC**, **SMOKE**, **SCC**, **CALC**, **MTRANS
* **Missing:** molto bassi (es. **FAVC** ~0.5%) → **imputazione richiesta**
* **Dimensioni:** ~2111 righe × 16 colonne
* **Split:**test_size=0.2**, **random_state=42**, **stratify=y
* **CV consigliata:****5-fold**
* **Metriche principali:** **F1-macro** (default) + accuracy; **classification report** completo per ogni modello

### **GOAL / FEATURES (MUST)**

1. **Anteprima dati:** mostra le prime **5** righe (post-cleaning).
2. **Selezione algoritmi (multi-select):** Logistic Regression, SVM, k-NN, Decision Tree, Random Forest, Naive Bayes.
3. **Training multi-modello:** con **pipeline** e **ricerca iperparametri** leggera.
4. **Risultati per modello:**
   * **Confusion matrix** (grafico),
   * **Classification report** (precision/recall/F1/support),
   * **Best hyperparameters** **.**
     Evidenzia la **migliore confusion matrix** (best model).
5. **Best model callout:** nome + iperparametri del vincitore.
6. **Multi-run:** permetti più tentativi senza ricaricare la pagina (**Reset** stato).
7. **Download:** scarica **miglior modello** (**.pkl**) e **metadata** (**.json**: modello, metriche, timestamp, schema feature).

### **ARCHITETTURA**

* **Backend (Python):** FastAPI, scikit-learn, pandas, numpy, joblib, pydantic, uvicorn.
* **Frontend (JS):** React + Vite, Fetch API, Chart.js per grafici.
* **Stile:** CSS semplice (opzionale: Tailwind).
* **Test (opz.):** pytest backend.

### **DATA CLEANING / PREPROCESSING**

* **Parsing: **pd.read_xml("dataset.xml", xpath=".//row")**.**
* Deduplica; trim stringhe; gestione NA:
  * **Numeriche:**SimpleImputer(strategy="median")
  * **Categoriche:**SimpleImputer(strategy="most_frequent")
* **Encoding: **OneHotEncoder(handle_unknown="ignore")** su categoriche.**
* Scaling: **StandardScaler** sulle numeriche **per LR/SVM/kNN**.
* Pipeline: **ColumnTransformer** + modello in **Pipeline**.
* Class imbalance: usa **stratify=y**; opzione **class_weight="balanced"** per LR/SVM/Tree/Forest.

### **MODELLI & IPERPARAMETRI (COMPATTI)**

Usa **GridSearchCV** o **RandomizedSearchCV** (**cv=5**) con budget leggero.

* **LogisticRegression** (multinomial, **solver="lbfgs"**):
  C: [0.1, 1, 10]**, **max_iter: 200**, **class_weight: [None, "balanced"]
* **SVC** **:**
  kernel: ["rbf","linear"]**, **C: [0.1, 1, 10]**, **gamma: ["scale","auto"]**, **class_weight: [None,"balanced"]
* **KNeighborsClassifier** **:**
  n_neighbors: [3,5,7,9]**, **weights: ["uniform","distance"]**, **p: [1,2]
* **DecisionTreeClassifier** **:**
  max_depth: [None,5,10,20]**, **min_samples_split: [2,5,10]**, **class_weight: [None,"balanced"]
* **RandomForestClassifier** **:**
  n_estimators: [100,200]**, **max_depth: [None,10,20]**, **min_samples_split: [2,5]**, **class_weight: [None,"balanced"]
* **GaussianNB** **:**
  var_smoothing: [1e-9, 1e-8, 1e-7]

### **API DESIGN (ESEMPIO)**

* POST /api/upload-xml** — multipart **file** (se assente, usa **dataset.xml** lato server) → **{rows, cols, preview}
* **GET /api/preview?limit=5** — prime N righe (post-cleaning)
* POST /api/train** — body:**
  {
  "target": "NObeyesdad",
  "test_size": 0.2,
  "random_state": 42,
  "cv": 5,
  "scoring": "f1_macro",
  "use_class_weight": true,
  "selected_models": ["logreg","svc","knn","dt","rf","nb"],
  "search": "grid",
  "max_iters": 20
  }

**Output:** per modello {name, best_params, metrics{f1_macro, accuracy, per_class}, confusion_matrix, train_time_s}** + **best_overall**.**

* **GET /api/best** — riepilogo vincitore
* GET /api/download?run_id=...** — stream **.pkl** + **.json

### **UI/UX (ITALIANO)**

* **Pannello sinistro:** Carica XML / Usa dataset predefinito → **Anteprima (5)** + selettore **Target** (pre-seleziona **NObeyesdad**).
* **Centro:** Multi-selezione **Algoritmi** + **Pesi bilanciati** + **Grid/Random** + **CV** (default 5).
* **Destra:** Cards con  **F1-macro** **, Accuracy, tempi; ** **classification report** **; ** **confusion matrix** **; evidenzia ** **Miglior modello** **.**
* **Azioni:**Addestra**, **Reset**, **Scarica modello migliore
* **UX extra:** spinner; avvisi schema/feature mismatch; badge per class imbalance.

### **OUTPUTS RICHIESTI**

* **Backend** FastAPI (app.py**) + moduli ML (**dataio.py**, **pipeline.py**, **search.py**, **metrics.py**) + **requirements.txt
* **Frontend** React+Vite (componenti: UploadPanel, PreviewTable, ModelSelector, TrainControls, ResultsBoard, ConfusionMatrix) + **api.js**, **styles.css**
* **README.md** con istruzioni
* **.gitignore** per Python/Node/OS

### **COMANDI DEV**

```
# Backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload

# Frontend
npm install
npm run dev
```

### **STRUTTURA CARTELLE**

### ml-spa/

  backend/
    app.py
    ml/
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
      styles.css
  README.md
  .gitignore

### **ACCEPTANCE CRITERIA**

* Anteprima 5 righe da XML (caricato o server-side)
* Selezione target/algoritmi operativa
* Training multi-modello con **CV=5**; metriche + confusion matrix per modello
* **Best model** evidenziato; **download .pkl + metadata .json**
* Multi-run senza reload; Reset pulisce stato
* UI italiana, responsiva, con spinner ed error handling chiaro

### **DESIGN DECISIONS (BREVE)**

* scikit-learn puro → semplicità + velocità
* Pipelines con **ColumnTransformer** → preprocessing robusto
* **F1-macro** → adeguata a classi non perfettamente bilanciate
* Griglie compatte → rispettano il **timebox 3h**

### **ENGLISH KEYWORDS (per ricerca/contesto)**

single page application, FastAPI, pandas, scikit-learn, machine learning pipeline, XML parsing, data cleaning, train/test split, cross-validation, GridSearchCV, RandomizedSearchCV, confusion matrix, classification report, F1 macro, accuracy, hyperparameter tuning, model persistence, joblib, REST API, React, Vite, Chart.js, OneHotEncoder, StandardScaler, Pipeline, stratified split, download trained model, class_weight balanced
