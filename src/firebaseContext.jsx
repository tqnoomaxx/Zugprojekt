import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { db, auth } from '../firebase'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import UsernameModal from './components/UsernameModal'

const FirebaseContext = createContext(null)

export function FirebaseProvider({ children }) {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState(null)
  const [showUsernameModal, setShowUsernameModal] = useState(false)

  // ensure anonymous auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth)
        } catch (e) {
          console.error('anonymous sign-in failed', e)
        }
        return
      }

      setUser(u)

      // check Firestore for username
      const userRef = doc(db, 'users', u.uid)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        const data = snap.data()
        setUsername(data.username)
        setShowUsernameModal(false)
      } else {
        // ask for username
        setShowUsernameModal(true)
      }
    })

    return unsub
  }, [])

  const saveUsername = async (name) => {
    if (!user) return
    const userRef = doc(db, 'users', user.uid)
    await setDoc(userRef, { username: name }, { merge: true })
    setUsername(name)
    setShowUsernameModal(false)
  }

  const value = useMemo(() => ({ db, auth, user, uid: user?.uid, username }), [db, auth, user, username])

  return (
    <FirebaseContext.Provider value={value}>
      {children}
      {showUsernameModal && <UsernameModal onSave={saveUsername} />}
    </FirebaseContext.Provider>
  )
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext)
  if (!ctx) throw new Error('useFirebase must be used inside FirebaseProvider')
  return ctx
}
