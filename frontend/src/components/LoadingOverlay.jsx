import React from 'react'

export default function LoadingOverlay({ visible, text='Addestramento in corso…' }) {
  if (!visible) return null
  return (
    <div className="overlay">
      <div className="overlay-card" role="alert" aria-busy="true">
        <span className="spinner" aria-hidden />
        <span style={{ marginLeft: 10 }}>{text}</span>
      </div>
    </div>
  )
}