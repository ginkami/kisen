import { describe, expect, it } from 'vitest'
import type { Game, Participant } from '../domain/tournament.ts'
import {
  generatePairings,
  PairingError,
} from '../components/tournament/pairings/pairingEngine.ts'

function makeParticipant(id: number, rating: number | null = null, startingPoints = 0): Participant {
  return {
    id,
    player: null,
    locales: { ru: { familyName: `F${id}`, givenName: 'X' } },
    capturedRating: { value: rating, rank: null },
    startingPoints,
  }
}

function makeGame(overrides: Partial<Game> & { player1: number; round: number }): Game {
  return {
    id: overrides.id ?? `game-${overrides.player1}-${overrides.round}-${Math.random()}`,
    player1: overrides.player1,
    player2: overrides.player2 ?? null,
    sente: overrides.sente ?? 'unknown',
    handicap: null,
    startedAt: undefined,
    endedAt: undefined,
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

describe('generatePairings', () => {
  it('pairs all unpaired participants in round 1', () => {
    const participants = [
      makeParticipant(1, 2000),
      makeParticipant(2, 1900),
      makeParticipant(3, 1800),
      makeParticipant(4, 1700),
    ]
    const games = generatePairings({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
    })
    expect(pairSet(games)).toEqual(['1-3', '2-4'])
    expect(games.every((g) => g.round === 1 && g.status === 'not_started' && g.result === null)).toBe(true)
    expect(games.every((g) => g.sente === 'unknown')).toBe(true)
  })

  it('keeps one score group split into upper and lower rating halves', () => {
    const participants = [
      makeParticipant(1, 2000),
      makeParticipant(2, 1990),
      makeParticipant(3, 1500),
      makeParticipant(4, 1490),
      makeParticipant(5, 1000),
      makeParticipant(6, 990),
    ]
    const games = generatePairings({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
    })
    // Single score group of 6: ideal upper↔lower alignment by rating.
    expect(pairSet(games)).toEqual(['1-4', '2-5', '3-6'])
  })

  it('prefers a zero points difference over rating proximity across groups', () => {
    // 1 (2 pts), 2 (2 pts), 3 (0 pts), 4 (0 pts): pairs must stay in groups.
    const participants = [
      makeParticipant(1, 900, 2),
      makeParticipant(2, 890, 2),
      makeParticipant(3, 2000, 0),
      makeParticipant(4, 1990, 0),
    ]
    const games = generatePairings({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
    })
    expect(pairSet(games)).toEqual(['1-2', '3-4'])
  })

  it('never pairs players who already met', () => {
    const participants = [
      makeParticipant(1, 2000),
      makeParticipant(2, 1900),
      makeParticipant(3, 1800),
      makeParticipant(4, 1700),
    ]
    const history: Game[] = [
      makeGame({ player1: 1, player2: 2, round: 1, result: 'player1_won', status: 'completed' }),
      makeGame({ player1: 3, player2: 4, round: 1, result: 'player2_won', status: 'completed' }),
    ]
    const games = generatePairings({
      participants,
      games: history,
      round: 2,
      publishedRounds: 1,
      considerSente: false,
    })
    const pairs = pairSet(games)
    expect(pairs).not.toContain('1-2')
    expect(pairs).not.toContain('3-4')
    expect(pairs).toEqual(['1-4', '2-3'])
  })

  it('throws PairingError when no full pairing exists', () => {
    const participants = [makeParticipant(1), makeParticipant(2)]
    const history: Game[] = [
      makeGame({ player1: 1, player2: 2, round: 1, result: 'player1_won', status: 'completed' }),
    ]
    expect(() =>
      generatePairings({
        participants,
        games: history,
        round: 2,
        publishedRounds: 1,
        considerSente: false,
      }),
    ).toThrow(PairingError)
  })

  it('gives the bye to the weakest player and never to a prior skipper', () => {
    const participants = [
      makeParticipant(1, 2000),
      makeParticipant(2, 1500),
      makeParticipant(3, 1000),
    ]
    // Player 3 skipped round 1 (bye); the bye must go to player 2 instead.
    const historyWithBye: Game[] = [
      makeGame({ player1: 3, round: 1, result: 'player1_won', status: 'bye' }),
      makeGame({ player1: 1, player2: 2, round: 1, result: 'draw', status: 'completed' }),
    ]
    let games = generatePairings({
      participants,
      games: historyWithBye,
      round: 2,
      publishedRounds: 1,
      considerSente: false,
    })
    expect(byeIds(games)).toEqual([2])
  })

  it('never gives a second bye to a player who already skipped (forfeit)', () => {
    const participants = [
      makeParticipant(1, 2000),
      makeParticipant(2, 1500),
      makeParticipant(3, 1000),
    ]
    const history: Game[] = [
      makeGame({ player1: 2, round: 1, result: 'player2_won', status: 'forfeit' }),
      makeGame({ player1: 1, player2: 3, round: 1, result: 'player1_won', status: 'completed' }),
    ]
    const games = generatePairings({
      participants,
      games: history,
      round: 2,
      publishedRounds: 1,
      considerSente: false,
    })
    expect(byeIds(games)).toEqual([3])
  })

  it('locks manual pairs, results and forfeits of the round', () => {
    const participants = [
      makeParticipant(1),
      makeParticipant(2),
      makeParticipant(3),
      makeParticipant(4),
      makeParticipant(5),
      makeParticipant(6),
    ]
    const locked: Game[] = [
      makeGame({ player1: 1, player2: 2, round: 1, result: 'player1_won' }),
      makeGame({ player1: 5, round: 1, result: 'player2_won', status: 'forfeit' }),
    ]
    const games = generatePairings({
      participants,
      games: locked,
      round: 1,
      publishedRounds: 0,
      considerSente: false,
    })
    // Only players 3, 4 and 6 are placed; locked games are not in the output.
    expect(pairSet(games)).toEqual(['3-4'])
    expect(byeIds(games)).toEqual([6])
    expect(
      games.find(
        (g) => g.player1 === 1 || g.player2 === 1 || g.player1 === 5 || g.player2 === 5,
      ),
    ).toBeUndefined()
  })


  it('respects color constraints when considerSente is true', () => {
    const participants = [
      makeParticipant(1, 2000),
      makeParticipant(2, 1900),
      makeParticipant(3, 1800),
      makeParticipant(4, 1700),
    ]
    // Player 1 was sente twice in a row and has balance +2: they can only
    // play gote now.
    const history: Game[] = [
      makeGame({ player1: 1, player2: 3, round: 1, result: 'player1_won', status: 'completed', sente: 'player1' }),
      makeGame({ player1: 1, player2: 4, round: 2, result: 'player1_won', status: 'completed', sente: 'player1' }),
      makeGame({ player1: 2, player2: 3, round: 2, result: 'player2_won', status: 'completed', sente: 'player2' }),
    ]
    const games = generatePairings({
      participants,
      games: history,
      round: 3,
      publishedRounds: 2,
      considerSente: true,
    })
    const gameWith1 = games.find((g) => g.player1 === 1 || g.player2 === 1)
    expect(gameWith1).toBeDefined()
    expect(gameWith1?.sente).toBe('player2')
  })

  it('ignores color constraints when considerSente is false', () => {
    const participants = [makeParticipant(1), makeParticipant(2)]
    const games = generatePairings({
      participants,
      games: [],
      round: 3,
      publishedRounds: 2,
      considerSente: false,
    })
    expect(pairSet(games)).toEqual(['1-2'])
    expect(games.every((g) => g.sente === 'unknown')).toBe(true)
  })

  it('produces deterministic output for the same input', () => {
    const participants = [
      makeParticipant(1, 2000),
      makeParticipant(2, 1900),
      makeParticipant(3, 1800),
      makeParticipant(4, 1700),
      makeParticipant(5, 1600),
    ]
    const run = () => {
      const games = generatePairings({
        participants,
        games: [],
        round: 1,
        publishedRounds: 0,
        considerSente: true,
      })
      return { pairs: pairSet(games), byes: byeIds(games), sente: games.map((g) => g.sente) }
    }
    expect(run()).toEqual(run())
  })

  it('assigns sente to the higher-rated player in round 1', () => {
    const participants = [makeParticipant(1, 1200), makeParticipant(2, 2000)]
    const games = generatePairings({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: true,
    })
    expect(pairSet(games)).toEqual(['1-2'])
    expect(games[0]?.sente).toBe('player2') // participant 2 is higher rated
  })
})

