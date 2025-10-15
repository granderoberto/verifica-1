import React from 'react'
import ConfusionMatrix from './ConfusionMatrix'

const PARAM_LABELS = {
  common: {
    class_weight: 'Pesi di classe',
    max_depth: 'Profondità massima',
    min_samples_split: 'Min. campioni per split',
    n_estimators: 'Numero alberi',
    C: 'C (regolarizzazione)',
    kernel: 'Kernel',
    gamma: 'Gamma',
    n_neighbors: 'Numero vicini (k)',
    weights: 'Pesi k-NN',
    p: 'Distanza (p)',
    var_smoothing: 'Var smoothing',
    max_iter: 'Iterazioni massime',
    solver: 'Solver',
  }
}

function prettifyParams(modelKey, bestParams) {
  if (!bestParams) return []
  const rows = []
  for (const [rawKey, rawVal] of Object.entries(bestParams)) {
    const key = rawKey.replace(/^clf__/, '')
    const label = PARAM_LABELS.common[key] || key
    let value = rawVal
    if (value === null || value === undefined) value = '—'
    if (value === 'balanced') value = 'Bilanciati'
    if (value === 'auto') value = 'Auto'
    if (value === 'scale') value = 'Scala automatica'
    if (value === true) value = 'Sì'
    if (value === false) value = 'No'
    if (key === 'max_depth' && value === null) value = 'Nessun limite'
    rows.push({ label, value })
  }
  const order = ['class_weight','max_depth','min_samples_split','n_estimators','C','kernel','gamma','n_neighbors','weights','p','solver','max_iter','var_smoothing']
  rows.sort((a,b) => {
    const ia = order.indexOf(a.label)
    const ib = order.indexOf(b.label)
    if (ia === -1 && ib === -1) return a.label.localeCompare(b.label)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
  return rows
}

export default function ResultsBoard({ results, best, runId, onReset, onDownloadModel, onDownloadMetadata, loading }) {
  return (
    <div className="results-stack">
      <div className="card section-header">
        <h3>Risultati</h3>
        {!results && <p className="muted">Nessun risultato ancora: scegli algoritmi e avvia l'addestramento.</p>}
      </div>

      {best && (
        <div className="best-callout card">
          <div className="best-head">
            <div><strong>Miglior modello:</strong> {best.name}</div>
            <div className="meta">
              F1-macro: <strong>{(best.metrics.f1_macro * 100).toFixed(1)}%</strong> •
              &nbsp;Accuracy: <strong>{(best.metrics.accuracy * 100).toFixed(1)}%</strong>
            </div>
          </div>
          <details>
            <summary>Iperparametri (leggibili)</summary>
            <div className="scroll-x">
              <table className="kv-table">
                <tbody>
                  {prettifyParams(best.key, best.best_params).map(({label, value}) => (
                    <tr key={label}><td>{label}</td><td>{String(value)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {runId && (
        <div className="row wrap gap card">
          <button onClick={onDownloadModel} disabled={loading}>Scarica modello (.pkl)</button>
          <button onClick={onDownloadMetadata} disabled={loading}>Scarica metadata (.json)</button>
          <button className="secondary" onClick={onReset} disabled={loading}>Reset</button>
        </div>
      )}

      <div className="results-grid vertical">
        {results?.map((r) => {
          const isBest = best && r.key === best.key
          const cls = 'result-card card' + (isBest ? ' best' : '')
          const labels = r.metrics.labels
          return (
            <div className={cls} key={r.key}>
              <div className="result-header">
                <h4>{r.name} {isBest && <span className="badge">Best</span>}</h4>
                <div className="meta">
                  F1-macro: <strong>{(r.metrics.f1_macro * 100).toFixed(1)}%</strong> •
                  &nbsp;Acc: <strong>{(r.metrics.accuracy * 100).toFixed(1)}%</strong> •
                  &nbsp;Tempo: {r.train_time_s}s
                </div>
              </div>

              {/* Confusion Matrix */}
              <div className="cm-card">
                {Array.isArray(r.metrics.confusion_matrix) && Array.isArray(labels) &&
                 r.metrics.confusion_matrix.length === labels.length ? (
                  <ConfusionMatrix
                    matrix={r.metrics.confusion_matrix}
                    labels={labels}
                    title={`Confusion Matrix — ${r.name}`}
                  />
                 ) : (
                  <p className="muted">Confusion matrix non disponibile.</p>
                 )}
              </div>

              {/* Report per classe con wrapper scrollabile */}
              <details>
                <summary>Classification report (per classe)</summary>
                <div className="scroll-x">
                  <table className="report-table">
                    <thead>
                      <tr><th>Classe</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(r.metrics.report)
                        .filter(([k]) => !['accuracy','macro avg','weighted avg'].includes(k))
                        .map(([label, vals]) => (
                          <tr key={label}>
                            <td>{label}</td>
                            <td>{((vals?.precision ?? 0) * 100).toFixed(1)}%</td>
                            <td>{((vals?.recall ?? 0) * 100).toFixed(1)}%</td>
                            <td>{((vals?.['f1-score'] ?? 0) * 100).toFixed(1)}%</td>
                            <td>{vals?.support ?? 0}</td>
                          </tr>
                        ))}
                      <tr className="sep"><td colSpan="5"></td></tr>
                      {['macro avg','weighted avg','accuracy'].map((k) => {
                        const vals = r.metrics.report[k]
                        if (!vals) return null
                        const prec = k === 'accuracy' ? (vals * 100) : ((vals?.precision ?? 0) * 100)
                        const rec  = k === 'accuracy' ? (vals * 100) : ((vals?.recall ?? 0) * 100)
                        const f1   = k === 'accuracy' ? (vals * 100) : ((vals?.['f1-score'] ?? 0) * 100)
                        const sup  = vals?.support ?? '-'
                        return (
                          <tr key={k}>
                            <td>{k}</td>
                            <td>{prec.toFixed(1)}%</td>
                            <td>{rec.toFixed(1)}%</td>
                            <td>{f1.toFixed(1)}%</td>
                            <td>{sup}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </details>

              {/* Iperparametri leggibili (scroll orizzontale se serve) */}
              <details>
                <summary>Iperparametri migliori (leggibili)</summary>
                <div className="scroll-x">
                  <table className="kv-table">
                    <tbody>
                      {prettifyParams(r.key, r.best_params).map(({label, value}) => (
                        <tr key={label}><td>{label}</td><td>{String(value)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )
        })}
      </div>
    </div>
  )
}