import React, { useState, useCallback } from 'react'
import { useFirebase } from '../firebaseContext'
import { doc, runTransaction } from 'firebase/firestore'
import { useGameRoom } from '../hooks/useGameRoom'
import LoadingScreen from '../components/LoadingScreen'
import LobbyView from '../components/LobbyView'
import BingoCard from './BingoCard'

// Bingo helpers
const MAX_NUMBER = 75

function generateCard(){
  // Generate a standard Bingo 5x5 card: B(1-15), I(16-30), N(31-45), G(46-60), O(61-75)
  const ranges = [ [1,15], [16,30], [31,45], [46,60], [61,75] ]
  const card = Array.from({length:5}, () => Array(5).fill(null))
  for(let col=0; col<5; col++){
    const [min,max] = ranges[col]
    const nums = []
    for(let n=min;n<=max;n++) nums.push(n)
    // shuffle and pick 5
    for(let i=nums.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1)); [nums[i],nums[j]] = [nums[j],nums[i]]
    }
    for(let row=0;row<5;row++){
      card[row][col] = nums[row]
    }
  }
  // center free
  card[2][2] = 'FREE'
  return card
}

function checkBingo(card, drawn){
  // card is 5x5 array; drawn is array of numbers
  const hit = (v) => v === 'FREE' || drawn.includes(v)
  // rows
  for(let r=0;r<5;r++) if(card[r].every(hit)) return true
  // cols
  for(let c=0;c<5;c++){
    let ok=true
    for(let r=0;r<5;r++) if(!hit(card[r][c])) ok=false
    if(ok) return true
  }
  // diag
  if([0,1,2,3,4].every(i=>hit(card[i][i]))) return true
  if([0,1,2,3,4].every(i=>hit(card[i][4-i]))) return true
  return false
}

const BINGO_COLLECTION = 'bingoRooms'

