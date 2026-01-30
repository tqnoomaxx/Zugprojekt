import React from 'react'
import { Link } from 'react-router-dom'
import { GAMES } from '../config/gamesRegistry'
import { useRoomList } from '../hooks/useRoomList'

// Ein Hook-Aufruf pro Spiel (Rules of Hooks) – bei neuem Spiel hier ergänzen
function useAllRoomLists() {
  const imposter = useRoomList('imposter')
  const bingo = useRoomList('bingo')
  const quiz = useRoomList('quiz')
  return { imposter, bingo, quiz }
}

const GAME_DESCRIPTIONS = {
  imposter: 'Find the imposter. Host starts the round.',
  bingo: 'Shared bingo board — mark cells and sync in real-time.',
  quiz: 'Admin creates questions, players answer, leaderboard updates live.',
}

export default function Homescreen() {
  const roomLists = useAllRoomLists()

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Spiel-Hub</h1>
      </header>

      <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <Link to="/admin" className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,140,0,0.12)', color: 'var(--text)' }}>
          Admin
        </Link>
      </div>

      <section className="games-grid">
        {GAMES.map((game) => {
          const list = roomLists[game.gameId]
          const rooms = list?.rooms ?? []
          const firstRoom = rooms[0]

          return (
            <div key={game.gameId} className="game-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to={game.path} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                <h3>{game.name}</h3>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  {GAME_DESCRIPTIONS[game.gameId] ?? game.name}
                </p>
              </Link>
              {list?.loading ? (
                <span className="muted">Lade Räume…</span>
              ) : rooms.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span className="muted">{rooms.length} offene {rooms.length === 1 ? 'Raum' : 'Räume'}</span>
                  <Link
                    to={`${game.path}/${firstRoom.id}`}
                    className="btn"
                    style={{ padding: '6px 12px', fontSize: 14 }}
                  >
                    Spiel beitreten
                  </Link>
                </div>
              ) : (
                <Link to={game.path} className="btn" style={{ padding: '6px 12px', fontSize: 14 }}>
                  Neues Spiel starten
                </Link>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
