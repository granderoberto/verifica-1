import React from 'react'

const MODEL_OPTIONS = [
  {key: 'logreg', label: 'Logistic Regression'},
  {key: 'svc', label: 'SVM'},
  {key: 'knn', label: 'k-NN'},
  {key: 'dt', label: 'Decision Tree'},
  {key: 'rf', label: 'Random Forest'},
  {key: 'nb', label: 'Naive Bayes'},
]

export default function ModelSelector({ target, setTarget, selectedModels, setSelectedModels, columns }) {
  const toggleModel = (k) => {
    if (selectedModels.includes(k)) setSelectedModels(selectedModels.filter(x => x !== k))
    else setSelectedModels([...selectedModels, k])
  }
  return (
    <div className="card">
      <h3>Target & Algoritmi</h3>
      <div className="row">
        <label>Bersaglio (target):</label>
        <select value={target} onChange={e => setTarget(e.target.value)}>
          {columns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="row" style={{ marginTop: 6 }}>
      <button className="secondary" onClick={() => setSelectedModels(['logreg','dt'])}>
        Preset: Veloce (LR + DT)
      </button>
      <button className="secondary" onClick={() => setSelectedModels(['logreg','svc','knn','dt','rf','nb'])}>
        Preset: Completo (tutti)
      </button>
    </div>
      <div className="row wrap">
        {MODEL_OPTIONS.map(m => (
          <label key={m.key} className="chip">
            <input type="checkbox" checked={selectedModels.includes(m.key)} onChange={() => toggleModel(m.key)} />
            {m.label}
          </label>
        ))}
      </div>
    </div>
  )
}
