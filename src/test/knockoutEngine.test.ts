import { describe, expect, it } from 'vitest'
import type { Game, Participant } from '../domain/tournament.ts'
import {
  analyzeKnockoutBracket,
  generateKnockoutPairings,
  planKnockoutRound,
} from '../components/tournament/pairings/knockoutEngine.ts'
import { PairingError } from '../components/tournament/pairings/pairingEngine.ts'

function makeParticipants(ratings: number[]): Participant[] {
  return ratings.map((rating, i) => ({
    id: i + 1,
    player: null,
    locales: { ru: { familyName: `F${i + 1}`, givenName: 'X' } },
    capturedRating: { value: rating, rank: null },
    startingPoints: 0,
  }))
}

function makeGame(overrides: Partial<Game> & { player1: number; round: number }): Game {
  return {
    id: overrides.id ?? `g-${overrides.round}-${overrides.player1}-${Math.random()}`,
    player1: overrides.player1,
    player2: overrides.player2 ?? null,
    sente: 'unknown',
    handicap: null,
    result: overrides.result ?? null,
    status: overrides.status ?? 'not_started',
    round: overrides.round,
  }
}

function pairSet(games: Game[]): string[] {
  return games
    .filter((g) => g.player2 != null)
    .map((g) => [g.player1, g.player2 as number].sort((a, b) => a - b).join('-'))
    .sort()
}

function byeIds(games: Game[]): number[] {
  return games.filter((g) => g.status === 'bye').map((g) => g.player1)
}

function forfeitIds(games: Game[]): number[] {
  return games.filter((g) => g.status === 'forfeit').map((g) => g.player1)
}

describe('generateKnockoutPairings — canonical round 1', () => {
  it('pairs 6 players with byes to the top two seeds (n = 4)', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
    const games = generateKnockoutPairings({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
    })
    // Bracket 8: 1v8(virtual→bye), 2v7(virtual→bye), 3v6, 4v5.
    expect(pairSet(games)).toEqual(['3-6', '4-5'])
    expect(byeIds(games)).toEqual([1, 2])
  })

  it('pairs 7 players with one bye to the top seed (n = 4)', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900, 1800])
    const games = generateKnockoutPairings({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
    })
    // Bracket 8: 1v8(virtual→bye), 2v7, 3v6, 4v5.
    expect(pairSet(games)).toEqual(['2-7', '3-6', '4-5'])
    expect(byeIds(games)).toEqual([1])
  })

  it('pairs 8 players without byes (n = 4)', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900, 1800, 1700])
    const games = generateKnockoutPairings({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
    })
    expect(pairSet(games)).toEqual(['1-8', '2-7', '3-6', '4-5'])
    expect(byeIds(games)).toEqual([])
  })

  it('seeds by points first and rating second', () => {
    // startingPoints make id 6 the top seed.
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900]).map((p) => ({
      ...p,
      startingPoints: p.id === 6 ? 5 : 0,
    }))
    const games = generateKnockoutPairings({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
    })
    // Seeds by points desc then rating desc: 6, 1, 2, 3, 4, 5.
    // Bracket 8: 6v(virtual→bye), 1v(virtual→bye), 2v5, 3v4.
    expect(pairSet(games)).toEqual(['2-5', '3-4'])
    expect(byeIds(games)).toEqual([6, 1])
  })
})

describe('analyzeKnockoutBracket', () => {
  it('recognizes a canonical bracket after round 1 with results', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
    const games: Game[] = [
      // Round 1: 3v6 (3 won), 4v5 (5 won), byes 1, 2.
      makeGame({ player1: 3, player2: 6, round: 1, result: 'player1_won', status: 'completed' }),
      makeGame({ player1: 4, player2: 5, round: 1, result: 'player2_won', status: 'completed' }),
      makeGame({ player1: 1, round: 1, result: 'player1_won', status: 'bye' }),
      makeGame({ player1: 2, round: 1, result: 'player1_won', status: 'bye' }),
      // Round 2: bracket continuation 1v2 (1 won), 3v5 (5 won); forfeits 4, 6.
      makeGame({ player1: 1, player2: 2, round: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ player1: 3, player2: 5, round: 2, result: 'player2_won', status: 'completed' }),
      makeGame({ player1: 4, round: 2, result: 'player2_won', status: 'forfeit' }),
      makeGame({ player1: 6, round: 2, result: 'player2_won', status: 'forfeit' }),
    ]
    const bracket = analyzeKnockoutBracket(participants, games, 2)
    expect(bracket).not.toBeNull()
    expect(bracket?.startRound).toBe(1)
    expect(bracket?.rounds).toHaveLength(2)
  })

  it('rejects a Swiss history (all participants paired every round)', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100])
    const games: Game[] = [
      makeGame({ player1: 1, player2: 4, round: 1, result: 'player1_won', status: 'completed' }),
      makeGame({ player1: 2, player2: 3, round: 1, result: 'draw', status: 'completed' }),
      makeGame({ player1: 1, player2: 2, round: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ player1: 3, player2: 4, round: 2, result: 'draw', status: 'completed' }),
    ]
    expect(analyzeKnockoutBracket(participants, games, 2)).toBeNull()
  })

  it('rejects a bracket with a missing forfeit game for an eliminated player', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100])
    const games: Game[] = [
      makeGame({ player1: 1, player2: 4, round: 1, result: 'player1_won', status: 'completed' }),
      makeGame({ player1: 2, player2: 3, round: 1, result: 'player1_won', status: 'completed' }),
      // Round 2: 1v2 played, but 3 (loser of 2v3) has no forfeit game.
      makeGame({ player1: 1, player2: 2, round: 2, result: 'player1_won', status: 'completed' }),
    ]
    expect(analyzeKnockoutBracket(participants, games, 2)).toBeNull()
  })
})


