import React from 'react'
import ConfusionMatrix from './ConfusionMatrix'

/**
 * ResultsBoard
 * - Mostra callout del miglior modello
 * - Elenco card per ciascun modello con metriche, report e confusion matrix
 * - Bottoni download & reset
 * - Protezioni su dati mancanti/incoerenti per evitare errori in Chart.js
 */

function round3(x) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return '0.000'
  return Number(x).toFixed(3)
}

function isValidMatrix(cm, labels) {
  return Array.isArray(cm)
    && Array.isArray(labels)
    && cm.length > 0
    && labels.length > 0
    && cm.length === labels.length
    && cm.every(row => Array.isArray(row) && row.length === labels.length)
}

function ReportTable({ report }) {
  if (!report || typeof report !== 'object') return null

  const rows = Object.entries(report)
  const skip = new Set(['accuracy', 'macro avg', 'weighted avg'])

  const bodyRows = rows
    .filter(([k]) => !skip.has(k))
    .map(([label, vals]) => {
      const p = vals?.precision ?? 0
      const r = vals?.recall ?? 0
      const f1 = (vals?.['f1-score'] ?? vals?.f1 ?? 0)
      const s = vals?.support ?? 0
      return (
        <tr key={label}>
          <td>{label}</td>
          <td>{round3(p)}</td>
          <td>{round3(r)}</td>
          <td>{round3(f1)}</td>
          <td>{s}</td>
        </tr>
      )
    })

  const tails = ['macro avg', 'weighted avg', 'accuracy'].map((k) => {
    const vals = report[k]
    if (!vals) return null
    const p = vals?.precision ?? 0
    const r = vals?.recall ?? 0
    const f1 = (vals?.['f1-score'] ?? vals?.f1 ?? 0)
    const s = vals?.support ?? '-'
    return (
      <tr key={k}>
        <td>{k}</td>
        <td>{round3(p)}</td>
        <td>{round3(r)}</td>
        <td>{round3(f1)}</td>
        <td>{s}</td>
      </tr>
    )
  })

  return (
    <table className="report-table">
      <thead>
        <tr><th>Classe</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr>
      </thead>
      <tbody>
        {bodyRows}
        <tr className="sep"><td colSpan="5" /></tr>
        {tails}
      </tbody>
    </table>
  )
}

export default function ResultsBoard({
  results,
  best,
  runId,
  onReset,
  onDownloadModel,
  onDownloadMetadata,
  loading
}) {
  const hasResults = Array.isArray(results) && results.length > 0

  return (
    <div className="card">
      <h3>Risultati</h3>

      {!hasResults && !loading && (
        <p>Nessun risultato ancora: scegli algoritmi e avvia l&apos;addestramento.</p>
      )}

      {loading && (
        <div className="row">
          <span className="spinner" aria-hidden /> <span>Addestramento in corso…</span>
        </div>
      )}

      {best && (
        <div className="best-callout">
          <div>
            <strong>Miglior modello:</strong> {best.name}
          </div>
          <div>
            F1-macro: <strong>{round3(best.metrics?.f1_macro)}</strong>
            {' '}• Accuracy: <strong>{round3(best.metrics?.accuracy)}</strong>
          </div>
          <details>
            <summary>Iperparametri</summary>
            <pre>{JSON.stringify(best.best_params ?? {}, null, 2)}</pre>
          </details>
        </div>
      )}

      {runId && (
        <div className="row">
          <button onClick={onDownloadModel} disabled={loading}>Scarica modello (.pkl)</button>
          <button onClick={onDownloadMetadata} disabled={loading}>Scarica metadata (.json)</button>
          <button className="secondary" onClick={onReset} disabled={loading}>Reset</button>
        </div>
      )}

      {hasResults && (
        <div className="results-grid">
          {results.map((r) => {
            const isBest = !!best && r.key === best.key
            const cls = 'result-card' + (isBest ? ' best' : '')
            const f1 = round3(r.metrics?.f1_macro)
            const acc = round3(r.metrics?.accuracy)
            const time = (r.train_time_s ?? 0).toString()
            const labels = r.metrics?.labels ?? []
            const cm = r.metrics?.confusion_matrix ?? null
            const canDrawCM = isValidMatrix(cm, labels)

            return (
              <div className={cls} key={r.key}>
                <div className="result-header">
                  <h4>{r.name} {isBest && <span className="badge">Best</span>}</h4>
                  <div className="meta">
                    F1-macro: <strong>{f1}</strong>
                    {' '}• Acc: <strong>{acc}</strong>
                    {' '}• Tempo: {time}s
                  </div>
                </div>

                {/* Confusion Matrix (solo se i dati sono coerenti) */}
                {canDrawCM && (
                  <div className="cm-card">
                    <ConfusionMatrix
                      matrix={cm}
                      labels={labels}
                      title={`Confusion Matrix — ${r.name}`}
                    />
                  </div>
                )}

                <details>
                  <summary>Classification report</summary>
                  <ReportTable report={r.metrics?.report} />
                </details>

                <details>
                  <summary>Iperparametri migliori</summary>
                  <pre>{JSON.stringify(r.best_params ?? {}, null, 2)}</pre>
                </details>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}