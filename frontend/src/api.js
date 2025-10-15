// frontend/src/api.js
// ===================

export async function uploadXML(fileOrNull) {
  // Se c'è un file → invia multipart a /api/upload-xml
  if (fileOrNull) {
    const formData = new FormData()
    formData.append('file', fileOrNull)
    const resp = await fetch('/api/upload-xml', { method: 'POST', body: formData })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) throw new Error(data?.error || 'Errore upload')
    return data
  }

  // Nessun file → usa direttamente la preview del DF attivo
  // (_get_active_df() in backend carica il dataset di default se vuoto)
  return await getPreview(5)
}

export async function getPreview(limit = 5) {
  const resp = await fetch(`/api/preview?limit=${limit}`)
  const data = await resp.json()
  if (!resp.ok) throw new Error(data?.error || `Errore HTTP ${resp.status}`)
  return data
}

export async function trainModels(payload) {
  const resp = await fetch('/api/train', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(data?.error || `Errore HTTP ${resp.status}`)
  return data
}

export async function resetState() {
  const resp = await fetch('/api/reset', { method: 'POST' })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data?.error || 'Errore reset')
  return data
}

export async function downloadModel(run_id) {
  const resp = await fetch(`/api/download/model?run_id=${run_id}`)
  if (!resp.ok) throw new Error('Errore download modello')
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `best_model_${run_id}.pkl`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadMetadata(run_id) {
  const resp = await fetch(`/api/download/metadata?run_id=${run_id}`)
  if (!resp.ok) throw new Error('Errore download metadata')
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `metadata_${run_id}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}