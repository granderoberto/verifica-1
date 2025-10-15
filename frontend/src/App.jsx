import React, { useEffect, useMemo, useState } from 'react'
import { uploadXML, getPreview, trainModels, resetState, downloadModel, downloadMetadata } from './api'
import UploadPanel from './components/UploadPanel'
import PreviewTable from './components/PreviewTable'
import ModelSelector from './components/ModelSelector'
import TrainControls from './components/TrainControls'
import ResultsBoard from './components/ResultsBoard'
import ThemeToggle from "./components/ThemeToggle"

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
    } catch (e) {
      setError(e.message || 'Errore di upload')
    } finally {
      setLoading(false)
    }
  }

  const onTrain = async () => {
    setError(null)
    setLoading(true)
    try {
      const payload = {
        target, test_size: 0.2, random_state: 42, cv, scoring: 'f1_macro',
        use_class_weight: useClassWeight,
        selected_models: selectedModels,
        search,
        max_iters: 20
      }
      const out = await trainModels(payload)
      setResults(out.results)
      setBest(out.best_overall)
      setRunId(out.run_id)
    } catch (e) {
      setError(e.message || 'Errore durante il training')
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
  }

  const onDownloadModel = async () => {
    if (!runId) return
    await downloadModel(runId)
  }
  const onDownloadMetadata = async () => {
    if (!runId) return
    await downloadMetadata(runId)
  }

  useEffect(() => {
    // Carica preview iniziale dal dataset default
    (async () => {
      try {
        const res = await uploadXML(null)
        setPreview(res)
        if (res.columns?.includes('NObeyesdad')) setTarget('NObeyesdad')
      } catch (e) {
        // silenzioso
      }
    })()
  }, [])

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-row">
          <div>
            <h1>Classificazione da XML</h1>
            <p className="subtitle">Carica, pulisci, addestra e valuta modelli (scikit-learn)</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="grid">
        <aside className="panel">
          <UploadPanel loading={loading} onUpload={onUpload} />
          {preview && <PreviewTable preview={preview} />}
        </aside>

        <main className="panel">
          <ModelSelector
            target={target}
            setTarget={setTarget}
            selectedModels={selectedModels}
            setSelectedModels={setSelectedModels}
            columns={preview?.columns || []}
          />
          <TrainControls
            cv={cv} setCv={setCv}
            search={search} setSearch={setSearch}
            useClassWeight={useClassWeight} setUseClassWeight={setUseClassWeight}
            onTrain={onTrain}
            loading={loading}
          />
        </main>

        <section className="panel">
          <ResultsBoard
            results={results}
            best={best}
            runId={runId}
            onReset={onReset}
            onDownloadModel={onDownloadModel}
            onDownloadMetadata={onDownloadMetadata}
            loading={loading}
          />
        </section>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}
    </div>
  )
}