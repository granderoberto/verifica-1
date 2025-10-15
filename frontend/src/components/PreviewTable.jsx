import React from 'react'

export default function PreviewTable({ preview }) {
  const { rows, cols, preview: items, columns } = preview
  return (
    <div className="card">
      <h3>Anteprima dati (5 righe)</h3>
      <div className="meta">Righe: {rows} • Colonne: {cols}</div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>{columns.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i}>
                {columns.map(c => <td key={c}>{String(row[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}