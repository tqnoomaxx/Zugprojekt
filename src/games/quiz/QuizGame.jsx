import React, { useCallback, useState } from 'react'
import { useFirebase } from '../../firebaseContext'
import { doc, setDoc, runTransaction } from 'firebase/firestore'
import { useGameRoom } from '../../hooks/useGameRoom'
import LoadingScreen from '../../components/LoadingScreen'
import LobbyView from '../../components/LobbyView'

const QUIZ_COLLECTION = 'quizRooms'

const DEMO_QUESTIONS = [
  { text: 'Was ist die Hauptstadt von Deutschland?', options: ['München', 'Berlin', 'Hamburg', 'Köln'], correctIndex: 1 },
  { text: 'Wie viele Planeten hat unser Sonnensystem?', options: ['7', '8', '9', '10'], correctIndex: 1 },
  { text: 'In welchem Jahr fiel die Mauer?', options: ['1987', '1989', '1991', '1985'], correctIndex: 1 },
  { text: 'Welche Farbe hat ein Smaragd?', options: ['Blau', 'Rot', 'Grün', 'Gelb'], correctIndex: 2 },
  { text: 'Was ist 7 × 8?', options: ['54', '56', '58', '60'], correctIndex: 1 },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuizGame() {
  const { db } = useFirebase()
  const { roomId, room, loading, joining, joinRoom, createRoom, searchAndJoin, userId, username } = useGameRoom(
    QUIZ_COLLECTION,
    '/quiz'
  )
  const [manualRoomId, setManualRoomId] = useState('')

  const startGame = useCallback(async () => {
    if (!db || !roomId || !room) return
    const ref = doc(db, QUIZ_COLLECTION, roomId)
    try {
      const questions = shuffle(DEMO_QUESTIONS).slice(0, 5)
      const scores = {}
      room.players?.forEach((p) => { scores[p.id] = 0 })
      await setDoc(ref, {
        status: 'active',
        questions,
        currentQuestionIndex: 0,
        phase: 'question',
        answers: {},
        scores,
        startedAt: Date.now(),
      }, { merge: true })
    } catch (e) {
      console.error('startGame error', e)
    }
  }, [db, roomId, room])

  const nextPhase = useCallback(async () => {
    if (!db || !roomId || !room || room.host !== userId) return
    const ref = doc(db, QUIZ_COLLECTION, roomId)
    const idx = room.currentQuestionIndex ?? 0
    const questions = room.questions ?? []
    const phase = room.phase

    if (phase === 'question') {
      await setDoc(ref, { phase: 'answer' }, { merge: true })
    } else if (phase === 'answer') {
      const answers = room.answers ?? {}
      const scores = { ...(room.scores ?? {}) }
      const correctIndex = questions[idx]?.correctIndex ?? -1
      room.players?.forEach((p) => {
        if (answers[p.id] === correctIndex) scores[p.id] = (scores[p.id] ?? 0) + 1
      })
      await setDoc(ref, { phase: 'leaderboard', scores }, { merge: true })
    } else if (phase === 'leaderboard') {
      if (idx + 1 >= questions.length) {
        await setDoc(ref, { status: 'finished', phase: 'end', finishedAt: Date.now() }, { merge: true })
      } else {
        await setDoc(ref, {
          currentQuestionIndex: idx + 1,
          phase: 'question',
          answers: {},
        }, { merge: true })
      }
    }
  }, [db, roomId, room, userId])

  const submitAnswer = useCallback(
    async (optionIndex) => {
      if (!db || !roomId || room?.phase !== 'answer') return
      const ref = doc(db, QUIZ_COLLECTION, roomId)
      const answers = { ...(room.answers ?? {}), [userId]: optionIndex }
      await setDoc(ref, { answers }, { merge: true })
    },
    [db, roomId, room?.phase, room?.answers, userId]
  )

  if (!userId) return <LoadingScreen />

  if (!roomId) {
    return (
      <div className="container">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Pub Quiz</h2>
          <div className="muted">{username ?? userId}</div>
        </header>
        <section className="card" style={{ marginTop: 16 }}>
          <p>Suche ein offenes Quiz oder erstelle ein neues.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-orange" onClick={searchAndJoin} disabled={joining}>
              {joining ? 'Suche...' : 'Spiel suchen & beitreten'}
            </button>
            <button className="btn-orange" onClick={createRoom} disabled={joining}>
              {joining ? 'Erstelle...' : 'Neues Spiel erstellen'}
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Pub Quiz — Raum: {roomId}</h2>
        <div className="muted">{username ?? userId}</div>
      </header>

      <section className="card" style={{ marginTop: 16 }}>
        {loading && <LoadingScreen />}

        {!room && !loading && (
          <div>
            <p>Kein Raum geladen.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={manualRoomId || roomId || ''}
                onChange={(e) => setManualRoomId(e.target.value)}
                placeholder="Raum ID"
              />
              <button className="btn-orange" onClick={() => joinRoom(manualRoomId || roomId)} disabled={joining}>
                {joining ? 'Beitreten...' : 'Join'}
              </button>
            </div>
          </div>
        )}

        {room?.status === 'waiting' && (
          <div>
            <LobbyView room={room} currentUid={userId} onStart={startGame} />
          </div>
        )}

        {room?.status === 'active' && (() => {
          const q = room.questions?.[room.currentQuestionIndex ?? 0]
          return (
          <div>
            {room.phase === 'question' && q && (
              <div>
                <h3>Frage {((room.currentQuestionIndex ?? 0) + 1)} / {(room.questions?.length ?? 0)}</h3>
                <p style={{ fontSize: 18 }}>{q.text}</p>
                {room.host === userId && (
                  <button className="btn-orange" style={{ marginTop: 12 }} onClick={nextPhase}>
                    Antworten anzeigen
                  </button>
                )}
              </div>
            )}

            {room.phase === 'answer' && q && (
              <div>
                <h3>Frage {((room.currentQuestionIndex ?? 0) + 1)}</h3>
                <p style={{ marginBottom: 12 }}>{q.text}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, i) => (
                    <button
                      key={i}
                      className="btn"
                      style={{
                        opacity: room.answers?.[userId] === i ? 0.8 : 1,
                        background: room.answers?.[userId] === i ? 'rgba(255,106,0,0.3)' : undefined,
                      }}
                      onClick={() => submitAnswer(i)}
                      disabled={room.answers?.[userId] !== undefined}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {room.host === userId && (
                  <div className="muted" style={{ marginTop: 12 }}>
                    Antworten: {Object.keys(room.answers ?? {}).length} / {room.players?.length ?? 0}
                  </div>
                )}
              </div>
            )}

            {room.phase === 'leaderboard' && (
              <div>
                <h3>Punktestand</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {(room.players ?? [])
                    .map((p) => ({ ...p, score: (room.scores ?? {})[p.id] ?? 0 }))
                    .sort((a, b) => b.score - a.score)
                    .map((p, i) => (
                      <li key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {i + 1}. {p.name} — {p.score} {p.score === 1 ? 'Punkt' : 'Punkte'}
                      </li>
                    ))}
                </ul>
                {room.host === userId && (
                  <button className="btn-orange" style={{ marginTop: 16 }} onClick={nextPhase}>
                    {((room.currentQuestionIndex ?? 0) + 1) >= (room.questions?.length ?? 0)
                      ? 'Spiel beenden'
                      : 'Nächste Frage'}
                  </button>
                )}
              </div>
            )}
          </div>
          )
        })()}

        {room?.status === 'finished' && (
          <div>
            <h3>Spiel beendet</h3>
            <p className="muted">Finaler Stand:</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(room.players ?? [])
                .map((p) => ({ ...p, score: (room.scores ?? {})[p.id] ?? 0 }))
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <li key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {i + 1}. {p.name} — {p.score} {p.score === 1 ? 'Punkt' : 'Punkte'}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
