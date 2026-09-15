import { describe, expect, it } from 'vitest'
import type { Game, Participant } from '../domain/tournament.ts'
import { generateKnockoutRoundGames } from '../components/tournament/pairings/knockoutEngine.ts'
import { PairingError } from '../components/tournament/pairings/pairingEngine.ts'

function makeParticipants(ratings: number[], startingPoints: number[] = []): Participant[] {
  return ratings.map((rating, i) => ({
    id: i + 1,
    player: null,
    locales: { ru: { familyName: `F${i + 1}`, givenName: 'X' } },
    capturedRating: { value: rating, rank: null },
    startingPoints: startingPoints[i] ?? 0,
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

const finished = { result: 'player1_won', status: 'completed' } as const

describe('generateKnockoutRoundGames — knockout round 1', () => {
  it('pairs 6 unpaired players into an 8-bracket with byes to the top two seeds', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
    const games = generateKnockoutRoundGames({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
      bracketSize: 8,
      knockoutRound: 1,
    })
    // Bracket 8: 1v8(virtual→bye), 2v7(virtual→bye), 3v6, 4v5.
    expect(pairSet(games)).toEqual(['3-6', '4-5'])
    expect(byeIds(games)).toEqual([1, 2])
  })

  it('pairs 4 unpaired players into a 4-bracket without byes', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100])
    const games = generateKnockoutRoundGames({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
      bracketSize: 4,
      knockoutRound: 1,
    })
    expect(pairSet(games)).toEqual(['1-4', '2-3'])
    expect(byeIds(games)).toEqual([])
  })

  it('seeds by points (startingPoints) before rating', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900], [0, 5])
    const games = generateKnockoutRoundGames({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
      bracketSize: 8,
      knockoutRound: 1,
    })
    // Player 2 leads by points: seeds [2, 1, 3, 4, 5, 6] → byes 2 and 1.
    expect(byeIds(games)).toEqual([2, 1])
    expect(pairSet(games)).toEqual(['3-6', '4-5'])
  })

  it('keeps manual games and seeds the unpaired players', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
    const manual = makeGame({ player1: 5, player2: 6, round: 2 })
    const games = generateKnockoutRoundGames({
      participants,
      games: [manual],
      round: 2,
      publishedRounds: 1,
      considerSente: false,
      bracketSize: 4,
      knockoutRound: 1,
    })
    // Unpaired 1..4 in a 4-bracket; the manual pair is not duplicated.
    expect(pairSet(games)).toEqual(['1-4', '2-3'])
    expect(games.some((g) => g.id === manual.id)).toBe(false)
  })

  it('throws when fewer than half the bracket slots are filled', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
    const games = [
      makeGame({ player1: 5, player2: 6, round: 1 }),
      makeGame({ player1: 4, round: 1, result: 'player1_won', status: 'bye' }),
    ]
    expect(() =>
      generateKnockoutRoundGames({
        participants,
        games,
        round: 1,
        publishedRounds: 0,
        considerSente: false,
        bracketSize: 8,
        knockoutRound: 1,
      }),
    ).toThrow(PairingError) // 3 unpaired < 8/2
  })

  it('throws when more unpaired players than bracket slots', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
    expect(() =>
      generateKnockoutRoundGames({
        participants,
        games: [],
        round: 1,
        publishedRounds: 0,
        considerSente: false,
        bracketSize: 4,
        knockoutRound: 1,
      }),
    ).toThrow(PairingError) // 6 unpaired > 4
  })

  it('throws on an invalid bracket size or knockout round', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100])
    const call = (bracketSize: number, knockoutRound: number) => () =>
      generateKnockoutRoundGames({
        participants,
        games: [],
        round: 1,
        publishedRounds: 0,
        considerSente: false,
        bracketSize,
        knockoutRound,
      })
    expect(call(6, 1)).toThrow(PairingError)
    expect(call(4, 0)).toThrow(PairingError)
    expect(call(4, 2)).toThrow(PairingError)
  })
})

