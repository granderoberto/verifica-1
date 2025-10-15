import React, { useEffect, useMemo, useState } from 'react'
import { getPreview } from '../api'

/**
 * Tabella d’anteprima "reale":
 * - Header sticky
 * - Ordinamento per colonna (ASC/DESC)
 * - Selettore righe (5, 10, 25, 50)
 * - Download CSV dell’anteprima corrente
 *
 * Props:
 *  - preview: { rows, cols, preview: Array<Object>, columns: string[] }
 */
export default function PreviewTable({ preview }) {
  const [limit, setLimit] = useState(5)
  const [data, setData] = useState(preview?.preview || [])
  const [columns, setColumns] = useState(preview?.columns || [])
  const [totalRows, setTotalRows] = useState(preview?.rows || 0)

  // sort state: { key, dir: 'asc'|'desc' }
  const [sort, setSort] = useState(null)

  // quando cambia la preview “iniziale”, aggiorna lo stato locale
  useEffect(() => {
    if (!preview) return
    setData(preview.preview || [])
    setColumns(preview.columns || [])
    setTotalRows(preview.rows || 0)
  }, [preview])

  // cambia limite → chiama backend /api/preview?limit=...
  useEffect(() => {
    let isCancelled = false
    ;(async () => {
      try {
        const res = await getPreview(limit)
        if (isCancelled) return
        setData(res.preview || [])
        setColumns(res.columns || [])
        setTotalRows(res.rows || 0)
        setSort(null) // reset ordinamento
      } catch (e) {
        // silenzioso: lascia i dati correnti
        console.error('Errore getPreview:', e)
      }
    })()
    return () => { isCancelled = true }
  }, [limit])

  const sortedData = useMemo(() => {
    if (!sort || !sort.key) return data
    const copy = [...data]
    const { key, dir } = sort
    copy.sort((a, b) => {
      const va = a?.[key]
      const vb = b?.[key]

      // prova numerico
      const na = typeof va === 'number' ? va : (parseFloat(va) || Number.NaN)
      const nb = typeof vb === 'number' ? vb : (parseFloat(vb) || Number.NaN)

      const bothNum = !Number.isNaN(na) && !Number.isNaN(nb)
      let cmp
      if (bothNum) {
        cmp = na - nb
      } else {
        const sa = `${va ?? ''}`.toLowerCase()
        const sb = `${vb ?? ''}`.toLowerCase()
        cmp = sa < sb ? -1 : sa > sb ? 1 : 0
      }
      return dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [data, sort])

  const onHeaderClick = (key) => {
    if (!key) return
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
    })
  }

  const downloadCSV = () => {
    if (!columns?.length || !sortedData?.length) return
    const esc = (v) => {
      if (v == null) return ''
      const s = String(v)
      // se contiene virgola/virgolette/a capo → racchiudi tra virgolette e raddoppia le virgolette
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const header = columns.join(',')
    const body = sortedData.map(row => columns.map(c => esc(row[c])).join(',')).join('\n')
    const csv = header + '\n' + body
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `anteprima_${limit}_righe.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="preview-wrapper">
      <div className="preview-toolbar">
        <div className="preview-meta">
          <strong>Anteprima</strong>
          <span className="muted"> • {columns?.length || 0} colonne • {totalRows} righe</span>
        </div>

        <div className="preview-actions">
          <label className="inline">
            Righe:&nbsp;
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="secondary" onClick={downloadCSV} disabled={!data?.length}>
            Scarica CSV
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns?.map((col) => {
                const active = sort?.key === col
                const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''
                return (
                  <th key={col} onClick={() => onHeaderClick(col)} title="Clicca per ordinare">
                    {col}{arrow}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData?.length ? (
              sortedData.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c} title={row?.[c] != null ? String(row[c]) : '—'}>
                      {row?.[c] != null && row[c] !== '' ? String(row[c]) : '—'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns?.length || 1} className="muted" style={{ textAlign: 'center', padding: 16 }}>
                  Nessun dato da mostrare
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 6 }}>Suggerimento: puoi ordinare cliccando sull’intestazione.</p>
    </div>
  )
}