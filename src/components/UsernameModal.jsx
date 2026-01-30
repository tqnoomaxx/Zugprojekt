import React, { useState } from 'react'

export default function UsernameModal({ onSave }){
  const [name, setName] = useState('')
  const submit = () => {
    const trimmed = (name || '').trim()
    if (!trimmed) return alert('Bitte einen Namen eingeben')
    onSave(trimmed)
  }

  return (
    <div style={overlay}>
      <div style={box} className="card">
        <h3>Willkommen — wähle einen Username</h3>
        <p className="muted">Dieser Name wird anderen Spielern angezeigt.</p>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Dein Name" />
        <div style={{height:12}} />
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn" onClick={submit}>Speichern</button>
        </div>
      </div>
    </div>
  )
}

const overlay = {position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',zIndex:120}
const box = {width:360,padding:18}
