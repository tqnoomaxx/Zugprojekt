import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FirebaseProvider } from './firebaseContext'
import Homescreen from './components/Homescreen'
import Navbar from './components/Navbar'
import LoadingScreen from './components/LoadingScreen'
import { GAMES } from './config/gamesRegistry'

const AdminPanel = React.lazy(() => import('./pages/AdminPanel'))

export default function App() {
  return (
    <FirebaseProvider>
      <BrowserRouter>
        <Navbar />
        <main className="app-main container">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Homescreen />} />
              {GAMES.map((game) => {
                const GameComponent = game.component
                return (
                  <React.Fragment key={game.gameId}>
                    <Route path={game.path} element={<GameComponent />} />
                    <Route path={`${game.path}/:roomId`} element={<GameComponent />} />
                  </React.Fragment>
                )
              })}
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </Suspense>
        </main>
      </BrowserRouter>
    </FirebaseProvider>
  )
}
