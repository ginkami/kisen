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
  withPlayersSwapped,
  withHandicapCycled,
  HANDICAP_CYCLE,
  applyLoneGameInvariant,
  withAutoForfeits,
  withHandicapReset,
  withForfeitsCarriedOver,
  deriveGameStatus,
  normalizeGame,
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

function makeP(id: number, rating: number): Participant {
  return {
    id,
    player: null,
    locales: { ru: { familyName: `Фамилия${id}`, givenName: `Имя${id}` } } as unknown as Participant['locales'],
    capturedRating: { value: rating, rank: null },
    startingPoints: 0,
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
    // player1 removed → partner (player2) stays as lone game
    const roundGames = result.filter((g) => g.round === 1)
    expect(roundGames).toHaveLength(1)
    expect(roundGames[0].player1).toBe(2)
    expect(roundGames[0].player2).toBeNull()
    expect(roundGames[0].status).toBe('bye')
    expect(roundGames[0].result).toBe('player1_won')
    expect(roundGames[0].handicap).toBeNull()
  })

  it('reverts to bye when removing player2 from a pair', () => {
    const existing = [makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' })]
    const result = withParticipantDropped(existing, participants, 1, 2, 'unpaired', 0, false)
    expect(result).toHaveLength(1)
    expect(result[0].player1).toBe(1)
    expect(result[0].player2).toBeNull()
    expect(result[0].status).toBe('bye')
    expect(result[0].result).toBe('player1_won')
    expect(result[0].handicap).toBeNull()
  })

  it('drops into players2 of an empty row creating a lone game as player1', () => {
    const result = withParticipantDropped([], participants, 1, 2, 'players2', 0, false)
    expect(result).toHaveLength(1)
    expect(result[0].player1).toBe(2)
    expect(result[0].player2).toBeNull()
    expect(result[0].status).toBe('bye')
    expect(result[0].result).toBe('player1_won')
    expect(result[0].handicap).toBeNull()
    expect(result[0].round).toBe(1)
  })

  it('drops into players1 of an empty row with lone-game invariant', () => {
    const result = withParticipantDropped([], participants, 1, 1, 'players1', 0, false)
    expect(result).toHaveLength(1)
    expect(result[0].player1).toBe(1)
    expect(result[0].player2).toBeNull()
    expect(result[0].status).toBe('bye')
    expect(result[0].result).toBe('player1_won')
    expect(result[0].handicap).toBeNull()
  })

  it('breaking a pair preserves game id and round', () => {
    const existing = [makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' })]
    const originalId = existing[0].id
    const result = withParticipantDropped(existing, participants, 1, 1, 'unpaired', 0, false)
    const roundGames = result.filter((g) => g.round === 1)
    expect(roundGames).toHaveLength(1)
    expect(roundGames[0].id).toBe(originalId)
    expect(roundGames[0].round).toBe(1)
  })

  it('removing the last player from a lone game deletes it', () => {
    const existing = [makeGame({ round: 1, player1: 1, player2: null, status: 'bye' })]
    const result = withParticipantDropped(existing, participants, 1, 1, 'unpaired', 0, false)
    expect(result.filter((g) => g.round === 1)).toHaveLength(0)
  })

  it('does not rewrite forfeit games when applying lone-game invariant', () => {
    const existing = [makeGame({ round: 1, player1: 3, player2: null, status: 'forfeit', result: 'player2_won' })]
    // Drop participant 1 into players1 at index 0 (creates a new game, forfeit stays)
    const result = withParticipantDropped(existing, participants, 1, 1, 'players1', 0, false)
    const forfeitGame = result.find((g) => g.status === 'forfeit')
    expect(forfeitGame).toBeDefined()
    expect(forfeitGame!.result).toBe('player2_won')
    expect(forfeitGame!.player2).toBeNull()
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

describe('applyLoneGameInvariant', () => {
  it('enforces bye invariant on a lone game', () => {
    const game = makeGame({ round: 1, player1: 1, player2: null, status: 'not_started', result: null, handicap: '-L' as any })
    const result = applyLoneGameInvariant(game)
    expect(result.status).toBe('bye')
    expect(result.result).toBe('player1_won')
    expect(result.handicap).toBeNull()
  })

  it('does not modify a paired game', () => {
    const game = makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started', result: null })
    const result = applyLoneGameInvariant(game)
    expect(result).toBe(game) // same reference
  })

  it('does not modify a forfeit game', () => {
    const game = makeGame({ round: 1, player1: 1, player2: null, status: 'forfeit', result: 'player2_won' })
    const result = applyLoneGameInvariant(game)
    expect(result).toBe(game) // same reference
    expect(result.result).toBe('player2_won')
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
    // Both pairs have 0pts (points before round 1 = 0); sorted by max rating: p3(1700) > p1(1600)
    expect(roundGames[0].player1).toBe(3)
    expect(roundGames[0].player2).toBe(4)
  })

  it('paired-row sorting uses points earned before the round (upToRound = round - 1)', () => {
    const p1 = makeP(1, 1600)
    const p2 = makeP(2, 1400)
    const p3 = makeP(3, 1700)
    const p4 = makeP(4, 1300)
    const participants = [p1, p2, p3, p4]
    // Round 1: p1 wins vs p2, p3 wins vs p4
    // Round 2: pairs formed but results entered for p3/p4 pair
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: 4, result: 'player1_won', status: 'completed' }),
      // Round 2: p3/p4 pair has a result, p1/p2 pair has no result
      makeGame({ round: 2, player1: 3, player2: 4, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 2, status: 'not_started' }),
    ]
    // Sort round 2 with upToRound = 1 (points before round 2)
    const sorted = sortRoundGamesByPairStrength(games, participants, 1)
    const round2Games = sorted.filter((g) => g.round === 2)
    // Both pairs have 1pt each (from round 1), so order is by max rating
    // p1/p2: max rating = 1600, p3/p4: max rating = 1700
    expect(round2Games[0].player1).toBe(3)
    expect(round2Games[0].player2).toBe(4)
    expect(round2Games[1].player1).toBe(1)
    expect(round2Games[1].player2).toBe(2)
  })

  it('containersFromGames sorts paired rows by points before round regardless of storage order', () => {
    const p1 = makeP(1, 1600)
    const p2 = makeP(2, 1400)
    const p3 = makeP(3, 1700)
    const p4 = makeP(4, 1300)
    const participants = [p1, p2, p3, p4]
    // Round 1 results give p1 a win
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: 4, result: 'player1_won', status: 'completed' }),
      // Round 2: stored in wrong order (p3/p4 first, then p1/p2)
      makeGame({ round: 2, player1: 3, player2: 4, status: 'not_started' }),
      makeGame({ round: 2, player1: 1, player2: 2, status: 'not_started' }),
    ]
    const containers = containersFromGames(games, participants, 2)
    // Both pairs have 1pt from round 1, sorted by max rating: p3(1700) > p1(1600)
    expect(containers.players1[0]).toBe(3)
    expect(containers.players2[0]).toBe(4)
    expect(containers.players1[1]).toBe(1)
    expect(containers.players2[1]).toBe(2)
  })

  it('derived row count equals max(game rows, ceil((placed + unpaired) / 2))', () => {
    const p1 = makeP(1, 1500)
    const p2 = makeP(2, 1800)
    const p3 = makeP(3, 1200)
    const p4 = makeP(4, 900)
    const p5 = makeP(5, 1100)
    const participants = [p1, p2, p3, p4, p5]
    // 1 pair (2 placed) + 3 unpaired = 5 total → ceil(5/2) = 3 rows needed, 1 game → 2 extra
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' }),
    ]
    const containers = containersFromGames(games, participants, 1)
    const gameRows = containers.games.length // 1
    const placed = containers.players1.filter((x) => x != null).length + containers.players2.filter((x) => x != null).length
    const total = placed + containers.unpaired.length
    const neededRows = Math.ceil(total / 2)
    const extraRows = Math.max(0, neededRows - gameRows)
    expect(gameRows).toBe(1)
    expect(placed).toBe(2)
    expect(containers.unpaired.length).toBe(3)
    expect(neededRows).toBe(3)
    expect(extraRows).toBe(2)
  })
})

