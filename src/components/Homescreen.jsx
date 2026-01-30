import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFirebase } from '../firebaseContext'
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore'

export default function Homescreen() {
  const { db, uid, username } = useFirebase()
  const [hasOpenRoom, setHasOpenRoom] = useState(false)
  const [openRoomId, setOpenRoomId] = useState(null)
  const nav = useNavigate()

  useEffect(() => {
    const q = query(collection(db, 'rooms'), where('status', '==', 'waiting'))
    const unsub = onSnapshot(q, (qsnap) => {
      let found = false
      qsnap.forEach(d => {
        if (!found) {
          found = true
          setOpenRoomId(d.id)
        }
      })
      setHasOpenRoom(found)
      if (!found) setOpenRoomId(null)
    }, (err) => console.error('rooms onSnapshot', err))
    return unsub
  }, [db])

  const joinFirst = async () => {
    if (!hasOpenRoom || !openRoomId) return
    const ref = doc(db, 'rooms', openRoomId)
    // add player
    await setDoc(ref, { players: arrayUnion({ id: uid, name: username ?? uid }), status: 'waiting' }, { merge: true })
    nav(`/imposter/${openRoomId}`)
  }

  return (
    <div>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1>Spiel-Hub</h1>
      </header>

      <div style={{marginTop:12, display:'flex', gap:12}}>
        <button className="btn" onClick={joinFirst} disabled={!hasOpenRoom}>{hasOpenRoom ? 'Spiel beitreten' : 'Kein offenes Spiel'}</button>
        <Link to="/admin" className="btn" style={{background:'transparent',border:'1px solid rgba(255,140,0,0.12)',color:'var(--text)'}}>Admin</Link>
      </div>

      <section className="games-grid">
        <Link to='/imposter' className="game-card">
          <h3>Imposter</h3>
          <p>Find the imposter. Host starts the round.</p>
        </Link>

        <Link to='/bingo' className="game-card">
          <h3>Selfmade Bingo</h3>
          <p>Shared bingo board — mark cells and sync in real-time.</p>
        </Link>

        <Link to='/quiz' className="game-card">
          <h3>Pub Quiz</h3>
          <p>Admin can create questions, players answer and leaderboard updates live.</p>
        </Link>
      </section>
    </div>
  )
}
