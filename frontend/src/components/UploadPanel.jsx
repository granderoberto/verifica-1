import React, { useRef } from 'react'

export default function UploadPanel({ loading, onUpload }) {
  const fileRef = useRef(null)

  const handleChange = (e) => {
    const f = e.target.files?.[0]
    if (f) onUpload(f)
  }

  return (
    <div className="card">
      <h3>Dataset XML</h3>
      <p>Carica un file <code>.xml</code> oppure usa il dataset predefinito lato server.</p>
      <div className="row">
        <input type="file" accept=".xml" onChange={handleChange} ref={fileRef} disabled={loading} />
      </div>
      <div className="row">
        <button onClick={() => onUpload(null)} disabled={loading}>Usa dataset predefinito</button>
      </div>
    </div>
  )
}