describe('withPlayersSwapped', () => {
  it('swaps player1 and player2 in a paired game', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, sente: 'player1', status: 'not_started' }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].player1).toBe(2)
    expect(result[0].player2).toBe(1)
  })

  it('keeps sente on the position (player1 stays sente after swap)', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, sente: 'player1', status: 'not_started' }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].sente).toBe('player1')
  })

  it('keeps sente player2 attached to the position', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, sente: 'player2', status: 'not_started' }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].sente).toBe('player2')
  })

  it('keeps sente unknown when unknown', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, sente: 'unknown', status: 'not_started' }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].sente).toBe('unknown')
  })

  it('flips player1_won result to player2_won', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].result).toBe('player2_won')
  })

  it('flips player2_won result to player1_won', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player2_won', status: 'completed' }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].result).toBe('player1_won')
  })

  it('keeps draw result unchanged', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'draw', status: 'completed' }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].result).toBe('draw')
  })

  it('does not swap bye game (player2=null)', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: null, status: 'bye' }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result).toBe(games) // same reference — no-op
  })

  it('preserves id, status, round and keeps null handicap', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started', handicap: null }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].id).toBe(games[0].id)
    expect(result[0].handicap).toBeNull()
    expect(result[0].status).toBe('not_started')
    expect(result[0].round).toBe(1)
  })

  it('flips handicap sign from - to +', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, handicap: '-L' as any }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].handicap).toBe('+L')
  })

  it('flips handicap sign from + to -', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, handicap: '+4p' as any }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].handicap).toBe('-4p')
  })

  it('keeps null handicap as null', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, handicap: null }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].handicap).toBeNull()
  })

  it('returns allGames unchanged for unknown game id', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2 }),
    ]
    const result = withPlayersSwapped(games, 'nonexistent-id')
    expect(result).toBe(games) // same reference — no-op
  })

  it('swaps the correct game by id regardless of storage order', () => {
    const games = [
      makeGame({ round: 1, player1: 3, player2: 2, sente: 'player1', status: 'completed', result: 'player1_won' }),
      makeGame({ round: 1, player1: 4, player2: null, status: 'bye', result: 'player1_won' }),
      makeGame({ round: 1, player1: 5, player2: 1, sente: 'player1', status: 'completed', result: 'player1_won' }),
    ]
    const result = withPlayersSwapped(games, games[2].id)
    expect(result[2].player1).toBe(1)
    expect(result[2].player2).toBe(5)
    expect(result[0]).toBe(games[0])
    expect(result[1]).toBe(games[1])
  })

  it('swap by id targets the correct game when storage order differs from display order', () => {
    const games = [
      makeGame({ round: 1, player1: 4, player2: 2, sente: 'player1', status: 'completed', result: 'player2_won' }),
      makeGame({ round: 1, player1: 1, player2: 3, sente: 'player1', status: 'completed', result: 'player1_won' }),
    ]
    const result = withPlayersSwapped(games, games[1].id)
    expect(result[1].player1).toBe(3)
    expect(result[1].player2).toBe(1)
    expect(result[0]).toBe(games[0])
  })

  it('swap by id does not hit a bye game sitting between pairs in storage', () => {
    const games = [
      makeGame({ round: 1, player1: 3, player2: 2, sente: 'player1', status: 'completed', result: 'player1_won' }),
      makeGame({ round: 1, player1: 4, player2: null, status: 'bye', result: 'player1_won' }),
      makeGame({ round: 1, player1: 5, player2: 1, sente: 'player1', status: 'completed', result: 'player1_won' }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    expect(result[0].player1).toBe(2)
    expect(result[0].player2).toBe(3)
    expect(result[1]).toBe(games[1])
    expect(result[2]).toBe(games[2])
  })

  it('swap preserves sente=player1 (considerSente invariant) — crosstable perspective changes immediately', () => {
    // Under the project invariant (sente ≡ player1 when considerSente),
    // swap keeps sente on the position → the new player1 becomes sente.
    // formStateToUpdateInput forces sente='player1' on save — a no-op after this swap.
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, sente: 'player1', status: 'completed', result: 'player1_won' }),
    ]
    const result = withPlayersSwapped(games, games[0].id)
    // sente stays 'player1' (positional)
    expect(result[0].sente).toBe('player1')
    // player1/player2 exchanged
    expect(result[0].player1).toBe(2)
    expect(result[0].player2).toBe(1)
    // result flipped (preserves who won)
    expect(result[0].result).toBe('player2_won')
    // Crosstable perspective: player 1 (now player2) with sente='player1' → ☖ (was ☗)
    // Player 2 (now player1) with sente='player1' → ☗ (was ☖)
    // Symbols swap immediately — no save needed.
  })
})

