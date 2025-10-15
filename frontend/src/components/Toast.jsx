import React, { useEffect } from 'react'

export default function Toast({ msg, type='info', timeout=2500, onClose }) {
  useEffect(() => {
    const id = setTimeout(() => onClose?.(), timeout)
    return () => clearTimeout(id)
  }, [onClose, timeout])

  return (
    <div className={`toast ${type}`} role="status" aria-live="polite">
      {msg}
    </div>
  )
}