function makeBracketHistory(): {
  participants: ReturnType<typeof makeParticipants>
  games: Game[]
} {
  const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
  const games: Game[] = [
    // Round 1: 3v6 (3 won), 4v5 (5 won), byes 1, 2.
    makeGame({ player1: 3, player2: 6, round: 1, result: 'player1_won', status: 'completed' }),
    makeGame({ player1: 4, player2: 5, round: 1, result: 'player2_won', status: 'completed' }),
    makeGame({ player1: 1, round: 1, result: 'player1_won', status: 'bye' }),
    makeGame({ player1: 2, round: 1, result: 'player1_won', status: 'bye' }),
    // Round 2 published: 1v2 (1 won), 3v5 (3 won); forfeits 4, 6.
    makeGame({ player1: 1, player2: 2, round: 2, result: 'player1_won', status: 'completed' }),
    makeGame({ player1: 3, player2: 5, round: 2, result: 'player1_won', status: 'completed' }),
    makeGame({ player1: 4, round: 2, result: 'player2_won', status: 'forfeit' }),
    makeGame({ player1: 6, round: 2, result: 'player2_won', status: 'forfeit' }),
  ]
  return { participants, games }
}

describe('generateKnockoutPairings — bracket continuation and manual games', () => {
  it('continues the bracket: final 1v3, forfeits for eliminated (n = 1)', () => {
    const { participants, games } = makeBracketHistory()
    const plan = planKnockoutRound({ participants, games, round: 3, publishedRounds: 2 })
    expect(plan.continuation).toBe(true)
    expect(plan.n).toBe(1) // 2 active players → 1 pair (the final)

    const generated = generateKnockoutPairings({
      participants,
      games,
      round: 3,
      publishedRounds: 2,
      considerSente: false,
    })
    expect(pairSet(generated)).toEqual(['1-3'])
    expect(forfeitIds(generated)).toEqual([2, 4, 5, 6])
  })

  it('keeps manual pairs and counts them into n (approximation)', () => {
    const { participants, games: history } = makeBracketHistory()
    // Manual pair 1v3 already placed for round 3.
    const games = [...history, makeGame({ player1: 1, player2: 3, round: 3 })]
    const plan = planKnockoutRound({ participants, games, round: 3, publishedRounds: 2 })
    expect(plan.continuation).toBe(true)
    expect(plan.n).toBe(1) // 1 kept manual pair, no byes

    const generated = generateKnockoutPairings({
      participants,
      games,
      round: 3,
      publishedRounds: 2,
      considerSente: false,
    })
    // The manual pair is kept (not duplicated); forfeits for 2, 4, 5, 6.
    expect(pairSet(generated)).toEqual([])
    expect(forfeitIds(generated)).toEqual([2, 4, 5, 6])
  })

  it('manual forfeit eliminates an active player and shifts n', () => {
    const { participants, games: history } = makeBracketHistory()
    // Manual forfeit for 1 (active) in round 3 → bracket continuation
    // impossible → knockout round 1 re-seed for {2, 3, 5} (4, 6 already
    // eliminated). Points: 3 → 2, 2 → 1, 5 → 0. Pad 4: bye to seed 1 (3),
    // pair 2v5.
    const games = [
      ...history,
      makeGame({ player1: 1, round: 3, result: 'player2_won', status: 'forfeit' }),
    ]
    const plan = planKnockoutRound({ participants, games, round: 3, publishedRounds: 2 })
    expect(plan.continuation).toBe(false)
    expect(plan.n).toBe(2)

    const generated = generateKnockoutPairings({
      participants,
      games,
      round: 3,
      publishedRounds: 2,
      considerSente: false,
    })
    expect(pairSet(generated)).toEqual(['2-5'])
    expect(byeIds(generated)).toEqual([3])
  })

  it('throws PairingError when a participant is placed twice', () => {
    const { participants, games: history } = makeBracketHistory()
    const games = [
      ...history,
      makeGame({ player1: 1, round: 3, result: 'player1_won', status: 'bye' }),
      makeGame({ player1: 1, player2: 3, round: 3 }),
    ]
    expect(() =>
      planKnockoutRound({ participants, games, round: 3, publishedRounds: 2 }),
    ).toThrow(PairingError)
  })
})

