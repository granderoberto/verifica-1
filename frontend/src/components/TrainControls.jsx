import React from 'react'

export default function TrainControls({ cv, setCv, search, setSearch, useClassWeight, setUseClassWeight, onTrain, loading }) {
  return (
    <div className="card">
      <h3>Controlli Training</h3>
      <div className="row">
        <label>CV (k-fold):</label>
        <input type="number" min="2" max="10" value={cv} onChange={e => setCv(parseInt(e.target.value || '5'))} />
      </div>
      <div className="row">
        <label>Tuning:</label>
        <select value={search} onChange={e => setSearch(e.target.value)}>
          <option value="grid">GridSearchCV</option>
          <option value="random">RandomizedSearchCV</option>
        </select>
      </div>
      <div className="row">
        <label className="chip">
          <input type="checkbox" checked={useClassWeight} onChange={e => setUseClassWeight(e.target.checked)} />
          Pesi bilanciati (class_weight="balanced")
        </label>
      </div>
      <div className="row">
        <button onClick={onTrain} disabled={loading}>Addestra</button>
      </div>
      {loading && <div className="spinner">⏳ Addestramento in corso...</div>}
    </div>
  )
}