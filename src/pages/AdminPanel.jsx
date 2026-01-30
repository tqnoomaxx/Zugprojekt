
import React, { useState, useEffect } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { useFirebase } from '../firebaseContext'


export default function AdminPanel(){
  const { db } = useFirebase()
  const [authorized, setAuthorized] = useState(false)
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('')
  const [words, setWords] = useState('')
  const [status, setStatus] = useState('')
  // Edit state für Wort-Sets
  const [editId, setEditId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editWords, setEditWords] = useState('')
  const [wordSets, setWordSets] = useState([])
  // Raumlisten
  const [imposterRooms, setImposterRooms] = useState([])
  const [bingoRooms, setBingoRooms] = useState([])
  const [openRoom, setOpenRoom] = useState(null)

  useEffect(() => {
    if (!db) return
    const unsub1 = onSnapshot(collection(db, 'imposterRooms'), snap => {
      setImposterRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const unsub2 = onSnapshot(collection(db, 'bingoRooms'), snap => {
      setBingoRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const unsub3 = onSnapshot(collection(db, 'wordSets'), snap => {
      setWordSets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsub1(); unsub2(); unsub3(); }
  }, [db])

  const startEdit = (set) => {
    setEditId(set.id)
    setEditTitle(set.title)
    setEditWords(Array.isArray(set.words) ? set.words.join('\n') : '')
  }
  const cancelEdit = () => {
    setEditId(null)
    setEditTitle('')
    setEditWords('')
  }
  const saveEdit = async () => {
    if (!db || !editId || !editTitle || !editWords) return setStatus('Bitte Titel und Wörter angeben')
    const arr = editWords.split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean)
    await updateDoc(doc(db, 'wordSets', editId), { title: editTitle, words: arr })
    setStatus('Set aktualisiert')
    cancelEdit()
  }
  const deleteRoom = async (game, id) => {
    if (!db || !id) return
    await deleteDoc(doc(db, game === 'imposter' ? 'imposterRooms' : 'bingoRooms', id))
    setStatus(`Raum ${id} gelöscht`)
  }
  const saveSet = async (e) => {
    e.preventDefault()
    if (!title || !words) return setStatus('Bitte Titel und Wörter angeben')
    const arr = words.split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean)
    await addDoc(collection(db, 'wordSets'), { title, words: arr })
    setStatus('Gespeichert')
    setTitle('')
    setWords('')
  }
  const deleteSet = async (id) => {
    if (!db || !id) return
    await deleteDoc(doc(db, 'wordSets', id))
    setStatus('Set gelöscht')
  }


  if (!authorized) return (
    <div className="container">
      <h2>Admin Login</h2>
      <form onSubmit={e => {e.preventDefault(); if (password === 'admin123') setAuthorized(true); else setStatus('Falsches Passwort')}} className="card">
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Passwort" />
        <div style={{height:12}} />
        <button className="btn">Login</button>
        <div style={{height:8}} />
        <div className="muted">Initial-Passwort: admin123</div>
        {status && <div style={{marginTop:8}} className="muted">{status}</div>}
      </form>
    </div>
  )

  return (
    <div className="container">
      <h2>Admin Panel</h2>
      <div style={{marginBottom:8, fontSize:13}} className="muted">
        DB: {db ? 'connected' : 'no db'} — wordSets: {wordSets.length} — Imposter-Räume: {imposterRooms.length} — Bingo-Räume: {bingoRooms.length}
      </div>
      <div className="admin-flex" style={{display:'flex',gap:32,flexWrap:'wrap'}}>
        {/* Imposter Karten-Sets */}
        <div style={{flex:1,minWidth:320}}>
          <h3 style={{marginBottom:8}}>Imposter Karten-Sets</h3>
          <div className="card" style={{marginBottom:16}}>
            <form onSubmit={saveSet}>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Set-Titel" />
              <div style={{height:8}} />
              <textarea value={words} onChange={e=>setWords(e.target.value)} placeholder="Wörter (eine pro Zeile oder durch Komma getrennt)" rows={4} />
              <div style={{height:8}} />
              <button className="btn">Set speichern</button>
            </form>
          </div>
          <div className="card" style={{maxHeight:260,overflowY:'auto'}}>
            {wordSets.length === 0 && <div className="muted">Noch keine Sets vorhanden.</div>}
            {wordSets.map(set => (
              <div key={set.id} style={{borderBottom:'1px solid #222',padding:'6px 0'}}>
                {editId === set.id ? (
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="Set-Titel" />
                    <textarea value={editWords} onChange={e=>setEditWords(e.target.value)} rows={3} />
                    <div style={{display:'flex',gap:8,marginTop:4}}>
                      <button className="btn" style={{background:'#222',color:'#ff6a00'}} onClick={saveEdit} type="button">Speichern</button>
                      <button className="btn" style={{background:'#222',color:'#fff'}} onClick={cancelEdit} type="button">Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <b>{set.title}</b>
                      <div className="muted" style={{fontSize:13}}>{Array.isArray(set.words) ? set.words.join(', ') : ''}</div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn" style={{background:'#222',color:'#ffb470'}} onClick={()=>startEdit(set)} type="button">Bearbeiten</button>
                      <button className="btn" style={{background:'#222',color:'#ff6a00'}} onClick={()=>deleteSet(set.id)} type="button">Löschen</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Räume */}
        <div style={{flex:1,minWidth:320}}>
          <h3 style={{marginBottom:8}}>Räume verwalten</h3>
          <div className="card" style={{marginBottom:16}}>
            <b>Imposter-Räume</b>
            {imposterRooms.length === 0 && <div className="muted">Keine Imposter-Räume vorhanden.</div>}
            {imposterRooms
              .slice()
              .sort((a, b) => (a.id > b.id ? 1 : -1))
              .map(room => (
              <div key={room.id} style={{borderBottom:'1px solid #222',padding:'6px 0'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontWeight:600}}>{room.id}</span>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn" style={{background:'#222',color:'#ffb470'}} onClick={()=>setOpenRoom(openRoom===`imposter-${room.id}`?null:`imposter-${room.id}`)} type="button">{openRoom===`imposter-${room.id}`?'Schließen':'Details'}</button>
                    <button className="btn" style={{background:'#222',color:'#ff6a00'}} onClick={()=>deleteRoom('imposter', room.id)} type="button">Löschen</button>
                  </div>
                </div>
                {openRoom===`imposter-${room.id}` && (
                  <div style={{margin:'8px 0 0 0',fontSize:13}}>
                    <div><b>Status:</b> {room.status||'-'}</div>
                    <div><b>Spieler:</b> {Array.isArray(room.players)?room.players.map(p=>p.name||p.id).join(', '):'-'}</div>
                    <div><b>Phase:</b> {room.phase||'-'}</div>
                    <div><b>Host:</b> {room.host||'-'}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="card">
            <b>Bingo-Räume</b>
            {bingoRooms.length === 0 && <div className="muted">Keine Bingo-Räume vorhanden.</div>}
            {bingoRooms
              .slice()
              .sort((a, b) => (a.id > b.id ? 1 : -1))
              .map(room => (
              <div key={room.id} style={{borderBottom:'1px solid #222',padding:'6px 0'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontWeight:600}}>{room.id}</span>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn" style={{background:'#222',color:'#ffb470'}} onClick={()=>setOpenRoom(openRoom===`bingo-${room.id}`?null:`bingo-${room.id}`)} type="button">{openRoom===`bingo-${room.id}`?'Schließen':'Details'}</button>
                    <button className="btn" style={{background:'#222',color:'#ff6a00'}} onClick={()=>deleteRoom('bingo', room.id)} type="button">Löschen</button>
                  </div>
                </div>
                {openRoom===`bingo-${room.id}` && (
                  <div style={{margin:'8px 0 0 0',fontSize:13}}>
                    <div><b>Status:</b> {room.status||'-'}</div>
                    <div><b>Spieler:</b> {Array.isArray(room.players)?room.players.map(p=>p.name||p.id).join(', '):'-'}</div>
                    <div><b>Host:</b> {room.host||'-'}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {status && <div style={{marginTop:16}} className="muted">{status}</div>}
    </div>
  )
}
