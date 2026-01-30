import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useFirebase } from '../firebaseContext'

export default function Navbar(){
  const nav = useNavigate()
  const { username } = useFirebase()

  return (
    <header style={headerStyle}>
      <div style={sideStyle}>
        <button onClick={() => nav(-1)} aria-label="Zurück" style={btnStyle}>‹</button>
      </div>

      <div style={{textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#g)" />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ff6a00" />
                <stop offset="1" stopColor="#ffb470" />
              </linearGradient>
            </defs>
            <text x="50%" y="55%" textAnchor="middle" fontSize="11" fontWeight="800" fill="#111">U</text>
          </svg>
          <div className="brand">UGBZ</div>
        </div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>Spielplattform</div>
      </div>

      <div style={{...sideStyle, justifyContent:'flex-end', gap:8}}>
        <div style={{fontSize:14, color:'var(--muted)'}}>{username ?? '...'}</div>
        <button onClick={() => nav('/')} aria-label="Startseite" style={btnStyle}>Start</button>
      </div>
    </header>
  )
}

const headerStyle = {
  position:'fixed',
  top:0,
  left:0,
  right:0,
  height:64,
  display:'flex',
  alignItems:'center',
  justifyContent:'space-between',
  padding:'0 18px',
  background:'rgba(0,0,0,0.55)',
  backdropFilter:'saturate(120%) blur(6px)',
  color:'var(--text)',
  borderBottom:'2px solid var(--primary)',
  zIndex:50
}

const sideStyle = {width:160, display:'flex', alignItems:'center'}

const btnStyle = {background:'transparent',border:'1px solid rgba(255,255,255,0.04)',color:'var(--text)',padding:'8px 10px',borderRadius:10}