describe('withHandicapCycled', () => {
  it('cycles from null to -L', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, handicap: null }),
    ]
    const result = withHandicapCycled(games, games[0].id)
    expect(result[0].handicap).toBe('-L')
  })

  it('cycles from -L to -B', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, handicap: '-L' as any }),
    ]
    const result = withHandicapCycled(games, games[0].id)
    expect(result[0].handicap).toBe('-B')
  })

  it('cycles from +10p back to null', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, handicap: '+10p' as any }),
    ]
    const result = withHandicapCycled(games, games[0].id)
    expect(result[0].handicap).toBeNull()
  })

  it('cycles through all 21 states and returns to null', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, handicap: null }),
    ]
    let current = games
    for (let i = 0; i < HANDICAP_CYCLE.length; i++) {
      current = withHandicapCycled(current, current[0].id)
    }
    expect(current[0].handicap).toBeNull()
  })

  it('does not modify other games', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, handicap: null }),
      makeGame({ round: 1, player1: 3, player2: 4, handicap: null }),
    ]
    const result = withHandicapCycled(games, games[0].id)
    expect(result[1].handicap).toBeNull()
  })

  it('HANDICAP_CYCLE has 21 entries', () => {
    expect(HANDICAP_CYCLE.length).toBe(21)
    expect(HANDICAP_CYCLE[0]).toBeNull()
    expect(HANDICAP_CYCLE[1]).toBe('-L')
    expect(HANDICAP_CYCLE[20]).toBe('+10p')
  })
})

