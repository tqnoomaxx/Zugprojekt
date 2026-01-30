import React, { useEffect, useState, useCallback } from 'react'
import { useFirebase } from '../firebaseContext'
import { collection, query, doc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore'
import { useGameRoom } from '../hooks/useGameRoom'
import LoadingScreen from '../components/LoadingScreen'
import LobbyView from '../components/LobbyView'

// Demo word pairs: [crew, imposter]
const WORD_PAIRS = [
  ['Zitrone', 'Limette'],
  ['Apfel', 'Birne'],
  ['Auto', 'Motorrad'],
  ['Hund', 'Wolf'],
  ['Computer', 'Tablet'],
  ['Berg', 'Hügel'],
  ['Kaffee', 'Tee'],
  ['Katze', 'Löwe'],
  ['Schule', 'Universität'],
  ['Fluss', 'See'],
]

const IMPOSTER_COLLECTION = 'imposterRooms'

export default function ImposterGame(){
  const { db } = useFirebase()
  const {
    roomId,
    room,
    loading,
    joining,
    joinRoom,
    userId,
    username,
  } = useGameRoom(IMPOSTER_COLLECTION, '/imposter')
  const [manualRoomId, setManualRoomId] = useState('')
  const [wordSets, setWordSets] = useState([])
  const [selectedSet, setSelectedSet] = useState('')

  // load word sets (for host selection)
  useEffect(() => {
    if (!db) return
    const q = query(collection(db, 'wordSets'))
    return onSnapshot(q, (qsnap) => {
      const arr = []
      qsnap.forEach(d => arr.push({ id: d.id, ...d.data() }))
      setWordSets(arr)
      if (!selectedSet && arr.length) setSelectedSet(arr[0].id)
    }, (err) => console.error('wordSets onSnapshot', err))
  }, [db, selectedSet])

  // start game (host only)
  const startRound = useCallback(async () => {
    if (!db || !roomId) return
  const ref = doc(db, IMPOSTER_COLLECTION, roomId)
    try {
      await runTransaction(db, async (tx) => {
        const r = await tx.get(ref)
        if (!r.exists()) throw new Error('Room not found')
        const data = r.data() || {}
        if (data.host !== userId) throw new Error('Nur der Host kann starten')
        const playersArr = Array.isArray(data.players) ? data.players : []
        if (playersArr.length < 3) throw new Error('Mindestens 3 Spieler benötigt')
        // Wortauswahl
        let word = '', imposterWord = ''
        let words = WORD_PAIRS
        const chosen = wordSets.find(s => s.id === selectedSet)
        if (chosen && Array.isArray(chosen.words) && chosen.words.length > 1) {
          // Use pairs from wordSet: expect format [[a,b],[a2,b2],...]
          words = chosen.words.filter(w => Array.isArray(w) && w.length === 2)
        }
        if (words.length === 0) throw new Error('Keine Wortpaare gefunden')
        const [crewWord, impWord] = words[Math.floor(Math.random() * words.length)]
        word = crewWord
        imposterWord = impWord
        // Rollen
        const players = playersArr.map(p => p.id)
        const imposterIndex = Math.floor(Math.random() * players.length)
        const roles = {}
        players.forEach((pid, idx) => roles[pid] = idx === imposterIndex ? 'imposter' : 'player')
        // Setup Hinweise
        const clues = {}
        players.forEach((pid, idx) => {
          if (idx === imposterIndex) clues[pid] = imposterWord // oder '' für Outsider
          else clues[pid] = word
        })
        // Game state
        const updates = {
          status: 'active',
          word,
          imposterWord,
          roles,
          clues,
          startedAt: Date.now(),
          selectedSetId: selectedSet || null,
          round: 1,
          turn: 0,
          phase: 'clue', // 'clue' | 'vote' | 'reveal' | 'end'
          cluesGiven: {},
          votes: {},
          eliminated: [],
          winner: null,
          imposterGuess: null
        }
        tx.update(ref, updates)
      })
    } catch (e) {
      console.error('startRound error', e)
    }
  }, [db, roomId, room, selectedSet, wordSets])


  // derived
  const userRole = room?.roles?.[userId]
  const phase = room?.phase
  const clues = room?.cluesGiven || {}
  const votes = room?.votes || {}
  const eliminated = room?.eliminated || []
  const isAlive = !eliminated.includes(userId)
  const isImposter = userRole === 'imposter'
  const myClue = clues[userId]
  const canGiveClue = phase === 'clue' && isAlive && !myClue
  const canVote = phase === 'vote' && isAlive && !votes[userId]
  const canGuess = isImposter && isAlive && phase !== 'end'

  // submit clue
  const submitClue = async (clue) => {
    if (!db || !roomId || !clue) return
  const ref = doc(db, IMPOSTER_COLLECTION, roomId)
    await setDoc(ref, { cluesGiven: { ...room.cluesGiven, [userId]: clue } }, { merge: true })
  }

  // submit vote
  const submitVote = async (targetId) => {
    if (!db || !roomId || !targetId) return
  const ref = doc(db, IMPOSTER_COLLECTION, roomId)
    await setDoc(ref, { votes: { ...room.votes, [userId]: targetId } }, { merge: true })
  }

  // imposter guess
  const submitImposterGuess = async (guess) => {
    if (!db || !roomId || !guess) return
  const ref = doc(db, IMPOSTER_COLLECTION, roomId)
    await setDoc(ref, { imposterGuess: { guess, by: userId } }, { merge: true })
  }

  // next phase (host only)
  const nextPhase = async () => {
    if (!db || !roomId || room?.host !== userId) return
  const ref = doc(db, IMPOSTER_COLLECTION, roomId)
    // phase transitions: clue -> vote -> reveal -> clue or end
    if (phase === 'clue') {
      // all clues given?
      const alive = room.players.filter(p => !eliminated.includes(p.id)).map(p=>p.id)
      if (alive.every(pid => clues[pid])) {
        await setDoc(ref, { phase: 'vote', votes: {} }, { merge: true })
      }
    } else if (phase === 'vote') {
      // all votes in?
      const alive = room.players.filter(p => !eliminated.includes(p.id)).map(p=>p.id)
      if (alive.every(pid => votes[pid])) {
        // tally votes
        const tally = {}
        Object.values(votes).forEach(pid => { tally[pid] = (tally[pid]||0)+1 })
        // find max
        let max = 0, out = []
        Object.entries(tally).forEach(([pid, n]) => {
          if (n > max) { max = n; out = [pid] }
          else if (n === max) out.push(pid)
        })
        let eliminatedNow = [...eliminated]
        let reveal = null
        if (out.length === 1) {
          eliminatedNow.push(out[0])
          reveal = out[0]
        }
        // check win
        const aliveAfter = room.players.filter(p => !eliminatedNow.includes(p.id))
        let winner = null
        if (eliminatedNow.includes(room.imposter) || (aliveAfter.length <= 2 && !eliminatedNow.includes(room.imposter))) {
          winner = eliminatedNow.includes(room.imposter) ? 'crew' : 'imposter'
        }
        await setDoc(ref, {
          phase: winner ? 'end' : 'reveal',
          eliminated: eliminatedNow,
          winner,
          reveal,
        }, { merge: true })
      }
    } else if (phase === 'reveal') {
      // next round
      await setDoc(ref, {
        phase: 'clue',
        round: (room.round||1)+1,
        cluesGiven: {},
        votes: {},
        reveal: null
      }, { merge: true })
    }
  }

  // check imposter guess win
  useEffect(() => {
    if (room?.imposterGuess && !room?.winner && isImposter && room.imposterGuess.guess) {
      if (room.imposterGuess.guess.trim().toLowerCase() === (room.word||'').trim().toLowerCase()) {
        // imposter wins
        setDoc(doc(db, IMPOSTER_COLLECTION, roomId), { winner: 'imposter', phase: 'end' }, { merge: true })
      }
    }
  }, [room?.imposterGuess, room?.winner, isImposter, room?.word, db, roomId])

  if (!userId) return <LoadingScreen />

  // If there is no roomId param, show Join (main) / Create options
  const joinMain = () => joinRoom('main')
  if (!roomId) {
    return (
      <div className="container">
        <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2>Imposter</h2>
          <div className="muted">{username ?? userId}</div>
        </header>

        <section className="card" style={{marginTop:16}}>
          <p>Finde ein offenes Spiel oder erstelle ein neues.</p>
          <div style={{display:'flex',gap:12}}>
            <button className="btn-orange" onClick={joinMain} disabled={joining}>{joining ? 'Beitreten...' : 'Spiel suchen & beitreten'}</button>
            <button className="btn-orange" onClick={joinMain} disabled={joining}>{joining ? 'Erstelle...' : 'Neues Spiel erstellen'}</button>
          </div>
        </section>
      </div>
    )
  }

  // Room view (roomId from URL)
  return (
    <div className="container">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Imposter — Raum: {roomId}</h2>
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
            <LobbyView room={room} currentUid={userId} onStart={startRound} />

            <div style={{marginTop:12}}>
              <label className="muted">Wort-Set wählen (Host):</label>
              <div style={{height:8}} />
              <select value={selectedSet ?? ''} onChange={e=>setSelectedSet(e.target.value)}>
                <option value="">Standard</option>
                {wordSets.map(s=> <option key={s.id} value={s.id}>{s.title ?? s.id}</option>)}
              </select>
            </div>
          </div>
        )}


        {room && room.status === 'active' && (
          <div>
            {/* Hinweis- und Voting-Phasen */}
            <div style={{display:'flex',gap:24,alignItems:'flex-start',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:260}}>
                <div className="card" style={{background:isImposter ? '#2b1111' : '#112b11', color:isImposter ? '#ffb9b9' : '#b9ffb9'}}>
                  <div style={{fontWeight:700}}>
                    {isImposter ? 'Du bist der Imposter' : 'Dein geheimes Wort'}
                  </div>
                  <div style={{fontSize:20,fontWeight:700,marginTop:4}}>
                    {room.clues?.[userId] || (isImposter ? (room.imposterWord || 'Du bist der Outsider') : room.word)}
                  </div>
                </div>

                {/* Imposter: Wort raten */}
                {canGuess && (
                  <div style={{marginTop:18}}>
                    <form onSubmit={e=>{e.preventDefault(); const guess=e.target.elements.guess.value; if(guess) submitImposterGuess(guess)}}>
                      <label className="muted">Crew-Wort raten (jederzeit):</label>
                      <div style={{display:'flex',gap:8,marginTop:4}}>
                        <input name="guess" placeholder="Wort eingeben..." style={{flex:1}} autoComplete="off" />
                        <button className="btn" type="submit">Raten</button>
                      </div>
                    </form>
                    {room.imposterGuess && <div style={{marginTop:6,fontSize:13}} className="muted">Letzter Versuch: {room.imposterGuess.guess}</div>}
                  </div>
                )}
              </div>

              <div style={{flex:2,minWidth:260}}>
                {/* Hinweiseingabe */}
                {phase === 'clue' && isAlive && (
                  <div style={{marginBottom:12}}>
                    <label className="muted">Gib einen Hinweis (ein Wort):</label>
                    <form onSubmit={e=>{e.preventDefault(); const clue=e.target.elements.clue.value; if(clue) submitClue(clue)}} style={{display:'flex',gap:8,marginTop:4}}>
                      <input name="clue" placeholder="Hinweis..." disabled={!canGiveClue} autoComplete="off" />
                      <button className="btn-orange" type="submit" disabled={!canGiveClue}>Senden</button>
                    </form>
                  </div>
                )}
                {/* Hinweise anzeigen */}
                <div style={{marginBottom:12}}>
                  <div className="muted">Hinweise dieser Runde:</div>
                  <ul style={{margin:0,padding:0,listStyle:'none',display:'flex',gap:10,flexWrap:'wrap'}}>
                    {room.players.filter(p=>!eliminated.includes(p.id)).map(p=>(
                      <li key={p.id} style={{background:'#222',borderRadius:8,padding:'6px 12px',minWidth:60,textAlign:'center',color:clues[p.id]?'#fff':'#888'}}>
                        <span style={{fontWeight:600}}>{p.name}</span><br/>
                        <span>{clues[p.id]||'...'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Voting */}
                {phase === 'vote' && isAlive && (
                  <div style={{marginBottom:12}}>
                    <label className="muted">Stimme ab, wer verdächtig ist:</label>
                    <form onSubmit={e=>{e.preventDefault(); const v=e.target.elements.vote.value; if(v) submitVote(v)}} style={{display:'flex',gap:8,marginTop:4}}>
                      <select name="vote" defaultValue="">
                        <option value="" disabled>Wähle Spieler</option>
                        {room.players.filter(p=>!eliminated.includes(p.id)).map(p=>(
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button className="btn-orange" type="submit" disabled={!canVote}>Abstimmen</button>
                    </form>
                  </div>
                )}

                {/* Votes anzeigen */}
                {phase === 'vote' && (
                  <div className="muted" style={{marginBottom:8}}>
                    Stimmen bisher: {Object.keys(votes).length} / {room.players.filter(p=>!eliminated.includes(p.id)).length}
                  </div>
                )}

                {/* Reveal Phase */}
                {phase === 'reveal' && room.reveal && (
                  <div style={{margin:'16px 0',padding:12,background:'#222',borderRadius:10}}>
                    <strong>{room.players.find(p=>p.id===room.reveal)?.name||'?'}</strong> wurde eliminiert.<br/>
                    {room.roles?.[room.reveal]==='imposter' ? (
                      <span style={{color:'#ffb9b9'}}>Das war der Imposter!</span>
                    ) : (
                      <span style={{color:'#b9ffb9'}}>Crew-Mitglied.</span>
                    )}
                  </div>
                )}

                {/* Eliminierte anzeigen */}
                {eliminated.length > 0 && (
                  <div className="muted" style={{marginTop:8}}>Eliminierte: {room.players.filter(p=>eliminated.includes(p.id)).map(p=>p.name).join(', ')}</div>
                )}

                {/* Host: Phase steuern */}
                {room.host === userId && phase !== 'end' && (
                  <button className="btn" style={{marginTop:16}} onClick={nextPhase}>Nächste Phase</button>
                )}
              </div>
            </div>

            {/* End-Phase */}
            {phase === 'end' && (
              <div style={{marginTop:24,padding:18,background:'#181818',borderRadius:12}}>
                <h3>Spiel beendet</h3>
                {room.winner === 'crew' && <div style={{color:'#b9ffb9',fontWeight:700}}>Die Crew hat gewonnen!</div>}
                {room.winner === 'imposter' && <div style={{color:'#ffb9b9',fontWeight:700}}>Der Imposter hat gewonnen!</div>}
                {room.imposterGuess && (
                  <div className="muted" style={{marginTop:8}}>
                    Imposter-Versuch: <strong>{room.imposterGuess.guess}</strong>
                  </div>
                )}
                <div style={{marginTop:12}}>
                  <button className="btn-orange" onClick={startRound}>Neue Runde starten</button>
                </div>
              </div>
            )}
          </div>
        )}

        {room && room.status !== 'waiting' && room.status !== 'active' && (
          <div className="muted">Raumstatus: {room.status}</div>
        )}

      </section>
    </div>
  )
}
