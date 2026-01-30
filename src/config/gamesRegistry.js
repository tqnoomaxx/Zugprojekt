import React from 'react'

/**
 * Zentrale Spieleregistry: Ein neues Spiel = Eintrag hier + Game-Komponente + Route aus App.
 * collection: Firestore-Collection-Name (z.B. imposterRooms, bingoRooms)
 */
export const GAMES = [
  {
    gameId: 'imposter',
    path: '/imposter',
    name: 'Imposter',
    collection: 'imposterRooms',
    minPlayers: 3,
    component: React.lazy(() => import('../games/ImposterGame')),
  },
  {
    gameId: 'bingo',
    path: '/bingo',
    name: 'Selfmade Bingo',
    collection: 'bingoRooms',
    minPlayers: 1,
    component: React.lazy(() => import('../games/Bingo')),
  },
  {
    gameId: 'quiz',
    path: '/quiz',
    name: 'Pub Quiz',
    collection: 'quizRooms',
    minPlayers: 1,
    component: React.lazy(() => import('../games/quiz/QuizGame')),
  },
]

export function getGameByPath(path) {
  return GAMES.find((g) => g.path === path || path?.startsWith(g.path + '/'))
}

export function getGameById(gameId) {
  return GAMES.find((g) => g.gameId === gameId)
}
