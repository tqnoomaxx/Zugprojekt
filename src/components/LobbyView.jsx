import React from 'react'

export default function LobbyView({ room, currentUid, onStart }){
  const isHost = room?.host === currentUid

  return (
    <div>
      <h3>Lobby</h3>
      <div className="card">
        <ul style={{listStyle:'none',padding:0,margin:0}}>
          {room.players?.map((p,i)=> (
            <li key={p.id} style={{padding:'10px 0',borderBottom: i < (room.players?.length-1) ? '1px solid rgba(255,140,0,0.06)' : 'none', display:'flex', justifyContent:'space-between'}}>
              <div>{p.name}</div>
              {room.host === p.id && <div style={{color:'var(--primary)',fontSize:12}}>Host</div>}
            </li>
          ))}
        </ul>

        <div style={{marginTop:12,display:'flex',justifyContent:'flex-end'}}>
          {isHost ? (
            <button className="btn" onClick={onStart}>Start</button>
          ) : (
            <div className="muted">Warte auf den Host, um das Spiel zu starten.</div>
          )}
        </div>
      </div>
    </div>
  )
}
