import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, error:null } }
  static getDerivedStateFromError(error){ return { hasError:true, error } }
  componentDidCatch(error, info){ console.error('UI ErrorBoundary:', error, info) }
  render(){
    if (this.state.hasError){
      return (
        <div className="card" style={{borderColor:'#ef4444'}}>
          <h3>Si è verificato un errore nell&apos;interfaccia</h3>
          <p style={{color:'#ef4444'}}>{String(this.state.error?.message || this.state.error)}</p>
          <p>Controlla la console del browser per i dettagli.</p>
        </div>
      )
    }
    return this.props.children
  }
}