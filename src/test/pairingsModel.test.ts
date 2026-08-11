vi.mock('uuidv7', () => {
  let counter = 0
  return {
    uuidv7: () => `mock-uuid-${++counter}`,
  }
})

import {
  gamesForRound,
  containersFromGames,
  withParticipantDropped,
  withResultCycled,
  withForfeit,
  isRoundComplete,
  resultToSymbol,
  calculateParticipantPoints,
  sortRoundGamesByPairStrength,
} from '../components/tournament/pairings/pairingsModel.ts'
import type { Game, Participant } from '../domain/tournament.ts'

// Zod 4 may need globalThis.ZodConfig; provide a fallback for tests
try { (globalThis as any).ZodConfig ??= {} } catch { /* ok */ }

function makeParticipant(id: number): Participant {
  return {
    id,
    player: null,
    locales: { ru: { familyName: `Фамилия${id}`, givenName: `Имя${id}` } } as unknown as Participant['locales'],
    capturedRating: { value: null, rank: null },
    startingPoints: 0,
  }
}

function makeGame(overrides: Partial<Game> & { round: number }): Game {
  return {
    id: `game-${Math.random().toString(36).slice(2)}`,
    player1: 0,
    player2: null,
    sente: 'unknown',
    handicap: null,
    result: null,
    status: 'not_started',
    ...overrides,
  }
}

describe('gamesForRound', () => {
  it('filters games by round', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2 }),
      makeGame({ round: 2, player1: 1, player2: 3 }),
      makeGame({ round: 1, player1: 3, player2: 4 }),
    ]
    expect(gamesForRound(games, 1)).toHaveLength(2)
    expect(gamesForRound(games, 2)).toHaveLength(1)
    expect(gamesForRound(games, 3)).toHaveLength(0)
  })
})

describe('containersFromGames', () => {
  it('puts all participants in unpaired when no games exist', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const containers = containersFromGames([], participants, 1)
    expect(containers.unpaired).toEqual([1, 2, 3])
    expect(containers.players1).toEqual([])
    expect(containers.players2).toEqual([])
  })

  it('puts paired participants in players1/players2', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const games = [makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' })]
    const containers = containersFromGames(games, participants, 1)
    expect(containers.unpaired).toEqual([3])
    expect(containers.players1).toEqual([1])
    expect(containers.players2).toEqual([2])
  })

  it('handles bye game (player2 null)', () => {
    const participants = [makeParticipant(1), makeParticipant(2)]
    const games = [
      makeGame({ round: 1, player1: 1, player2: null, status: 'bye' }),
      makeGame({ round: 1, player1: 2, player2: null, status: 'bye' }),
    ]
    const containers = containersFromGames(games, participants, 1)
    expect(containers.unpaired).toEqual([])
    expect(containers.players1).toEqual([1, 2])
    expect(containers.players2).toEqual([null, null])
  })

  it('excludes forfeit games from players1/players2 and puts them in unpaired', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' }),
      makeGame({ round: 1, player1: 3, status: 'forfeit' }),
    ]
    const containers = containersFromGames(games, participants, 1)
    expect(containers.unpaired).toEqual([3])
    expect(containers.players1).toEqual([1])
    expect(containers.players2).toEqual([2])
  })
})

