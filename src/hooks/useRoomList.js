import { useEffect, useState } from 'react'
import { useFirebase } from '../firebaseContext'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { getGameById } from '../config/gamesRegistry'

/**
 * Echtzeit-Liste offener Räume (status === 'waiting') für einen Spieltyp.
 * @param {string} gameId - Eintrag aus gamesRegistry (z.B. 'imposter', 'bingo')
 * @returns {{ rooms: Array<{ id: string, ... }>, loading: boolean }}
 */
export function useRoomList(gameId) {
  const { db } = useFirebase()
  const game = getGameById(gameId)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !game?.collection) {
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      collection(db, game.collection),
      where('status', '==', 'waiting')
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setRooms(list)
        setLoading(false)
      },
      (err) => {
        console.error('useRoomList onSnapshot', err)
        setRooms([])
        setLoading(false)
      }
    )
    return unsub
  }, [db, game?.collection])

  return { rooms, loading }
}
