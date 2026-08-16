vi.mock('uuidv7', () => {
  let counter = 0
  return {
    uuidv7: () => `mock-uuid-${++counter}`,
  }
})

import { rankToColor, computeStandings, TIEBREAK_ABBR } from '../components/tournament/crosstable/crosstableModel.ts'
import type { Game } from '../domain/tournament.ts'
import type { TieBreak } from '../domain/tieBreak.ts'
import type { PlayerRank } from '../domain/playerRating.ts'

try { (globalThis as any).ZodConfig ??= {} } catch { /* ok */ }

function makeParticipant(id: number, sp = 0) {
  return { id, startingPoints: sp }
}

function makeGame(overrides: Partial<Game> & { round: number }): Game {
  return {
    id: `game-${Math.random().toString(36).slice(2)}`,
    player1: 0, player2: null, sente: 'unknown', handicap: null, result: null, status: 'not_started',
    ...overrides,
  }
}

describe('rankToColor', () => {
  it('returns orange for 20k', () => { expect(rankToColor('20k')).toBe('oklch(70.081% 0.164 56.844)') })
  it('returns teal for 8k', () => { expect(rankToColor('8k')).toBe('oklch(60.995% 0.08 174.616)') })
  it('returns blue for 5k', () => { expect(rankToColor('5k')).toBe('oklch(45.0% 0.14 250.0)') })
  it('returns dark for 2k', () => { expect(rankToColor('2k')).toBe('oklch(43% 0.020 52.190)') })
  it('returns black for 1d', () => { expect(rankToColor('1d')).toBe('#000') })
  it('returns red-brown for 5d', () => { expect(rankToColor('5d')).toBe('oklch(40.0% 0.12 25.0)') })
})

describe('TIEBREAK_ABBR', () => {
  it('has correct abbreviations', () => {
    expect(TIEBREAK_ABBR.points).toBe('Pts')
    expect(TIEBREAK_ABBR.buchholz).toBe('BH')
    expect(TIEBREAK_ABBR.buchholz_cut).toBe('BHC')
    expect(TIEBREAK_ABBR.buchholz_median).toBe('BHM')
    expect(TIEBREAK_ABBR.buchholz_plus).toBe('BH+')
    expect(TIEBREAK_ABBR.sonneborn_berger).toBe('SB')
    expect(TIEBREAK_ABBR.direct_encounter).toBe('DE')
    expect(TIEBREAK_ABBR.wins_count).toBe('W')
  })
})

describe('computeStandings', () => {
  const tb: TieBreak[] = [{ type: 'points' }, { type: 'buchholz' }]

  it('sorts by points descending', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: null, status: 'bye' }),
    ]
    const standings = computeStandings(games, participants, tb, 1)
    expect(standings[0].participantId).toBe(1)
    expect(standings[0].place).toBe(1)
    expect(standings[1].participantId).toBe(3)
    expect(standings[1].place).toBe(2)
  })

  it('uses buchholz as tiebreaker', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 3, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 2, player2: 3, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 2, result: 'draw', status: 'completed' }),
    ]
    const standings = computeStandings(games, participants, tb, 2)
    expect(standings[0].participantId).toBe(1)
    expect(standings[1].participantId).toBe(2)
    expect(standings[2].participantId).toBe(3)
  })

  it('assigns correct opponent place numbers', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: null, status: 'bye' }),
    ]
    const standings = computeStandings(games, participants, tb, 1)
    const placeMap = new Map(standings.map((s) => [s.participantId, s.place]))
    expect(placeMap.get(1)).toBe(1)
    expect(placeMap.get(3)).toBe(2)
    expect(placeMap.get(2)).toBe(3)
  })

  it('excludes forfeit games from opponent points', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: null, result: null, status: 'forfeit' }),
    ]
    const standings = computeStandings(games, participants, tb, 1)
    const ids = standings.map((s) => s.participantId)
    expect(ids).toEqual([1, 2, 3])
  })
})

describe('Tie-break calculators via computeStandings', () => {
  it('buchholz_cut removes lowest opponent score', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3), makeParticipant(4)]
    const tb: TieBreak[] = [{ type: 'points' }, { type: 'buchholz_cut', cutCount: 1 }]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: 4, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 3, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 2, player2: 4, result: 'player1_won', status: 'completed' }),
    ]
    const standings = computeStandings(games, participants, tb, 2)
    expect(standings[0].participantId).toBe(1)
    expect(standings[0].tieBreakValues.buchholz_cut).toBe(1)
  })

  it('sonneborn_berger counts defeated opponents points', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const tb: TieBreak[] = [{ type: 'points' }, { type: 'sonneborn_berger' }]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 3, result: 'draw', status: 'completed' }),
    ]
    const standings = computeStandings(games, participants, tb, 2)
    const p1 = standings.find((s) => s.participantId === 1)!
    const p3 = standings.find((s) => s.participantId === 3)!
    expect(p1.tieBreakValues.sonneborn_berger).toBe(0.75)
    expect(p3.tieBreakValues.sonneborn_berger).toBe(0.75)
    expect(p1.place).toBeLessThan(p3.place)
  })

  it('wins_count includes byes', () => {
    const participants = [makeParticipant(1), makeParticipant(2)]
    const tb: TieBreak[] = [{ type: 'points' }, { type: 'wins_count' }]
    const games = [
      makeGame({ round: 1, player1: 1, player2: null, status: 'bye' }),
      makeGame({ round: 1, player1: 2, player2: null, status: 'bye' }),
    ]
    const standings = computeStandings(games, participants, tb, 1)
    expect(standings[0].tieBreakValues.wins_count).toBe(1)
    expect(standings[1].tieBreakValues.wins_count).toBe(1)
  })

  it('direct_encounter counts points between tied players', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const tb: TieBreak[] = [{ type: 'points' }, { type: 'direct_encounter' }]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: null, status: 'bye' }),
      makeGame({ round: 2, player1: 1, player2: 3, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 2, player2: 3, result: 'player1_won', status: 'completed' }),
    ]
    const standings = computeStandings(games, participants, tb, 2)
    const p2 = standings.find((s) => s.participantId === 2)!
    const p3 = standings.find((s) => s.participantId === 3)!
    expect(p2.tieBreakValues.direct_encounter).toBe(1)
    expect(p3.tieBreakValues.direct_encounter).toBe(0)
    expect(p2.place).toBeLessThan(p3.place)
  })
})