describe('withParticipantDropped', () => {
  const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]

  it('creates a bye game when dropping into empty players1', () => {
    const result = withParticipantDropped([], participants, 1, 1, 'players1', 0, false)
    expect(result).toHaveLength(1)
    expect(result[0].player1).toBe(1)
    expect(result[0].player2).toBeNull()
    expect(result[0].status).toBe('bye')
    expect(result[0].round).toBe(1)
  })

  it('completes a pair when dropping into players2 opposite a player1', () => {
    const existing = [makeGame({ round: 1, player1: 1, player2: null, status: 'bye' })]
    const result = withParticipantDropped(existing, participants, 1, 2, 'players2', 0, false)
    expect(result).toHaveLength(1)
    expect(result[0].player1).toBe(1)
    expect(result[0].player2).toBe(2)
    expect(result[0].status).toBe('not_started')
  })

  it('removes participant from game when dropping into unpaired', () => {
    const existing = [makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' })]
    const result = withParticipantDropped(existing, participants, 1, 1, 'unpaired', 0, false)
    // player1 removed → game with player1=0 filtered out
    expect(result.filter((g) => g.round === 1)).toHaveLength(0)
  })

  it('reverts to bye when removing player2 from a pair', () => {
    const existing = [makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' })]
    const result = withParticipantDropped(existing, participants, 1, 2, 'unpaired', 0, false)
    expect(result).toHaveLength(1)
    expect(result[0].player1).toBe(1)
    expect(result[0].player2).toBeNull()
    expect(result[0].status).toBe('bye')
  })

  it('preserves games from other rounds', () => {
    const existing = [
      makeGame({ round: 1, player1: 1, player2: 2 }),
      makeGame({ round: 2, player1: 1, player2: 3 }),
    ]
    const result = withParticipantDropped(existing, participants, 1, 1, 'unpaired', 0, false)
    expect(result.some((g) => g.round === 2)).toBe(true)
  })

  it('sets sente based on considerSente flag', () => {
    const result = withParticipantDropped([], participants, 1, 1, 'players1', 0, true)
    expect(result[0].sente).toBe('player1')
  })

  it('sets sente to unknown when considerSente is false', () => {
    const result = withParticipantDropped([], participants, 1, 1, 'players1', 0, false)
    expect(result[0].sente).toBe('unknown')
  })
})

describe('withResultCycled', () => {
  it('cycles null → player1_won → player2_won → draw → null', () => {
    let games = [makeGame({ round: 1, player1: 1, player2: 2, result: null })]
    const id = games[0].id

    games = withResultCycled(games, id)
    expect(games[0].result).toBe('player1_won')

    games = withResultCycled(games, id)
    expect(games[0].result).toBe('player2_won')

    games = withResultCycled(games, id)
    expect(games[0].result).toBe('draw')

    games = withResultCycled(games, id)
    expect(games[0].result).toBeNull()
  })

  it('does not affect other games', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: null }),
      makeGame({ round: 1, player1: 3, player2: 4, result: 'draw' }),
    ]
    const result = withResultCycled(games, games[0].id)
    expect(result[1].result).toBe('draw')
  })
})

describe('withForfeit', () => {
  it('creates a forfeit game when forfeit=true', () => {
    const result = withForfeit([], 1, 1, true, false)
    expect(result).toHaveLength(1)
    expect(result[0].player1).toBe(1)
    expect(result[0].player2).toBeNull()
    expect(result[0].status).toBe('forfeit')
  })

  it('removes participant from existing game when forfeiting', () => {
    const existing = [makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' })]
    const result = withForfeit(existing, 1, 1, true, false)
    // Original game removed (player1 forfeited), new forfeit game added
    expect(result.some((g) => g.status === 'forfeit' && g.player1 === 1)).toBe(true)
    expect(result.some((g) => g.player1 === 1 && g.player2 === 2)).toBe(false)
  })

  it('reverts opponent to bye when forfeiting', () => {
    const existing = [makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' })]
    const result = withForfeit(existing, 1, 1, true, false)
    // Player 2's game reverted to bye
    result.find((g) => g.player1 === 2 && g.round === 1 && g.status !== 'forfeit')
    // Player 2 is no longer in any non-forfeit game for round 1
    // The only games for round 1 are the forfeit game for player 1
    expect(result.filter((g) => g.round === 1)).toHaveLength(1)
  })

  it('removes forfeit game when forfeit=false', () => {
    const existing = [makeGame({ round: 1, player1: 1, status: 'forfeit' })]
    const result = withForfeit(existing, 1, 1, false, false)
    expect(result).toHaveLength(0)
  })

  it('preserves other rounds games', () => {
    const existing = [
      makeGame({ round: 1, player1: 1, player2: 2 }),
      makeGame({ round: 2, player1: 1, player2: 3 }),
    ]
    const result = withForfeit(existing, 1, 1, true, false)
    expect(result.some((g) => g.round === 2)).toBe(true)
  })
})

describe('isRoundComplete', () => {
  it('returns false when no participants', () => {
    expect(isRoundComplete([], [], 1)).toBe(false)
  })

  it('returns false when no games for the round', () => {
    const participants = [makeParticipant(1)]
    expect(isRoundComplete([], participants, 1)).toBe(false)
  })

  it('returns true when all participants are covered', () => {
    const participants = [makeParticipant(1), makeParticipant(2)]
    const games = [makeGame({ round: 1, player1: 1, player2: 2 })]
    expect(isRoundComplete(games, participants, 1)).toBe(true)
  })

  it('returns true when a bye game covers a single participant', () => {
    const participants = [makeParticipant(1)]
    const games = [makeGame({ round: 1, player1: 1, player2: null, status: 'bye' })]
    expect(isRoundComplete(games, participants, 1)).toBe(true)
  })

  it('returns true when forfeit game covers a participant', () => {
    const participants = [makeParticipant(1), makeParticipant(2)]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' }),
      makeGame({ round: 1, player1: 3, status: 'forfeit' }),
    ]
    // participant 3 not in participants list, so still complete
    expect(isRoundComplete(games, participants, 1)).toBe(true)
  })

  it('returns false when a participant is not in any game', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const games = [makeGame({ round: 1, player1: 1, player2: 2 })]
    expect(isRoundComplete(games, participants, 1)).toBe(false)
  })
})

