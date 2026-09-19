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

  it('emulates rating subgroups in the first round (UI fixture regression)', () => {
    // Regression: the drawer must receive domain participants WITH
    // capturedRating. When ParticipantRow[] (no capturedRating) leaked into
    // the engine, all ratings collapsed to 0, positions fell back to id order
    // and the draw became Танян–Лысенко / Иглицкий–Кондратов instead of the
    // ideal upper↔lower alignment.
    const participants = [
      makeParticipant(1, 2472), // Танян (U1)
      makeParticipant(2, 1999), // Иглицкий (L1)
      makeParticipant(3, 2005), // Лысенко (U2)
      makeParticipant(4, 1856), // Кондратов (L2)
    ]
    const games = generatePairings({
      participants,
      games: [],
      round: 1,
      publishedRounds: 0,
      considerSente: false,
    })
    // Upper↔lower ideal: U1↔L1, U2↔L2.
    expect(pairSet(games)).toEqual(['1-2', '3-4'])
  })
})

// Regression for the down-float closeness multiplier: a synthetic 27-player
// Swiss after 5 rounds where the sole leader (2, r=2235) must pair down. His
// unplayed candidates in the 4-point group are 3 (r=2005) and 5 (r=1726).
// Without the cross-group closeness multiplier the same-half structure of the
// 3-point group outvoted the direct closeness and the engine paired the leader
// with the lower-rated 5; with the multiplier the strongest available opponent
// (3) is chosen. Fixture: [id, rating] and [round, p1, p2, status, result].
const LEADER_FIXTURE_PARTICIPANTS: Array<[number, number]> = [
  [1, 2473], [2, 2235], [4, 2005], [3, 2005], [27, 1936], [5, 1726],
  [6, 1647], [7, 1618], [26, 1], [8, 1485], [10, 1310], [9, 1360],
  [28, 1285], [13, 1268], [11, 1289], [16, 1193], [17, 1188], [18, 1114],
  [15, 1204], [14, 1227], [19, 1083], [20, 1049], [21, 1004], [22, 965],
  [23, 960], [24, 910], [25, 712],
]

const LEADER_FIXTURE_GAMES: Array<[number, number, number | null, Game['status'], Game['result']]> = [
  [1, 27, null, 'forfeit', null], [1, 1, 14, 'completed', 'player1_won'], [1, 15, 2, 'completed', 'player2_won'],
  [1, 3, 16, 'completed', 'player1_won'], [1, 4, 17, 'completed', 'player1_won'], [1, 18, 5, 'completed', 'player2_won'],
  [1, 6, 19, 'completed', 'player1_won'], [1, 7, 20, 'completed', 'player1_won'], [1, 21, 8, 'completed', 'player2_won'],
  [1, 9, 22, 'completed', 'player1_won'], [1, 10, 23, 'completed', 'player1_won'], [1, 11, 24, 'completed', 'player1_won'],
  [1, 28, 25, 'completed', 'player1_won'], [1, 13, 26, 'completed', 'player2_won'],
  [2, 27, null, 'forfeit', 'player2_won'], [2, 1, 8, 'completed', 'player1_won'], [2, 2, 9, 'completed', 'player1_won'],
  [2, 3, 10, 'completed', 'player1_won'], [2, 11, 4, 'completed', 'player2_won'], [2, 5, 28, 'completed', 'player1_won'],
  [2, 26, 6, 'completed', 'player1_won'], [2, 7, 13, 'completed', 'player1_won'], [2, 20, 14, 'completed', 'player2_won'],
  [2, 15, 21, 'completed', 'player1_won'], [2, 16, 22, 'completed', 'player1_won'], [2, 17, 23, 'completed', 'player1_won'],
  [2, 24, 18, 'completed', 'player2_won'], [2, 19, 25, 'completed', 'player1_won'],
  [3, 27, null, 'forfeit', 'player2_won'], [3, 1, 5, 'completed', 'player1_won'], [3, 2, 7, 'completed', 'player1_won'],
  [3, 3, 26, 'completed', 'player1_won'], [3, 6, 4, 'completed', 'player2_won'], [3, 8, 15, 'completed', 'player1_won'],
  [3, 9, 16, 'completed', 'player2_won'], [3, 10, 17, 'completed', 'player1_won'], [3, 28, 19, 'completed', 'player1_won'],
  [3, 14, 13, 'completed', 'player2_won'], [3, 20, 23, 'completed', 'player1_won'], [3, 21, 24, 'completed', 'player1_won'],
  [3, 22, 25, 'completed', 'player1_won'], [3, 18, 11, 'completed', 'player1_won'],
  [4, 1, 3, 'completed', 'player1_won'], [4, 2, 4, 'completed', 'player1_won'], [4, 16, 5, 'completed', 'player2_won'],
  [4, 7, 28, 'completed', 'player1_won'], [4, 8, 18, 'completed', 'player2_won'], [4, 10, 26, 'completed', 'player2_won'],
  [4, 6, 17, 'completed', 'player1_won'], [4, 9, 19, 'completed', 'player1_won'], [4, 11, 20, 'completed', 'player1_won'],
  [4, 21, 13, 'completed', 'player2_won'], [4, 14, 22, 'completed', 'player1_won'], [4, 15, 23, 'completed', 'player1_won'],
  [4, 24, 25, 'completed', 'player2_won'], [4, 27, null, 'bye', 'player1_won'],
  [5, 16, null, 'forfeit', null], [5, 1, 2, 'completed', 'player2_won'], [5, 4, 18, 'completed', 'player1_won'],
  [5, 3, 7, 'completed', 'player1_won'], [5, 26, 5, 'completed', 'player2_won'], [5, 11, 27, 'completed', 'player2_won'],
  [5, 6, 28, 'completed', 'player1_won'], [5, 8, 13, 'completed', 'player1_won'], [5, 9, 14, 'completed', 'player1_won'],
  [5, 10, 15, 'completed', 'player1_won'], [5, 21, 17, 'completed', 'player2_won'], [5, 19, 22, 'completed', 'player1_won'],
  [5, 20, 25, 'completed', 'player1_won'], [5, 24, 23, 'completed', 'player2_won'],
]

describe('generatePairings down-float alignment', () => {
  it('pairs the sole leader down with the strongest available opponent', () => {
    const participants = LEADER_FIXTURE_PARTICIPANTS.map(([id, rating]) => makeParticipant(id, rating))
    const games = LEADER_FIXTURE_GAMES.map(([round, p1, p2, status, result]) =>
      makeGame({ round, player1: p1, player2: p2, status, result }),
    )
    const newGames = generatePairings({
      participants,
      games,
      round: 6,
      publishedRounds: 5,
      considerSente: false,
    })

    const leaderGame = newGames.find((g) => g.player1 === 2 || g.player2 === 2)
    expect(leaderGame).toBeDefined()
    const opponent = leaderGame?.player1 === 2 ? leaderGame?.player2 : leaderGame?.player1
    expect(opponent).toBe(3)

    // The rest of the field pairs at the same score levels as before: only the
    // two down-float pairs inside the 4/3-point boundary are redistributed.
    expect(pairSet(newGames)).toEqual([
      '1-4', '11-16', '13-20', '14-19', '15-27', '17-28', '2-3',
      '21-25', '22-23', '5-9', '6-18', '7-26', '8-10',
    ])
    expect(byeIds(newGames)).toEqual([24])
  })
})

