import React from 'react'

function cellStyle(selected){
  return {
    width:60,
    height:60,
    display:'flex',
    alignItems:'center',
    justifyContent:'center',
    borderRadius:8,
    background: selected ? 'linear-gradient(90deg,#ff6a00,#ffb470)' : 'transparent',
    color: selected ? '#111' : 'var(--text)',
    fontWeight:700,
    boxShadow: selected ? '0 8px 18px rgba(255,106,0,0.12)' : 'none'
  }
}

export default function BingoCard({ card, drawn=[] }){
  // card is 5x5 array (array of arrays) where center can be 'FREE'
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(5,60px)',gap:8}}>
      {card.flat().map((c, idx) => {
        const isFree = c === 'FREE' || c === null
        const selected = isFree || drawn.includes(c)
        return (
          <div key={idx} style={cellStyle(selected)}>
            <div style={{textAlign:'center',fontSize:14}}>{isFree ? 'FREE' : c}</div>
          </div>
        )
      })}
    </div>
  )
}
