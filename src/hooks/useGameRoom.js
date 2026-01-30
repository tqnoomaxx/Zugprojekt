import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFirebase } from '../firebaseContext'
import { collection, query, where, getDocs, addDoc, doc, runTransaction, onSnapshot } from 'firebase/firestore'

/**
 * Generischer Hook für Spielräume: Subscribe, Join, Create in einer Collection.
 * @param {string} collectionName - Firestore-Collection (z.B. 'bingoRooms', 'imposterRooms')
 * @param {string} pathPrefix - URL-Prefix für Navigation (z.B. '/bingo', '/imposter')
 * @returns {{ room, loading, joining, error, joinRoom, createRoom, searchAndJoin }}
 */
export function useGameRoom(collectionName, pathPrefix) {
  const { db, uid, username } = useFirebase()
  const navigate = useNavigate()
  const { roomId: paramRoomId } = useParams()

  const roomId = paramRoomId || null
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)

  // Subscribe to room when roomId is set
  useEffect(() => {
    if (!db || !roomId) return
    setLoading(true)
    setError(null)
    const ref = doc(db, collectionName, roomId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setRoom(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        setLoading(false)
      },
      (err) => {
        console.error('room onSnapshot', err)
        setError(err?.message || 'Fehler beim Laden')
        setLoading(false)
      }
    )
    return unsub
  }, [db, collectionName, roomId])

  const joinRoom = useCallback(
    async (id) => {
      if (!db || !uid || !id) return
      setJoining(true)
      setError(null)
      try {
        const ref = doc(db, collectionName, id)
        await runTransaction(db, async (tx) => {
          const r = await tx.get(ref)
          if (!r.exists()) {
            tx.set(ref, {
              players: [{ id: uid, name: username ?? uid }],
              host: uid,
              status: 'waiting',
              createdAt: Date.now(),
            })
            return
          }
          const data = r.data() || {}
          const players = Array.isArray(data.players) ? [...data.players] : []
          if (!players.find((p) => p.id === uid)) players.push({ id: uid, name: username ?? uid })
          const updates = { players, status: data.status ?? 'waiting' }
          if (!data.host) updates.host = uid
          tx.update(ref, updates)
        })
        navigate(`${pathPrefix}/${id}`)
      } catch (e) {
        console.error('joinRoom error', e)
        setError(e?.message || 'Beitreten fehlgeschlagen')
      } finally {
        setJoining(false)
      }
    },
    [db, uid, username, collectionName, pathPrefix, navigate]
  )

  const createRoom = useCallback(
    async () => {
      if (!db || !uid) return
      setJoining(true)
      setError(null)
      try {
        const ref = await addDoc(collection(db, collectionName), {
          host: uid,
          players: [{ id: uid, name: username ?? uid }],
          status: 'waiting',
          createdAt: Date.now(),
        })
        navigate(`${pathPrefix}/${ref.id}`)
      } catch (e) {
        console.error('createRoom error', e)
        setError(e?.message || 'Erstellen fehlgeschlagen')
      } finally {
        setJoining(false)
      }
    },
    [db, uid, username, collectionName, pathPrefix, navigate]
  )

  const searchAndJoin = useCallback(
    async () => {
      if (!db || !uid) return
      setLoading(true)
      setError(null)
      try {
        const q = query(collection(db, collectionName), where('status', '==', 'waiting'))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const id = snap.docs[0].id
          const ref = doc(db, collectionName, id)
          await runTransaction(db, async (tx) => {
            const r = await tx.get(ref)
            if (!r.exists()) throw new Error('Room disappeared')
            const data = r.data() || {}
            const players = Array.isArray(data.players) ? [...data.players] : []
            if (!players.find((p) => p.id === uid)) players.push({ id: uid, name: username ?? uid })
            tx.update(ref, { players, status: data.status ?? 'waiting' })
          })
          navigate(`${pathPrefix}/${id}`)
        }
      } catch (e) {
        console.error('searchAndJoin error', e)
        setError(e?.message || 'Kein offener Raum gefunden')
      } finally {
        setLoading(false)
      }
    },
    [db, uid, username, collectionName, pathPrefix, navigate]
  )

  return {
    roomId,
    room,
    loading,
    joining,
    error,
    joinRoom,
    createRoom,
    searchAndJoin,
    userId: uid,
    username,
  }
}
