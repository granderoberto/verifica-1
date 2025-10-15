import React, { useMemo, useState } from 'react'

/**
 * ConfusionMatrix — heatmap a tabella, accessibile e responsive.
 * - matrix: number[][]  (righe = veri, colonne = predetti)
 * - labels: string[]    (ordine coerente con matrix)
 * - title: string
 *
 * Extra UX:
 * - Normalizzazione per riga (percentuali)
 * - Mostra conteggi + percentuali
 * - Totali riga/colonna + accuracy diagonale
 */
export default function ConfusionMatrix({
  matrix = [],
  labels = [],
  title = 'Confusion Matrix',
}) {
  const [normalize, setNormalize] = useState(true) // normalizza per riga ON di default

  const rows = matrix.length
  const cols = rows ? matrix[0].length : 0

  const {
    rowSums,
    colSums,
    total,
    acc,
    norm,    // valori [0..1] per UI (se normalize=true → per riga, altrimenti su max globale)
    perc,    // percentuali (per riga se normalize, altrimenti % del totale)
  } = useMemo(() => {
    if (!rows || !cols) {
      return { rowSums: [], colSums: [], total: 0, acc: 0, norm: [], perc: [] }
    }
    const rS = matrix.map(r => r.reduce((a,b)=>a+b,0))
    const cS = Array.from({ length: cols }, (_, j) => matrix.reduce((a, r) => a + (r[j] || 0), 0))
    const tot = rS.reduce((a,b)=>a+b,0)

    let correct = 0
    for (let i = 0; i < Math.min(rows, cols); i++) correct += matrix[i][i] || 0
    const accuracy = tot > 0 ? correct / tot : 0

    // normalizzazione
    let normVals = matrix.map((r, i) => r.map(v => {
      const denom = normalize ? (rS[i] || 1) : Math.max(1, ...matrix.flat()) // evitando divisioni per 0
      return denom ? v / denom : 0
    }))

    // percentuali da mostrare
    let percVals = matrix.map((r, i) => r.map(v => {
      if (normalize) {
        const denom = rS[i] || 1
        return denom ? (v / denom) * 100 : 0
      } else {
        return tot ? (v / tot) * 100 : 0
      }
    }))

    return {
      rowSums: rS, colSums: cS, total: tot, acc: accuracy, norm: normVals, perc: percVals
    }
  }, [matrix, rows, cols, normalize])

  if (!rows || !cols) {
    return <div className="cm-empty">Confusion matrix non disponibile.</div>
  }

  return (
    <div className="cm-wrapper">
      <div className="cm-header">
        <div>
          <strong>{title}</strong>
          <span className="cm-sub"> • Accuracy: {(acc * 100).toFixed(1)}%</span>
        </div>
        <div className="cm-controls">
          <label className="switch">
            <input type="checkbox" checked={normalize} onChange={(e)=>setNormalize(e.target.checked)} />
            <span>Normalizza per riga</span>
          </label>
        </div>
      </div>

      <div className="cm-scroll">
        <table className="cm-table">
          <thead>
            <tr>
              <th className="stuck corner" aria-label="vero vs predetto">V\P</th>
              {labels.map((l, j) => (
                <th key={j} className="stuck">{l}</th>
              ))}
              <th className="stuck total">Totale (vero)</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <th className="stuck-y">{labels[i]}</th>
                {row.map((v, j) => {
                  const p = perc[i][j] || 0
                  const n = norm[i][j] || 0
                  const isDiag = i === j
                  // colore: più scuro = valore più alto; diagonale leggermente accentuata
                  const intensity = Math.max(0, Math.min(1, n))
                  const hue = isDiag ? 200 : 220 // blu più ciano sulla diag
                  const bg = `hsl(${hue}, 80%, ${Math.round(24 + (1 - intensity) * 40)}%)`
                  const title = `Vero: ${labels[i]} • Pred: ${labels[j]}\nConteggio: ${v}\nPercentuale: ${p.toFixed(1)}%`
                  return (
                    <td key={j} style={{ background: bg }} title={title}>
                      <div className="cell">
                        <span className="count">{v}</span>
                        <span className="perc">{p.toFixed(1)}%</span>
                      </div>
                    </td>
                  )
                })}
                <th className="stuck-y total">{rowSums[i]}</th>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="stuck-y total">Totale (pred.)</th>
              {colSums.map((c, j) => <th key={j} className="total">{c}</th>)}
              <th className="total">{total}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="cm-axes">
        <span>Etichetta vera (riga)</span>
        <span>Etichetta predetta (colonna)</span>
      </div>
    </div>
  )
}