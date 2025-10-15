import React, { useEffect, useState } from 'react'
import { uploadXML, resetState, trainModels, downloadModel, downloadMetadata } from './api'
import UploadPanel from './components/UploadPanel'
import PreviewTable from './components/PreviewTable'
import ModelSelector from './components/ModelSelector'
import TrainControls from './components/TrainControls'
import ResultsBoard from './components/ResultsBoard'
import ThemeToggle from './components/ThemeToggle.jsx'
import Toast from './components/Toast.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [target, setTarget] = useState('NObeyesdad')
  const [selectedModels, setSelectedModels] = useState(['logreg','svc','knn','dt','rf','nb'])
  const [useClassWeight, setUseClassWeight] = useState(true)
  const [search, setSearch] = useState('grid')
  const [cv, setCv] = useState(5)
  const [results, setResults] = useState(null)
  const [best, setBest] = useState(null)
  const [runId, setRunId] = useState(null)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  // Stepper: 0=Dataset, 1=Modelli/Parametri, 2=Risultati
  const [step, setStep] = useState(0)

  const onUpload = async (fileOrNull) => {
    setError(null)
    setLoading(true)
    try {
      const res = await uploadXML(fileOrNull)
      setPreview(res)
      if (res.columns?.includes('NObeyesdad')) {
        setTarget('NObeyesdad')
      } else if (res.columns?.length) {
        setTarget(res.columns[res.columns.length - 1])
      }
      setToast({ msg: 'Dataset caricato ✅', type: 'success' })
      // passa automaticamente allo step 1 dopo upload riuscito
      setStep(1)
    } catch (e) {
      const msg = e?.message || 'Errore di upload'
      setError(msg)
      setToast({ msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onTrain = async () => {
    setError(null)
    setLoading(true)
    setToast({ msg: 'Addestramento avviato…', type: 'info', timeout: 1500 })
    try {
      const payload = {
        target,
        test_size: 0.2,
        random_state: 42,
        cv,
        scoring: 'f1_macro',
        use_class_weight: useClassWeight,
        selected_models: selectedModels,
        search,
        max_iters: 20
      }
      const out = await trainModels(payload)
      setResults(out.results)
      setBest(out.best_overall)
      setRunId(out.run_id)
      setToast({ msg: 'Addestramento completato ✅', type: 'success' })
      // vai allo step risultati al termine
      setStep(2)
    } catch (e) {
      const msg = e?.message || 'Errore durante il training'
      setError(msg)
      setToast({ msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onReset = async () => {
    await resetState()
    setPreview(null)
    setResults(null)
    setBest(null)
    setRunId(null)
    setError(null)
    setStep(0)
    setToast({ msg: 'Stato azzerato', type: 'info' })
  }

  const onDownloadModel = async () => {
    if (!runId) { setToast({ msg: 'Nessun modello da scaricare', type: 'error' }); return }
    await downloadModel(runId)
    setToast({ msg: 'Download modello avviato ⬇️', type: 'success' })
  }
  const onDownloadMetadata = async () => {
    if (!runId) { setToast({ msg: 'Nessun metadata da scaricare', type: 'error' }); return }
    await downloadMetadata(runId)
    setToast({ msg: 'Download metadata avviato ⬇️', type: 'success' })
  }

  // Carica preview iniziale dal dataset di default (silenzioso se fallisce)
  useEffect(() => {
    (async () => {
      try {
        const res = await uploadXML(null)
        setPreview(res)
        if (res.columns?.includes('NObeyesdad')) setTarget('NObeyesdad')
      } catch {}
    })()
  }, [])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          <div>
            <h1>Classificazione da XML</h1>
            <p className="subtitle">Carica, pulisci, addestra e valuta modelli (scikit-learn)</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Stepper */}
        <nav className="stepper">
          {['Dataset', 'Modelli', 'Risultati'].map((label, i) => (
            <button
              key={label}
              className={`step ${step === i ? 'active' : ''}`}
              onClick={() => setStep(i)}
              disabled={(i === 1 && !preview) || (i === 2 && !results)}
              title={i === 1 && !preview ? 'Carica un dataset prima' : i === 2 && !results ? 'Esegui un training prima' : ''}
            >
              {i + 1}. {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="stack">
        {/* STEP 0: Dataset */}
        {step === 0 && (
          <section className="card">
            <h3>1) Dataset XML</h3>
            <UploadPanel loading={loading} onUpload={onUpload} />
            {preview && (
              <>
                <h4 className="mt-16">Anteprima (prime 5 righe)</h4>
                <PreviewTable preview={preview} />
              </>
            )}
            <div className="row end">
              <button onClick={() => setStep(1)} disabled={!preview}>Avanti →</button>
            </div>
          </section>
        )}

        {/* STEP 1: Modelli/Parametri */}
        {step === 1 && (
          <>
            <section className="card">
              <h3>2) Selezione modelli</h3>
              <ModelSelector
                target={target}
                setTarget={setTarget}
                selectedModels={selectedModels}
                setSelectedModels={setSelectedModels}
                columns={preview?.columns || []}
              />
            </section>

            <section className="card">
              <h3>Parametri di training</h3>
              <TrainControls
                cv={cv} setCv={setCv}
                search={search} setSearch={setSearch}
                useClassWeight={useClassWeight} setUseClassWeight={setUseClassWeight}
                onTrain={onTrain}
                loading={loading}
              />
              <div className="row between">
                <button className="secondary" onClick={() => setStep(0)}>← Indietro</button>
                <button onClick={onTrain} disabled={loading || !preview}>Avvia addestramento</button>
              </div>
            </section>
          </>
        )}

        {/* STEP 2: Risultati */}
        {step === 2 && (
          <section>
            <ResultsBoard
              results={results}
              best={best}
              runId={runId}
              onReset={onReset}
              onDownloadModel={onDownloadModel}
              onDownloadMetadata={onDownloadMetadata}
              loading={loading}
            />
            <div className="row between">
              <button className="secondary" onClick={() => setStep(1)}>← Torna ai parametri</button>
              <button onClick={onReset} disabled={loading}>Nuovo run</button>
            </div>
          </section>
        )}
        <LoadingOverlay visible={loading} />
      </main>

      {error && (
        <div className="card error-card" role="alert" style={{ marginTop: 12 }}>
          <h3>Si è verificato un errore</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <footer className="app-footer">
        <span>© {new Date().getFullYear()} ML SPA • scikit-learn • FastAPI</span>
      </footer>
    </div>
  )
}