export default function Bingo(){
  const { db } = useFirebase()
  const {
    roomId,
    room,
    loading,
    joining,
    joinRoom,
    createRoom,
    searchAndJoin,
    userId,
    username,
  } = useGameRoom(BINGO_COLLECTION, '/bingo')
  const [manualRoomId, setManualRoomId] = useState('')

  const startGame = useCallback(async () => {
    if (!db || !roomId || !room) return
    const ref = doc(db, BINGO_COLLECTION, roomId)
    try {
      await runTransaction(db, async (tx) => {
        const r = await tx.get(ref)
        if (!r.exists()) throw new Error('Room missing')
        const data = r.data() || {}
        if (data.host !== userId) throw new Error('Nur Host')
        const players = Array.isArray(data.players) ? data.players : []
        // assign cards
        const cards = {}
        players.forEach(p => { cards[p.id] = generateCard() })
        tx.update(ref, { status: 'active', drawnNumbers: [], cards, startedAt: Date.now() })
      })
    } catch (e) { console.error('startGame error', e) }
  }, [db, roomId, room, userId])

  const drawNumber = useCallback(async () => {
    if (!db || !roomId) return
    const ref = doc(db, BINGO_COLLECTION, roomId)
    try {
      await runTransaction(db, async (tx) => {
        const r = await tx.get(ref)
        if (!r.exists()) throw new Error('Room missing')
        const data = r.data() || {}
        if (data.host !== userId) throw new Error('Nur Host')
        const drawn = Array.isArray(data.drawnNumbers) ? [...data.drawnNumbers] : []
        const remaining = []
        for(let n=1;n<=MAX_NUMBER;n++) if (!drawn.includes(n)) remaining.push(n)
        if (remaining.length === 0) return
        const pick = remaining[Math.floor(Math.random()*remaining.length)]
        drawn.push(pick)
        tx.update(ref, { drawnNumbers: drawn })
      })
    } catch (e) { console.error('drawNumber error', e) }
  }, [db, roomId, userId])

  const claimBingo = useCallback(async () => {
    if (!db || !roomId || !room) return
    const ref = doc(db, BINGO_COLLECTION, roomId)
    try {
      await runTransaction(db, async (tx) => {
        const r = await tx.get(ref)
        if (!r.exists()) throw new Error('Room missing')
        const data = r.data() || {}
        const cards = data.cards || {}
        const drawn = Array.isArray(data.drawnNumbers) ? data.drawnNumbers : []
        const myCard = cards[userId]
        if (!myCard) throw new Error('Keine Karte')
        if (!checkBingo(myCard, drawn)) throw new Error('Kein Bingo')
        // set winner
        tx.update(ref, { winner: { id: userId, name: username ?? userId }, status: 'finished', finishedAt: Date.now() })
      })
    } catch (e) { console.error('claimBingo error', e); alert(e.message ?? e) }
  }, [db, roomId, room, userId, username])

  const myCard = room?.cards?.[userId]
  const drawn = room?.drawnNumbers ?? []
  const isHost = room?.host === userId

  if (!userId) return <LoadingScreen />

  if (!roomId) {
    return (
      <div className="container">
        <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2>Bingo</h2>
          <div className="muted">{username ?? userId}</div>
        </header>
        <section className="card" style={{marginTop:16}}>
          <p>Suche ein offenes Bingo-Spiel oder erstelle ein neues.</p>
          <div style={{display:'flex',gap:12}}>
            <button className="btn-orange" onClick={searchAndJoin} disabled={loading}>{loading ? 'Suche...' : 'Spiel suchen & beitreten'}</button>
            <button className="btn-orange" onClick={createRoom} disabled={loading}>{loading ? 'Erstelle...' : 'Neues Spiel erstellen'}</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="container">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Bingo — Raum: {roomId}</h2>
        <div className="muted">{username ?? userId}</div>
      </header>

      <section className="card" style={{marginTop:16}}>
        {loading && <LoadingScreen />}

        {!room && !loading && (
          <div>
            <p>Kein Raum geladen.</p>
            <div style={{display:'flex',gap:8}}>
              <input value={manualRoomId || roomId || ''} onChange={e=>setManualRoomId(e.target.value)} placeholder="Raum ID" />
              <button className="btn-orange" onClick={()=>joinRoom(manualRoomId || roomId)} disabled={joining}>{joining ? 'Beitreten...' : 'Join'}</button>
            </div>
          </div>
        )}

        {room && room.status === 'waiting' && (
          <div>
            <LobbyView room={room} currentUid={userId} onStart={startGame} />
          </div>
        )}

        {room && room.status === 'active' && (
          <div>
            <div style={{display:'flex',gap:18,alignItems:'flex-start'}}>
              <div>
                <div className="muted">Deine Karte</div>
                {myCard ? <BingoCard card={myCard} drawn={drawn} /> : <div className="muted">Warte auf Kartenzuweisung...</div>}
                <div style={{height:12}} />
                <button className="btn" onClick={claimBingo}>Bingo rufen</button>
              </div>

              <div>
                <div className="muted">Gezogene Zahlen</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,maxWidth:360,marginTop:8}}>
                  {drawn.map(n => (
                    <div key={n} style={{padding:'8px 10px',borderRadius:8,background:'rgba(255,255,255,0.03)',fontWeight:700}}>{n}</div>
                  ))}
                </div>
                <div style={{height:12}} />
                {isHost ? (
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn-orange" onClick={drawNumber}>Ziehe Zahl</button>
                    <button className="btn" onClick={() => startGame()}>Neu starten</button>
                  </div>
                ) : (
                  <div className="muted">Warte auf Host-Zug</div>
                )}
              </div>
            </div>
          </div>
        )}

        {room && room.status === 'finished' && (
          <div>
            <div className="muted">Spiel beendet</div>
            <div style={{marginTop:8}}>Gewinner: {room.winner?.name ?? '—'}</div>
          </div>
        )}

      </section>
    </div>
  )
}