describe('resultToSymbol', () => {
  it('maps null → ?', () => { expect(resultToSymbol(null)).toBe('?') })
  it('maps player1_won → >', () => { expect(resultToSymbol('player1_won')).toBe('>') })
  it('maps player2_won → <', () => { expect(resultToSymbol('player2_won')).toBe('<') })
  it('maps draw → =', () => { expect(resultToSymbol('draw')).toBe('=') })
})

describe('calculateParticipantPoints', () => {
  it('returns startingPoints when no games', () => {
    expect(calculateParticipantPoints([], 1, 1, 3)).toBe(3)
  })

  it('awards 1 point for a win', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' })]
    expect(calculateParticipantPoints(games, 1, 1, 0)).toBe(1)
    expect(calculateParticipantPoints(games, 2, 1, 0)).toBe(0)
  })

  it('awards 0.5 points for a draw', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: 2, result: 'draw', status: 'completed' })]
    expect(calculateParticipantPoints(games, 1, 1, 0)).toBe(0.5)
    expect(calculateParticipantPoints(games, 2, 1, 0)).toBe(0.5)
  })

  it('awards 1 point for a bye', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: null, status: 'bye' })]
    expect(calculateParticipantPoints(games, 1, 1, 0)).toBe(1)
  })

  it('awards 0 points for a forfeit', () => {
    const games = [makeGame({ round: 1, player1: 1, status: 'forfeit' })]
    expect(calculateParticipantPoints(games, 1, 1, 0)).toBe(0)
  })

  it('accumulates points across rounds', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 3, result: 'draw', status: 'completed' }),
    ]
    expect(calculateParticipantPoints(games, 1, 2, 0)).toBe(1.5)
  })

  it('does not count games beyond upToRound', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 3, result: 'player1_won', status: 'completed' }),
    ]
    expect(calculateParticipantPoints(games, 1, 1, 0)).toBe(1)
  })
})

describe('containersFromGames sorting', () => {
  function makeP(id: number, rating: number | null, sp = 0): Participant {
    return { ...makeParticipant(id), capturedRating: { value: rating, rank: null }, startingPoints: sp }
  }

  it('sorts unpaired by points descending then rating descending', () => {
    const p1 = makeP(1, 1500, 0)
    const p2 = makeP(2, 1800, 0)
    const p3 = makeP(3, 1200, 2) // 2 startingPoints
    const p4 = makeP(4, 900, 0)
    const participants = [p1, p2, p3, p4]
    // p1 and p4 are paired, p2 and p3 are unpaired
    const games = [
      makeGame({ round: 1, player1: 1, player2: 4, result: 'player1_won', status: 'completed' }),
    ]
    const containers = containersFromGames(games, participants, 1)
    // p3: 2 sp + 0 from game = 2 pts, p2: 0 pts
    // Sort: p3 (2 pts, rating 1200) > p2 (0 pts, rating 1800)
    expect(containers.unpaired).toEqual([3, 2])
  })

  it('sorts unpaired by rating when points are equal', () => {
    const p1 = makeP(1, 1500)
    const p2 = makeP(2, 1800)
    const containers = containersFromGames([], [p1, p2], 1)
    // Both have 0 points, sort by rating descending
    expect(containers.unpaired).toEqual([2, 1])
  })

  it('sorts paired rows by max pair points descending via sortRoundGamesByPairStrength', () => {
    const p1 = makeP(1, 1600)
    const p2 = makeP(2, 1400)
    const p3 = makeP(3, 1700)
    const p4 = makeP(4, 1300)
    const participants = [p1, p2, p3, p4]
    // pair1: p1(0pts) vs p2(1pt), pair2: p3(0pts) vs p4(0pts)
    const games = [
      makeGame({ round: 1, player1: 3, player2: 4, status: 'not_started' }),
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player2_won', status: 'completed' }),
    ]
    const sorted = sortRoundGamesByPairStrength(games, participants, 1)
    const roundGames = sorted.filter((g) => g.round === 1)
    // pair with p2 (1pt, max=1) should be first
    expect(roundGames[0].player1).toBe(1)
    expect(roundGames[0].player2).toBe(2)
  })
})
