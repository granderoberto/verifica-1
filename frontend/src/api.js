const base = '' // proxied by Vite to http://localhost:8000

export async function uploadXML(fileOrNull) {
  const form = new FormData()
  if (fileOrNull) form.append('file', fileOrNull)
  const res = await fetch(`${base}/api/upload-xml`, {
    method: 'POST',
    body: fileOrNull ? form : null
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Errore upload')
  return res.json()
}

export async function getPreview(limit=5) {
  const res = await fetch(`${base}/api/preview?limit=${limit}`)
  if (!res.ok) throw new Error((await res.json()).detail || 'Errore preview')
  return res.json()
}

export async function trainModels(payload) {
  const res = await fetch(`${base}/api/train`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Errore training')
  return res.json()
}

export async function resetState() {
  const res = await fetch(`${base}/api/reset`, { method: 'POST' })
  if (!res.ok) throw new Error('Errore reset')
  return res.json()
}

export async function downloadModel(runId) {
  const res = await fetch(`${base}/api/download/model?run_id=${runId}`)
  if (!res.ok) throw new Error('Download modello fallito')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `best_model_${runId}.pkl`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function downloadMetadata(runId) {
  const res = await fetch(`${base}/api/download/metadata?run_id=${runId}`)
  if (!res.ok) throw new Error('Download metadata fallito')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `metadata_${runId}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}