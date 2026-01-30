import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FirebaseProvider } from './firebaseContext'
import Homescreen from './components/Homescreen'
import Navbar from './components/Navbar'
import LoadingScreen from './components/LoadingScreen'

const ImposterGame = React.lazy(() => import('./games/ImposterGame'))
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'))
const Bingo = React.lazy(() => import('./games/Bingo'))

export default function App() {
  return (
    <FirebaseProvider>
      <BrowserRouter>
        <Navbar />
        <main className="app-main container">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path='/' element={<Homescreen />} />
              <Route path='/imposter' element={<ImposterGame />} />
              <Route path='/imposter/:roomId' element={<ImposterGame />} />
              <Route path='/bingo' element={<Bingo />} />
              <Route path='/bingo/:roomId' element={<Bingo />} />
              <Route path='/admin' element={<AdminPanel />} />
              {/* /bingo and /quiz routes will be added later */}
            </Routes>
          </Suspense>
        </main>
      </BrowserRouter>
    </FirebaseProvider>
  )
}