describe('fixture-based: tournament draft (4 participants, 3 rounds)', () => {
  // Participants from tournament.js fixture
  const kondratov = makeP(2, 1865) // Yaroslav Kondratov
  const iglitsky = makeP(4, 1999)  // Eugeny Iglitsky
  const lysenko = makeP(3, 2007)   // Sergey Lysenko
  const tanyan = makeP(1, 2472)    // Vincent Tanyan
  const participants = [kondratov, iglitsky, lysenko, tanyan]

  it('drop into players2 of displayed lone row completes pair (result reset, id preserved)', () => {
    // Round 2: Kondratov-Lysenko pair (with result) stored BEFORE Tanyan lone game
    // Display order: Tanyan (1pt, 2472) row 0, Kondratov-Lysenko (1pt, max 2007) row 1
    const kondratovLysenkoId = 'game-kl'
    const tanyanByeId = 'game-tb'
    const games: Game[] = [
      // Round 1 results
      makeGame({ round: 1, player1: 4, player2: 2, result: 'player2_won', status: 'completed' }),
      makeGame({ round: 1, player1: 1, player2: 3, result: 'player1_won', status: 'completed' }),
      // Round 2: stored in wrong order for display (pair first, lone game second)
      { ...makeGame({ round: 2, player1: 2, player2: 3, result: 'player1_won', status: 'not_started' }), id: kondratovLysenkoId },
      { ...makeGame({ round: 2, player1: 1, player2: null, result: 'player1_won', status: 'bye' }), id: tanyanByeId },
    ]

    // Verify display order: Tanyan (lone) should be row 0, Kondratov-Lysenko row 1
    const containers = containersFromGames(games, participants, 2)
    expect(containers.players1[0]).toBe(1) // Tanyan
    expect(containers.players2[0]).toBeNull()
    expect(containers.players1[1]).toBe(2) // Kondratov
    expect(containers.players2[1]).toBe(3) // Lysenko

    // Drop Iglitsky (id=4) into players2 at displayed row 0 (Tanyan's lone row)
    const result = withParticipantDropped(games, participants, 2, 4, 'players2', 0, true)

    // Tanyan's game should now be a pair with Iglitsky
    const tanyanGame = result.find((g) => g.id === tanyanByeId)
    expect(tanyanGame).toBeDefined()
    expect(tanyanGame!.player1).toBe(1)  // Tanyan stays as player1
    expect(tanyanGame!.player2).toBe(4)  // Iglitsky added as player2
    expect(tanyanGame!.status).toBe('not_started')
    expect(tanyanGame!.result).toBeNull() // Stale bye result cleared!
    expect(tanyanGame!.handicap).toBeNull()
    expect(tanyanGame!.round).toBe(2)

    // Kondratov-Lysenko game unchanged
    const klGame = result.find((g) => g.id === kondratovLysenkoId)
    expect(klGame).toBeDefined()
    expect(klGame!.player1).toBe(2)
    expect(klGame!.player2).toBe(3)
    expect(klGame!.result).toBe('player1_won')

    // No extra rows appended
    const round2Games = result.filter((g) => g.round === 2)
    expect(round2Games).toHaveLength(2)
  })

  it('forfeit game at index 0 does not shift row indices for drop', () => {
    // Round 2: forfeit game stored at index 0, then Tanyan lone game, then Kondratov-Lysenko pair
    const forfeitId = 'game-forfeit'
    const tanyanByeId = 'game-tb2'
    const extra = makeP(5, 1500) // 5th participant — not forfeited
    const participants5 = [...participants, extra]
    const games: Game[] = [
      // Round 1 results
      makeGame({ round: 1, player1: 4, player2: 2, result: 'player2_won', status: 'completed' }),
      makeGame({ round: 1, player1: 1, player2: 3, result: 'player1_won', status: 'completed' }),
      // Round 2: forfeit first, then lone game, then pair
      { ...makeGame({ round: 2, player1: 4, player2: null, result: 'player2_won', status: 'forfeit' }), id: forfeitId },
      { ...makeGame({ round: 2, player1: 1, player2: null, result: 'player1_won', status: 'bye' }), id: tanyanByeId },
      makeGame({ round: 2, player1: 2, player2: 3, result: 'player1_won', status: 'not_started' }),
    ]

    // Display: forfeit excluded from rows, Tanyan row 0, Kondratov-Lysenko row 1
    const containers = containersFromGames(games, participants5, 2)
    expect(containers.players1[0]).toBe(1) // Tanyan
    expect(containers.players1[1]).toBe(2) // Kondratov

    // Drop participant 5 (not forfeited) into players2 at displayed row 0
    const result = withParticipantDropped(games, participants5, 2, 5, 'players2', 0, true)

    // Forfeit game untouched (we dropped participant 5, not the forfeited participant 4)
    const forfeitGame = result.find((g) => g.id === forfeitId)
    expect(forfeitGame).toBeDefined()
    expect(forfeitGame!.status).toBe('forfeit')
    expect(forfeitGame!.result).toBe('player2_won')

    // Tanyan's game completed with participant 5
    const tanyanGame = result.find((g) => g.id === tanyanByeId)
    expect(tanyanGame!.player2).toBe(5)
    expect(tanyanGame!.result).toBeNull()
    expect(tanyanGame!.status).toBe('not_started')
  })

  it('active-round results do not reorder rows in sortRoundGamesByPairStrength', () => {
    // Round 2: both pairs have 1pt from round 1
    // p3/p4 pair has a result in round 2, p1/p2 pair does not
    // Sort should use points BEFORE round 2 (i.e., round 1 results only)
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: 4, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 3, player2: 4, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 2, status: 'not_started' }),
    ]

    const sorted = sortRoundGamesByPairStrength(games, participants, 2)
    const round2Games = sorted.filter((g) => g.round === 2)

    // Both have 1pt from round 1; sorted by max rating: tanyan(2472) > lysenko(2007)
    // The active-round result for p3/p4 should NOT affect ordering
    expect(round2Games[0].player1).toBe(1)
    expect(round2Games[0].player2).toBe(2)
    expect(round2Games[1].player1).toBe(3)
    expect(round2Games[1].player2).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// Part 6: Dropping a forfeited participant into a pair removes their forfeit game
// ---------------------------------------------------------------------------

describe('dropping forfeited participant into a pair removes forfeit game', () => {
  const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3), makeParticipant(4)]

  it('removes forfeit game when forfeited participant joins a pair (current round)', () => {
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: null, status: 'bye', result: 'player1_won' }),
      makeGame({ round: 1, player1: 4, player2: null, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 1, player1: 2, player2: 3, status: 'not_started' }),
    ]
    // Drop forfeited participant 4 into players2 at row 0 (Tanyan's bye row)
    const result = withParticipantDropped(games, participants, 1, 4, 'players2', 0, false, 1)
    const round1 = result.filter((g) => g.round === 1)

    // Forfeit game must be removed — participant 4 now has exactly one game (paired with 1)
    const forfeits = round1.filter((g) => g.status === 'forfeit' && g.player1 === 4)
    expect(forfeits).toHaveLength(0)

    // Participant 4 is now player2 in Tanyan's game
    const pair = round1.find((g) => g.player1 === 1)
    expect(pair).toBeDefined()
    expect(pair!.player2).toBe(4)
    expect(pair!.result).toBeNull()
    expect(pair!.status).toBe('live')

    // Participant 4 has exactly one game in the round
    const p4Games = round1.filter((g) => g.player1 === 4 || g.player2 === 4)
    expect(p4Games).toHaveLength(1)
  })

  it('removes forfeit game when forfeited participant joins a pair (past round)', () => {
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: null, status: 'bye', result: 'player1_won' }),
      makeGame({ round: 1, player1: 4, player2: null, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 1, player1: 2, player2: 3, status: 'completed', result: 'player1_won' }),
      makeGame({ round: 2, player1: 1, player2: 2, status: 'not_started' }),
    ]
    // currentRound=2, viewing round 1 (past), drop forfeited participant 4 into players2 row 0
    const result = withParticipantDropped(games, participants, 1, 4, 'players2', 0, false, 2)
    const round1 = result.filter((g) => g.round === 1)

    // Forfeit game removed
    const forfeits = round1.filter((g) => g.status === 'forfeit' && g.player1 === 4)
    expect(forfeits).toHaveLength(0)

    // Participant 4 paired with participant 1
    const pair = round1.find((g) => g.player1 === 1)
    expect(pair).toBeDefined()
    expect(pair!.player2).toBe(4)

    // Exactly one game for participant 4
    const p4Games = round1.filter((g) => g.player1 === 4 || g.player2 === 4)
    expect(p4Games).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Part 6: deriveGameStatus / normalizeGame