describe('generateKnockoutRoundGames — bracket continuation', () => {
  // 6 players, knockout round 1 (round 1 of the tournament) formed in an
  // 8-bracket: byes 1, 2; pairs 3v6, 4v5. Losers (5, 6) have no forfeit games
  // — they simply sit out.
  function makeBracketHistory(): { participants: Participant[]; games: Game[] } {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
    const games: Game[] = [
      makeGame({ player1: 1, round: 1, result: 'player1_won', status: 'bye' }),
      makeGame({ player1: 2, round: 1, result: 'player1_won', status: 'bye' }),
      makeGame({ player1: 3, player2: 6, round: 1, ...finished }),
      makeGame({ player1: 4, player2: 5, round: 1, ...finished }),
    ]
    return { participants, games }
  }

  it('continues the bracket without requiring forfeit games for eliminated players', () => {
    const { participants, games } = makeBracketHistory()
    const formed = generateKnockoutRoundGames({
      participants,
      games,
      round: 2,
      publishedRounds: 1,
      considerSente: false,
      bracketSize: 8,
      knockoutRound: 2,
    })
    // Winners of adjacent bracket slots: (1, 2) and (3, 4); losers 5, 6 get
    // no games.
    expect(pairSet(formed)).toEqual(['1-2', '3-4'])
    expect(byeIds(formed)).toEqual([])
    expect(formed.every((g) => g.status !== 'forfeit')).toBe(true)
  })

  it('keeps manual lone games (e.g. a recorded forfeit) of the round', () => {
    const { participants, games } = makeBracketHistory()
    const manualForfeit = makeGame({ player1: 6, round: 2, result: 'player2_won', status: 'forfeit' })
    const formed = generateKnockoutRoundGames({
      participants,
      games: [...games, manualForfeit],
      round: 2,
      publishedRounds: 1,
      considerSente: false,
      bracketSize: 8,
      knockoutRound: 2,
    })
    expect(pairSet(formed)).toEqual(['1-2', '3-4'])
    expect(formed.some((g) => g.id === manualForfeit.id)).toBe(false)
  })

  it('keeps a manual paired game that already forms a planned pair', () => {
    const { participants, games } = makeBracketHistory()
    const manualPair = makeGame({ player1: 1, player2: 2, round: 2 })
    const formed = generateKnockoutRoundGames({
      participants,
      games: [...games, manualPair],
      round: 2,
      publishedRounds: 1,
      considerSente: false,
      bracketSize: 8,
      knockoutRound: 2,
    })
    expect(pairSet(formed)).toEqual(['3-4'])
  })

  it('throws when a manual game conflicts with the bracket', () => {
    const { participants, games } = makeBracketHistory()
    const conflicting = makeGame({ player1: 1, player2: 3, round: 2 })
    expect(() =>
      generateKnockoutRoundGames({
        participants,
        games: [...games, conflicting],
        round: 2,
        publishedRounds: 1,
        considerSente: false,
        bracketSize: 8,
        knockoutRound: 2,
      }),
    ).toThrow(PairingError)
  })

  it('throws when the start round is not a canonical seeding round of the size', () => {
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
    // Swiss-style round 1: three pairs, no byes — not an 8-bracket round 1.
    const games = [
      makeGame({ player1: 1, player2: 2, round: 1, ...finished }),
      makeGame({ player1: 3, player2: 4, round: 1, ...finished }),
      makeGame({ player1: 5, player2: 6, round: 1, ...finished }),
    ]
    expect(() =>
      generateKnockoutRoundGames({
        participants,
        games,
        round: 2,
        publishedRounds: 1,
        considerSente: false,
        bracketSize: 8,
        knockoutRound: 2,
      }),
    ).toThrow(PairingError)
  })

  it('throws when a knockout round result is missing', () => {
    const { participants, games } = makeBracketHistory()
    const unfinished = games.map((g) =>
      g.player2 != null ? { ...g, result: null, status: 'not_started' as const } : g,
    )
    expect(() =>
      generateKnockoutRoundGames({
        participants,
        games: unfinished,
        round: 2,
        publishedRounds: 1,
        considerSente: false,
        bracketSize: 8,
        knockoutRound: 2,
      }),
    ).toThrow(PairingError)
  })

  it('throws when a later round does not follow the bracket adjacency', () => {
    const { participants, games } = makeBracketHistory()
    // Round 2 was played off-bracket: 1 meets 3 instead of 2.
    const broken = [
      ...games,
      makeGame({ player1: 1, player2: 3, round: 2, ...finished }),
      makeGame({ player1: 2, player2: 4, round: 2, ...finished }),
    ]
    expect(() =>
      generateKnockoutRoundGames({
        participants,
        games: broken,
        round: 3,
        publishedRounds: 2,
        considerSente: false,
        bracketSize: 8,
        knockoutRound: 3,
      }),
    ).toThrow(PairingError)
  })

  it('finds the start round from the knockout round and forms the final', () => {
    // 6 players; round 1 is a Swiss-style round, round 2 is the 4-bracket
    // knockout round 1 over {1, 2, 3, 5} (4 and 6 are out of the bracket).
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
    const games = [
      makeGame({ player1: 1, player2: 2, round: 1, ...finished }),
      makeGame({ player1: 3, player2: 4, round: 1, ...finished }),
      makeGame({ player1: 5, player2: 6, round: 1, ...finished }),
      // Round 2, bracket 4 over covered {1, 3, 5, 2}: seeds [1, 3, 5, 2]
      // (points 1, 1, 1, 0) → pairs (1, 2) and (3, 5).
      makeGame({ player1: 1, player2: 2, round: 2, ...finished }),
      makeGame({ player1: 3, player2: 5, round: 2, ...finished }),
    ]
    const formed = generateKnockoutRoundGames({
      participants,
      games,
      round: 3,
      publishedRounds: 2,
      considerSente: false,
      bracketSize: 4,
      knockoutRound: 2,
    })
    // Winners: 1 (from 1v2) and 3 (from 3v5) → the final.
    expect(pairSet(formed)).toEqual(['1-3'])
  })

  it('forms the final ignoring consolation games between eliminated players', () => {
    // tournament1 repro: round 1 Swiss, round 2 is the canonical round 1 of
    // an 8-bracket (byes 3, 2; pairs (4,5), (1,6)), round 3 is the bracket's
    // semifinals (4,1), (3,2) PLUS a consolation game (6,5) between the two
    // players eliminated in the semifinal round... (5, 6 lost in round 2).
    const participants = makeParticipants([2472, 1999, 2005, 1856, 2167, 2266])
    const games: Game[] = [
      // Round 1 (Swiss): 3 beat 1, 2 beat 5, 6... no — 4 beat 6.
      makeGame({ player1: 1, player2: 3, round: 1, result: 'player2_won', status: 'completed' }),
      makeGame({ player1: 2, player2: 5, round: 1, ...finished }),
      makeGame({ player1: 4, player2: 6, round: 1, ...finished }),
      // Round 2 = knockout round 1 of the 8-bracket: byes to the top seeds
      // 3 and 2; pairs 4v5 and 1v6 (seeds [3, 2, 4, 1, 6, 5]).
      makeGame({ player1: 3, round: 2, result: 'player1_won', status: 'bye' }),
      makeGame({ player1: 2, round: 2, result: 'player1_won', status: 'bye' }),
      makeGame({ player1: 4, player2: 5, round: 2, ...finished }),
      makeGame({ player1: 1, player2: 6, round: 2, ...finished }),
      // Round 3 = knockout round 2 (semifinals) + consolation (6,5).
      makeGame({ player1: 4, player2: 1, round: 3, ...finished }),
      makeGame({ player1: 3, player2: 2, round: 3, ...finished }),
      makeGame({ player1: 6, player2: 5, round: 3, ...finished }),
    ]
    const formed = generateKnockoutRoundGames({
      participants,
      games,
      round: 4,
      publishedRounds: 3,
      considerSente: false,
      bracketSize: 8,
      knockoutRound: 3,
    })
    // Semifinal winners: 3 (from 3v2) and 4 (from 4v1) → the final.
    expect(pairSet(formed)).toEqual(['3-4'])
  })

  it('recognizes a bracket embedded in a round with unrelated games', () => {
    // Round 1: canonical 4-bracket over {1, 2, 3, 4} (pairs 1v4, 2v3) plus an
    // unrelated bye (5) and an unrelated pair (5, 6) of non-participants.
    const participants = makeParticipants([2400, 2300, 2200, 2100, 2000, 1900])
    const games: Game[] = [
      makeGame({ player1: 1, player2: 4, round: 1, ...finished }),
      makeGame({ player1: 2, player2: 3, round: 1, ...finished }),
      makeGame({ player1: 5, round: 1, result: 'player1_won', status: 'bye' }),
      makeGame({ player1: 5, player2: 6, round: 1, ...finished }),
    ]
    const formed = generateKnockoutRoundGames({
      participants,
      games,
      round: 2,
      publishedRounds: 1,
      considerSente: false,
      bracketSize: 4,
      knockoutRound: 2,
    })
    // Winners 1 and 2 meet in the knockout round 2; the unrelated games of
    // players 5 and 6 do not break the bracket.
    expect(pairSet(formed)).toEqual(['1-2'])
  })
})