// ---------------------------------------------------------------------------

describe('deriveGameStatus', () => {
  it('preserves forfeit status', () => {
    const game = makeGame({ round: 1, player1: 1, player2: null, status: 'forfeit', result: 'player2_won' })
    expect(deriveGameStatus(game, 1)).toBe('forfeit')
  })

  it('preserves bye status', () => {
    const game = makeGame({ round: 1, player1: 1, player2: null, status: 'bye', result: 'player1_won' })
    expect(deriveGameStatus(game, 1)).toBe('bye')
  })

  it('derives completed for paired game with result', () => {
    const game = makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'not_started' })
    expect(deriveGameStatus(game, 1)).toBe('completed')
  })

  it('derives live for paired game without result in active round', () => {
    const game = makeGame({ round: 1, player1: 1, player2: 2, result: null, status: 'not_started' })
    expect(deriveGameStatus(game, 1)).toBe('live')
  })

  it('derives not_started for paired game without result in non-active round', () => {
    const game = makeGame({ round: 2, player1: 1, player2: 2, result: null, status: 'not_started' })
    expect(deriveGameStatus(game, 1)).toBe('not_started')
  })
})

describe('normalizeGame', () => {
  it('returns same reference when nothing changes', () => {
    const game = makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' })
    expect(normalizeGame(game, 1)).toBe(game)
  })

  it('preserves forfeit as-is', () => {
    const game = makeGame({ round: 1, player1: 1, player2: null, status: 'forfeit', result: 'player2_won' })
    expect(normalizeGame(game, 1)).toBe(game)
  })

  it('enforces lone-game invariant on bye', () => {
    const game = makeGame({ round: 1, player1: 1, player2: null, status: 'bye', result: null })
    const normalized = normalizeGame(game, 1)
    expect(normalized.status).toBe('bye')
    expect(normalized.result).toBe('player1_won')
    expect(normalized.handicap).toBeNull()
  })

  it('derives completed for paired game with result', () => {
    const game = makeGame({ round: 1, player1: 1, player2: 2, result: 'draw', status: 'not_started' })
    const normalized = normalizeGame(game, 1)
    expect(normalized.status).toBe('completed')
  })

  it('derives live for paired game without result in active round', () => {
    const game = makeGame({ round: 1, player1: 1, player2: 2, result: null, status: 'not_started' })
    const normalized = normalizeGame(game, 1)
    expect(normalized.status).toBe('live')
  })

  it('derives not_started for paired game without result in non-active round', () => {
    const game = makeGame({ round: 2, player1: 1, player2: 2, result: null, status: 'live' })
    const normalized = normalizeGame(game, 1)
    expect(normalized.status).toBe('not_started')
  })
})

// ---------------------------------------------------------------------------
// Part 6: withHandicapReset
// ---------------------------------------------------------------------------

describe('withHandicapReset', () => {
  it('resets handicap to null', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: 2, handicap: '-L' })]
    const result = withHandicapReset(games, games[0].id)
    expect(result[0].handicap).toBeNull()
  })

  it('returns same reference when handicap already null', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: 2, handicap: null })]
    const result = withHandicapReset(games, games[0].id)
    expect(result).toBe(games)
  })

  it('does not affect other games', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, handicap: '-L' }),
      makeGame({ round: 1, player1: 3, player2: 4, handicap: '+B' }),
    ]
    const result = withHandicapReset(games, games[0].id)
    expect(result[1].handicap).toBe('+B')
  })
})

// ---------------------------------------------------------------------------
// Part 6: withAutoForfeits
// ---------------------------------------------------------------------------

describe('withAutoForfeits', () => {
  const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3), makeParticipant(4)]

  it('adds forfeit games for participants without games in a past round', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
    ]
    const result = withAutoForfeits(games, participants, 1, 2, false)
    const forfeits = result.filter((g) => g.round === 1 && g.status === 'forfeit')
    expect(forfeits).toHaveLength(2)
    expect(forfeits.map((g) => g.player1).sort()).toEqual([3, 4])
    for (const f of forfeits) {
      expect(f.result).toBe('player2_won')
      expect(f.player2).toBeNull()
    }
  })

  it('is idempotent — returns same reference when nothing to add', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: null, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 1, player1: 4, player2: null, status: 'forfeit', result: 'player2_won' }),
    ]
    const result = withAutoForfeits(games, participants, 1, 2, false)
    expect(result).toBe(games)
  })

  it('does not create duplicate forfeit for participant already having a game', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: null, status: 'bye', result: 'player1_won' }),
    ]
    const result = withAutoForfeits(games, participants, 1, 2, false)
    const forfeits = result.filter((g) => g.round === 1 && g.status === 'forfeit')
    expect(forfeits).toHaveLength(1)
    expect(forfeits[0].player1).toBe(4)
  })

  it('no-op for current round', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' })]
    const result = withAutoForfeits(games, participants, 1, 1, false)
    expect(result).toBe(games)
  })

  it('no-op for future round', () => {
    const games = [makeGame({ round: 2, player1: 1, player2: 2, status: 'not_started' })]
    const result = withAutoForfeits(games, participants, 2, 1, false)
    expect(result).toBe(games)
  })

  it('no-op when currentRound is 0', () => {
    const games: Game[] = []
    const result = withAutoForfeits(games, participants, 1, 0, false)
    expect(result).toBe(games)
  })

  it('sets sente based on considerSente flag', () => {
    const games: Game[] = []
    const result = withAutoForfeits(games, participants, 1, 2, true)
    const forfeits = result.filter((g) => g.status === 'forfeit')
    for (const f of forfeits) {
      expect(f.sente).toBe('player1')
    }
  })
})

// ---------------------------------------------------------------------------
// Part 6: Past-round unpaired drop creates forfeit (full chain)
// ---------------------------------------------------------------------------

describe('past-round unpaired drop creates forfeit', () => {
  const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3), makeParticipant(4)]

  it('dropping a paired participant into unpaired in a past round creates a forfeit game', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: 4, result: 'draw', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 3, status: 'not_started' }),
    ]
    // currentRound=2, viewing round 1, drop participant 1 into unpaired
    const dropped = withParticipantDropped(games, participants, 1, 1, 'unpaired', 0, false, 2)
    const sorted = sortRoundGamesByPairStrength(dropped, participants, 1)
    // Simulate updateGames: filter by round, normalize
    const round1 = sorted.filter((g) => g.round === 1).map((g) => normalizeGame(g, 2))

    // Participant 1 should have a forfeit game
    const forfeit = round1.find((g) => g.status === 'forfeit' && g.player1 === 1)
    expect(forfeit).toBeDefined()
    expect(forfeit!.result).toBe('player2_won')
    expect(forfeit!.player2).toBeNull()

    // Partner (participant 2) should have a bye game
    const bye = round1.find((g) => g.player1 === 2 && g.status === 'bye')
    expect(bye).toBeDefined()
    expect(bye!.result).toBe('player1_won')

    // Other pair (3 vs 4) unchanged
    const pair = round1.find((g) => g.player1 === 3 && g.player2 === 4)
    expect(pair).toBeDefined()
    expect(pair!.result).toBe('draw')

    // Round 2 game untouched
    expect(sorted.some((g) => g.round === 2)).toBe(true)
  })

  it('dropping when forfeit already exists does not create a duplicate', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: null, status: 'forfeit', result: 'player2_won' }),
    ]
    // Drop participant 3 (already forfeited) into unpaired — no-op for forfeit
    const dropped = withParticipantDropped(games, participants, 1, 3, 'unpaired', 0, false, 2)
    const forfeits = dropped.filter((g) => g.round === 1 && g.status === 'forfeit' && g.player1 === 3)
    expect(forfeits).toHaveLength(1)
  })

  it('dropping into unpaired in current/future round does NOT create a forfeit', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, status: 'not_started' }),
    ]
    // currentRound=1, viewing round 1 (current), drop participant 1
    const dropped = withParticipantDropped(games, participants, 1, 1, 'unpaired', 0, false, 1)
    const forfeits = dropped.filter((g) => g.round === 1 && g.status === 'forfeit')
    expect(forfeits).toHaveLength(0)
    // Participant 1 should have no game (just unpaired)
    const round1 = dropped.filter((g) => g.round === 1)
    expect(round1).toHaveLength(1) // only partner's bye
    expect(round1[0].player1).toBe(2)
  })
})


describe('withForfeitsCarriedOver', () => {
  it('creates forfeit in next round for forfeited participant', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: null, status: 'forfeit', result: 'player2_won' })]
    const result = withForfeitsCarriedOver(games, 1, false, 3)
    const nextForfeit = result.filter((g) => g.round === 2 && g.status === 'forfeit')
    expect(nextForfeit).toHaveLength(1)
    expect(nextForfeit[0].player1).toBe(1)
    expect(nextForfeit[0].player2).toBeNull()
    expect(nextForfeit[0].result).toBe('player2_won')
  })

  it('skips participant already having a game in next round', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: null, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 2, player1: 1, player2: 2, status: 'not_started' }),
    ]
    const result = withForfeitsCarriedOver(games, 1, false, 3)
    expect(result).toHaveLength(2)
  })

  it('no-op on last round (nextRound > maxRound)', () => {
    const games = [makeGame({ round: 2, player1: 1, player2: null, status: 'forfeit', result: 'player2_won' })]
    const result = withForfeitsCarriedOver(games, 2, false, 2)
    expect(result).toBe(games)
  })

  it('no-op when no forfeits in published round', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' })]
    const result = withForfeitsCarriedOver(games, 1, false, 3)
    expect(result).toBe(games)
  })

  it('idempotent: second call returns same result', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: null, status: 'forfeit', result: 'player2_won' })]
    const first = withForfeitsCarriedOver(games, 1, false, 3)
    const second = withForfeitsCarriedOver(first, 1, false, 3)
    expect(second).toHaveLength(first.length)
  })

  it('sets sente based on considerSente flag', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: null, status: 'forfeit', result: 'player2_won' })]
    const result = withForfeitsCarriedOver(games, 1, true, 3)
    const nextForfeit = result.find((g) => g.round === 2 && g.status === 'forfeit')
    expect(nextForfeit!.sente).toBe('player1')
  })

  it('does not carry over non-forfeit games', () => {
    const games = [makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' })]
    const result = withForfeitsCarriedOver(games, 1, false, 3)
    expect(result).toBe(games)
  })

  it('carries over multiple forfeited participants', () => {
    const games = [
      makeGame({ round: 1, player1: 1, player2: null, status: 'forfeit', result: 'player2_won' }),
      makeGame({ round: 1, player1: 3, player2: null, status: 'forfeit', result: 'player2_won' }),
    ]
    const result = withForfeitsCarriedOver(games, 1, false, 3)
    const nextForfeits = result.filter((g) => g.round === 2 && g.status === 'forfeit')
    expect(nextForfeits).toHaveLength(2)
    const ids = nextForfeits.map((g) => g.player1).sort()
    expect(ids).toEqual([1, 3])
  })
})