vi.mock('uuidv7', () => {
  let counter = 0
  return {
    uuidv7: () => `mock-uuid-${++counter}`,
  }
})

import { rankToColor, computeStandings, parseCellInput, gameToCellInput, withCellEdited, CELL_PARTIAL_RE, handicapForView, normalizeGamesSente } from '../components/tournament/crosstable/crosstableModel.ts'
import type { Game } from '../domain/tournament.ts'
import type { TieBreak } from '../domain/tieBreak.ts'

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

  it('computes buchholz_sum as the sum of faced opponents buchholz values', () => {
    // Round 1: 1 beats 3, 2 beats 4. Round 2: 1 vs 2 draw, 3 vs 4 draw.
    // Points: 1 -> 1.5, 2 -> 1.5, 3 -> 0.5, 4 -> 0.5
    // BH: 1 -> 0.5 + 1.5 = 2.0, 2 -> 0.5 + 1.5 = 2.0, 3 -> 1.5 + 0.5 = 2.0, 4 -> 1.5 + 0.5 = 2.0
    // BH-BH (each faced two opponents with BH 2.0): all four -> 4.0
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3), makeParticipant(4)]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 3, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 2, player2: 4, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 2, result: 'draw', status: 'completed' }),
      makeGame({ round: 2, player1: 3, player2: 4, result: 'draw', status: 'completed' }),
    ]
    const sumTb: TieBreak[] = [{ type: 'points' }, { type: 'buchholz_sum' }]
    const standings = computeStandings(games, participants, sumTb, 2)

    const values = new Map(standings.map((s) => [s.participantId, s.tieBreakValues.buchholz_sum]))
    expect(values.get(1)).toBe(4)
    expect(values.get(2)).toBe(4)
    expect(values.get(3)).toBe(4)
    expect(values.get(4)).toBe(4)
  })

  it('breaks points ties with buchholz_sum (stronger schedule ranks higher)', () => {
    // Points: 1 -> 1, 2 -> 1, 3 -> 0, 4 -> 1 (round 2: 4 beats 3).
    // BH: 1 -> 0 (faced 3), 2 -> 1 (faced 4), 3 -> 1 + 1 = 2, 4 -> 1 + 0 = 1.
    // BH-BH: 1 -> BH(3) = 2, 2 -> BH(4) = 1, 3 -> BH(1) + BH(4) = 0 + 1 = 1,
    //        4 -> BH(2) + BH(3) = 1 + 2 = 3.
    // Points tie between 1, 2, 4 -> BH-BH ranks 4 (3.0), then 1 (2.0), then 2 (1.0).
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3), makeParticipant(4)]
    const games = [
      makeGame({ round: 1, player1: 1, player2: 3, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 2, player2: 4, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 3, player2: 4, result: 'player2_won', status: 'completed' }),
    ]
    const sumTb: TieBreak[] = [{ type: 'points' }, { type: 'buchholz_sum' }]
    const standings = computeStandings(games, participants, sumTb, 2)

    expect(standings.map((s) => s.participantId)).toEqual([4, 1, 2, 3])
  })

  it('ignores byes in buchholz_sum (no opponent to sum)', () => {
    const participants = [makeParticipant(1), makeParticipant(2), makeParticipant(3)]
    const games = [
      makeGame({ round: 1, player1: 1, player2: null, status: 'bye' }),
      makeGame({ round: 1, player1: 2, player2: 3, result: 'player1_won', status: 'completed' }),
    ]
    const sumTb: TieBreak[] = [{ type: 'points' }, { type: 'buchholz_sum' }]
    const standings = computeStandings(games, participants, sumTb, 1)

    const values = new Map(standings.map((s) => [s.participantId, s.tieBreakValues.buchholz_sum]))
    expect(values.get(1)).toBe(0)
    // Participant 2 faced 3 (BH 1) -> 1; participant 3 faced 2 (BH 0) -> 0.
    expect(values.get(2)).toBe(1)
    expect(values.get(3)).toBe(0)
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

describe('parseCellInput', () => {
  it('parses ^4++B (sente, opp 4, win, handicap +B)', () => {
    const r = parseCellInput('^4++B', true)
    expect(r).toEqual({ oppPlace: 4, isSente: true, result: 'player1_won', handicap: '+B' })
  })

  it('parses 11+-2p (no sente, opp 11, win, handicap -2p)', () => {
    const r = parseCellInput('11+-2p', true)
    expect(r).toEqual({ oppPlace: 11, isSente: false, result: 'player1_won', handicap: '-2p' })
  })

  it('parses 5- (no sente, opp 5, loss)', () => {
    const r = parseCellInput('5-', true)
    expect(r).toEqual({ oppPlace: 5, isSente: false, result: 'player2_won', handicap: null })
  })

  it('parses ^3-L (sente, opp 3, handicap -L, no result)', () => {
    const r = parseCellInput('^3-L', true)
    expect(r).toEqual({ oppPlace: 3, isSente: true, result: null, handicap: '-L' })
  })

  it('parses 5 (no sente, opp 5, no result)', () => {
    const r = parseCellInput('5', true)
    expect(r).toEqual({ oppPlace: 5, isSente: false, result: null, handicap: null })
  })

  it('parses 17 (no sente, opp 17, no result)', () => {
    const r = parseCellInput('17', true)
    expect(r).toEqual({ oppPlace: 17, isSente: false, result: null, handicap: null })
  })

  it('parses + as bye', () => {
    expect(parseCellInput('+', true)).toBe('bye')
  })

  it('parses - as forfeit', () => {
    expect(parseCellInput('-', true)).toBe('forfeit')
  })

  it('rejects ^ when considerSente is false', () => {
    expect(parseCellInput('^5', false)).toBeNull()
  })

  it('rejects x', () => {
    expect(parseCellInput('x', true)).toBeNull()
  })

  it('rejects ++', () => {
    expect(parseCellInput('++', true)).toBeNull()
  })

  it('parses = as bye_draw', () => {
    expect(parseCellInput('=', true)).toBe('bye_draw')
  })

  it('rejects 0 (opp number must be >= 1)', () => {
    expect(parseCellInput('0', true)).toBeNull()
  })

  it('rejects ^4+X (invalid handicap code)', () => {
    expect(parseCellInput('^4+X', true)).toBeNull()
  })

  it('rejects empty string', () => {
    expect(parseCellInput('', true)).toBeNull()
  })

  it('parses 5= (draw)', () => {
    const r = parseCellInput('5=', true)
    expect(r).toEqual({ oppPlace: 5, isSente: false, result: 'draw', handicap: null })
  })

  it('parses ^12+ (sente, opp 12, win, no handicap)', () => {
    const r = parseCellInput('^12+', true)
    expect(r).toEqual({ oppPlace: 12, isSente: true, result: 'player1_won', handicap: null })
  })

  it('parses without sente when considerSente is false', () => {
    const r = parseCellInput('3+', false)
    expect(r).toEqual({ oppPlace: 3, isSente: false, result: 'player1_won', handicap: null })
  })
})

describe('CELL_PARTIAL_RE', () => {
  const valid = ['', '^', '^1', '^1+', '^1+-', '1-', '+', '-', '1=', '5=', '3+L', '17', '^4+B', '^3++2', '^3++2p', '^3++1', '^3++10', '^3++10p', '3+-5', '3+-5p']
  test.each(valid)('accepts %s', (v) => {
    expect(CELL_PARTIAL_RE.test(v)).toBe(true)
  })

  const invalid = ['x', '#', '^+', '12+x', '^3++1p']
  test.each(invalid)('rejects %s', (v) => {
    expect(CELL_PARTIAL_RE.test(v)).toBe(false)
  })
})

describe('gameToCellInput', () => {
  it('serializes sente win with handicap', () => {
    const g: Game = { id: 'g1', player1: 1, player2: 2, sente: 'player1', handicap: '+B', result: 'player1_won', status: 'completed', round: 1 }
    expect(gameToCellInput(g, 1, 4, true)).toBe('^4++B')
  })

  it('serializes gote win with handicap', () => {
    const g: Game = { id: 'g2', player1: 3, player2: 4, sente: 'player1', handicap: '-2p', result: 'player2_won', status: 'completed', round: 1 }
    expect(gameToCellInput(g, 4, 11, true)).toBe('11++2p')
  })

  it('serializes loss', () => {
    const g: Game = { id: 'g3', player1: 1, player2: 2, sente: 'unknown', handicap: null, result: 'player2_won', status: 'completed', round: 1 }
    expect(gameToCellInput(g, 1, 5, false)).toBe('5-')
  })

  it('serializes sente no result with handicap', () => {
    const g: Game = { id: 'g4', player1: 1, player2: 2, sente: 'player1', handicap: '-L', result: null, status: 'not_started', round: 1 }
    expect(gameToCellInput(g, 1, 3, true)).toBe('^3-L')
  })

  it('serializes gote no result no handicap', () => {
    const g: Game = { id: 'g5', player1: 3, player2: 4, sente: 'player1', handicap: null, result: null, status: 'not_started', round: 1 }
    expect(gameToCellInput(g, 4, 5, true)).toBe('5')
  })

  it('serializes no sente no result', () => {
    const g: Game = { id: 'g6', player1: 1, player2: 2, sente: 'unknown', handicap: null, result: null, status: 'not_started', round: 1 }
    expect(gameToCellInput(g, 1, 17, false)).toBe('17')
  })

  it('serializes bye as +', () => {
    const g: Game = { id: 'g7', player1: 1, player2: null, sente: 'unknown', handicap: null, result: null, status: 'bye', round: 1 }
    expect(gameToCellInput(g, 1, null, false)).toBe('+')
  })

  it('serializes forfeit as -', () => {
    const g: Game = { id: 'g8', player1: 1, player2: null, sente: 'unknown', handicap: null, result: 'player2_won', status: 'forfeit', round: 1 }
    expect(gameToCellInput(g, 1, null, false)).toBe('-')
  })

  it('returns empty string for no game', () => {
    expect(gameToCellInput(undefined, 1, null, false)).toBe('')
  })

  it('omits ^ when considerSente is false', () => {
    const g: Game = { id: 'g9', player1: 1, player2: 2, sente: 'player1', handicap: null, result: 'player1_won', status: 'completed', round: 1 }
    expect(gameToCellInput(g, 1, 3, false)).toBe('3+')
  })
})

describe('withCellEdited', () => {
  const participants = [
    { id: 1, startingPoints: 0 },
    { id: 2, startingPoints: 0 },
    { id: 3, startingPoints: 0 },
    { id: 4, startingPoints: 0 },
  ]
  const tieBreaks: TieBreak[] = [{ type: 'points' }, { type: 'buchholz' }]

  it('opponent change cascades: A-B and C-D removed, A-C created', () => {
    const games: Game[] = [
      makeGame({ id: 'ab', round: 1, player1: 1, player2: 2, status: 'not_started' }),
      makeGame({ id: 'cd', round: 1, player1: 3, player2: 4, status: 'not_started' }),
    ]
    // A (pid=1) currently paired with B (pid=2), C (pid=3) paired with D (pid=4)
    // Edit A to play against C (oppPlace=3 by standings id order)
    const result = withCellEdited(games, participants, tieBreaks, 1, 1, '3', false)
    expect(result).not.toBeNull()
    const r1 = result!.filter((g) => g.round === 1)
    expect(r1).toHaveLength(1)
    expect(r1[0].player1).toBe(1)
    expect(r1[0].player2).toBe(3)
    expect(r1[0].status).toBe('not_started')
    // B and D should have no game
    expect(r1.some((g) => g.player1 === 2 || g.player2 === 2)).toBe(false)
    expect(r1.some((g) => g.player1 === 4 || g.player2 === 4)).toBe(false)
  })

  it('result-only edit keeps pairing', () => {
    const games: Game[] = [
      makeGame({ id: 'ab', round: 1, player1: 1, player2: 2, sente: 'player1', handicap: '-L' as any, status: 'not_started' }),
    ]
    const result = withCellEdited(games, participants, tieBreaks, 1, 1, '^2+-L', true)
    expect(result).not.toBeNull()
    const r1 = result!.filter((g) => g.round === 1)
    expect(r1).toHaveLength(1)
    expect(r1[0].player1).toBe(1)
    expect(r1[0].player2).toBe(2)
    expect(r1[0].result).toBe('player1_won')
    expect(r1[0].handicap).toBe('-L')
  })

  it('bye input frees former opponent', () => {
    const games: Game[] = [
      makeGame({ id: 'ab', round: 1, player1: 1, player2: 2, status: 'not_started' }),
    ]
    const result = withCellEdited(games, participants, tieBreaks, 1, 1, '+', false)
    expect(result).not.toBeNull()
    const r1 = result!.filter((g) => g.round === 1)
    expect(r1).toHaveLength(1)
    expect(r1[0].player1).toBe(1)
    expect(r1[0].player2).toBeNull()
    expect(r1[0].status).toBe('bye')
  })

  it('forfeit input creates forfeit game', () => {
    const games: Game[] = [
      makeGame({ id: 'ab', round: 1, player1: 1, player2: 2, status: 'not_started' }),
    ]
    const result = withCellEdited(games, participants, tieBreaks, 1, 1, '-', false)
    expect(result).not.toBeNull()
    const r1 = result!.filter((g) => g.round === 1)
    expect(r1).toHaveLength(1)
    expect(r1[0].player1).toBe(1)
    expect(r1[0].player2).toBeNull()
    expect(r1[0].status).toBe('forfeit')
    expect(r1[0].result).toBe('player2_won')
  })

  it('invalid input returns null', () => {
    const games: Game[] = [
      makeGame({ id: 'ab', round: 1, player1: 1, player2: 2, status: 'not_started' }),
    ]
    expect(withCellEdited(games, participants, tieBreaks, 1, 1, 'x', false)).toBeNull()
  })

  it('empty input returns null', () => {
    const games: Game[] = [
      makeGame({ id: 'ab', round: 1, player1: 1, player2: 2, status: 'not_started' }),
    ]
    expect(withCellEdited(games, participants, tieBreaks, 1, 1, '', false)).toBeNull()
  })

  it('result mirrored for player2-edited cell', () => {
    const games: Game[] = [
      makeGame({ id: 'ab', round: 1, player1: 1, player2: 2, sente: 'player1', status: 'not_started' }),
    ]
    // pid=2 is player2, editing with ^ makes pid=2 become player1
    const result = withCellEdited(games, participants, tieBreaks, 2, 1, '^1+', true)
    expect(result).not.toBeNull()
    const r1 = result!.filter((g) => g.round === 1)
    expect(r1).toHaveLength(1)
    expect(r1[0].player1).toBe(2)
    expect(r1[0].player2).toBe(1)
    expect(r1[0].sente).toBe('player1')
    expect(r1[0].result).toBe('player1_won')
  })

  it('sente set to unknown when considerSente is false', () => {
    const games: Game[] = []
    const result = withCellEdited(games, participants, tieBreaks, 1, 1, '2', false)
    expect(result).not.toBeNull()
    const r1 = result!.filter((g) => g.round === 1)
    expect(r1[0].sente).toBe('unknown')
    expect(r1[0].player1).toBe(1)
    expect(r1[0].player2).toBe(2)
  })
})


describe('withCellEdited sente invariant fix', () => {
  const participants = [
    { id: 1, startingPoints: 0 },
    { id: 2, startingPoints: 0 },
    { id: 3, startingPoints: 0 },
    { id: 4, startingPoints: 0 },
  ]
  const tieBreaks: TieBreak[] = [{ type: 'points' }, { type: 'buchholz' }]

  it('no ^ considerSente=true always sets sente=player1 and preserves structure', () => {
    // All players have 0 results so far — place order equals id order
    const games: Game[] = [
      makeGame({ id: 'ad', round: 1, player1: 4, player2: 1, sente: 'player1', result: null, status: 'not_started' }),
    ]
    const result = withCellEdited(games, participants, tieBreaks, 1, 1, '4+', true)
    expect(result).not.toBeNull()
    const r1 = result!.filter((g) => g.round === 1)
    expect(r1).toHaveLength(1)
    expect(r1[0].player1).toBe(4)
    expect(r1[0].player2).toBe(1)
    expect(r1[0].sente).toBe('player1')
  })
})

describe('handicapForView', () => {
  it('returns handicap as-is for player1', () => {
    expect(handicapForView('-L', true)).toBe('-L')
  })

  it('flips - to + for player2', () => {
    expect(handicapForView('-L', false)).toBe('+L')
  })

  it('flips + to - for player2', () => {
    expect(handicapForView('+B', false)).toBe('-B')
  })

  it('handles handicap code with p suffix', () => {
    expect(handicapForView('-2p', false)).toBe('+2p')
    expect(handicapForView('+10p', false)).toBe('-10p')
  })
})

describe('gameToCellInput handicap perspective', () => {

describe('normalizeGamesSente', () => {
  it('normalizes sente=unknown to player1 when considerSente=true', () => {
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: 2, sente: 'unknown' }),
      makeGame({ round: 1, player1: 3, player2: 4, sente: 'player2' }),
    ]
    const result = normalizeGamesSente(games, true)
    expect(result[0].sente).toBe('player1')
    expect(result[1].sente).toBe('player1')
  })

  it('normalizes sente=player1 to unknown when considerSente=false', () => {
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: 2, sente: 'player1' }),
      makeGame({ round: 1, player1: 3, player2: 4, sente: 'player2' }),
    ]
    const result = normalizeGamesSente(games, false)
    expect(result[0].sente).toBe('unknown')
    expect(result[1].sente).toBe('unknown')
  })

  it('returns same array reference when no changes needed', () => {
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: 2, sente: 'player1' }),
    ]
    const result = normalizeGamesSente(games, true)
    expect(result).toBe(games)
  })

  it('handles empty games array', () => {
    expect(normalizeGamesSente([], true)).toEqual([])
    expect(normalizeGamesSente([], false)).toEqual([])
  })

  it('creates new array when any game needs changes', () => {
    const g1 = makeGame({ round: 1, player1: 1, player2: 2, sente: 'player1' })
    const g2 = makeGame({ round: 1, player1: 3, player2: 4, sente: 'unknown' })
    const games = [g1, g2]
    const result = normalizeGamesSente(games, true)
    expect(result).not.toBe(games)
    expect(result[0].sente).toBe('player1')
    expect(result[1].sente).toBe('player1')
  })
})

  it('player1 row: handicap shown as-is (player1 gives)', () => {
    const g: Game = { id: 'g1', player1: 1, player2: 2, sente: 'player1', handicap: '-L', result: 'player1_won', status: 'completed', round: 1 }
    expect(gameToCellInput(g, 1, 4, true)).toBe('^4+-L')
  })

  it('player2 row: handicap sign flipped (opponent gives)', () => {
    const g: Game = { id: 'g2', player1: 3, player2: 4, sente: 'player1', handicap: '-2p', result: 'player2_won', status: 'completed', round: 1 }
    expect(gameToCellInput(g, 4, 11, true)).toBe('11++2p')
  })

  it('round-trip: input -L from player2 -> store +L -> display flip back to -L', () => {
    const games: Game[] = [
      makeGame({ round: 1, player1: 3, player2: 4, sente: 'player1', handicap: null, result: null, status: 'not_started' }),
    ]
    const ps = [
      { id: 1, startingPoints: 0 }, { id: 2, startingPoints: 0 },
      { id: 3, startingPoints: 0 }, { id: 4, startingPoints: 0 },
    ]
    const tbs: TieBreak[] = [{ type: 'points' }, { type: 'buchholz' }]
    // pid=4 edits: input '3+-L' = opponent place 3, win result, handicap -L (I give)
    const result = withCellEdited(games, ps, tbs, 4, 1, '3+-L', true)
    expect(result).not.toBeNull()
    const r1 = result!.filter((g) => g.round === 1)
    expect(r1).toHaveLength(1)
    // player2 input '-L' -> stored as '+L' (canonical: player2 gives)
    expect(r1[0].handicap).toBe('+L')
    // Display: player1 row shows '+L' as-is; player2 row flips back to '-L'
    expect(gameToCellInput(r1[0], 3, 4, true)).toContain('+L')
    expect(gameToCellInput(r1[0], 4, 3, true)).toContain('-L')
  })
})

describe('withCellEdited handicap flip', () => {
  it('no-^ edit with handicap flips sign on store', () => {
    const ps = [
      { id: 1, startingPoints: 0 }, { id: 2, startingPoints: 0 },
      { id: 3, startingPoints: 0 }, { id: 4, startingPoints: 0 },
    ]
    const tbs: TieBreak[] = [{ type: 'points' }, { type: 'buchholz' }]
    const games: Game[] = [
      makeGame({ round: 1, player1: 4, player2: 1, sente: 'player1', result: 'player2_won', status: 'completed' }),
    ]
    const result = withCellEdited(games, ps, tbs, 1, 1, '4+-L', true)
    expect(result).not.toBeNull()
    const r1 = result!.filter((g) => g.round === 1)
    expect(r1).toHaveLength(1)
    expect(r1[0].handicap).toBe('+L')
    expect(r1[0].sente).toBe('player1')
  })

  it('^ edit with handicap keeps sign', () => {
    const ps = [
      { id: 1, startingPoints: 0 }, { id: 2, startingPoints: 0 },
      { id: 3, startingPoints: 0 }, { id: 4, startingPoints: 0 },
    ]
    const tbs: TieBreak[] = [{ type: 'points' }, { type: 'buchholz' }]
    const games: Game[] = []
    const result = withCellEdited(games, ps, tbs, 4, 1, '^1+-L', true)
    expect(result).not.toBeNull()
    const r1 = result!.filter((g) => g.round === 1)
    expect(r1).toHaveLength(1)
    expect(r1[0].handicap).toBe('-L')
    expect(r1[0].player1).toBe(4)
    expect(r1[0].sente).toBe('player1')
  })
})


describe('SL Points (sl_points)', () => {
  const tb: TieBreak[] = [{ type: 'points' }, { type: 'sl_points' }]

  it('assigns 55/34/21/13/8 to five participants with distinct points', () => {
    // Use different starting points to guarantee 5 distinct totals: 2, 1.5, 1, 0.5, 0
    const participants = [makeParticipant(1, 0), makeParticipant(2, 0.5), makeParticipant(3, 1), makeParticipant(4, 1.5), makeParticipant(5, 2)]
    const games: Game[] = []
    const standings = computeStandings(games, participants, tb, 0)
    const byId = (id: number) => standings.find((s) => s.participantId === id)!
    expect(byId(5).tieBreakValues.sl_points).toBe(55) // 2pts -> position 1
    expect(byId(4).tieBreakValues.sl_points).toBe(34) // 1.5pts -> position 2
    expect(byId(3).tieBreakValues.sl_points).toBe(21) // 1pt -> position 3
    expect(byId(2).tieBreakValues.sl_points).toBe(13) // 0.5pts -> position 4
    expect(byId(1).tieBreakValues.sl_points).toBe(8)  // 0pts -> position 5
  })

  it('assigns 1 to participants at position 9 or beyond', () => {
    const participants = Array.from({ length: 10 }, (_, i) => makeParticipant(i + 1, 0))
    const games: Game[] = []
    // All have 0 points -> one group of 10, end position 10 -> 1
    const standings = computeStandings(games, participants, tb, 0)
    for (const s of standings) expect(s.tieBreakValues.sl_points).toBe(1)
  })

  it('uses group end position: groups of 1/3/2 -> 55/13/13/13/5/5', () => {
    // A=2pts, B=C=D=1pt, E=F=0pts
    const participants = [
      makeParticipant(1, 2), makeParticipant(2, 1), makeParticipant(3, 1),
      makeParticipant(4, 1), makeParticipant(5, 0), makeParticipant(6, 0),
    ]
    const games: Game[] = []
    const standings = computeStandings(games, participants, tb, 0)
    const byId = (id: number) => standings.find((s) => s.participantId === id)!
    expect(byId(1).tieBreakValues.sl_points).toBe(55) // group [A] ends at position 1
    expect(byId(2).tieBreakValues.sl_points).toBe(13) // group [B,C,D] ends at position 4
    expect(byId(3).tieBreakValues.sl_points).toBe(13)
    expect(byId(4).tieBreakValues.sl_points).toBe(13)
    expect(byId(5).tieBreakValues.sl_points).toBe(5)  // group [E,F] ends at position 6
    expect(byId(6).tieBreakValues.sl_points).toBe(5)
  })

  it('never contradicts points ordering', () => {
    const participants = [makeParticipant(1, 0), makeParticipant(2, 0), makeParticipant(3, 0)]
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 3, result: 'draw', status: 'completed' }),
    ]
    // p1=2.5, p3=2.5, p2=0
    const standings = computeStandings(games, participants, tb, 2)
    const p1 = standings.find((s) => s.participantId === 1)!
    const p3 = standings.find((s) => s.participantId === 3)!
    const p2 = standings.find((s) => s.participantId === 2)!
    // p1 and p3 share points (2.5) -> group of 2, end position 2 -> 34
    expect(p1.tieBreakValues.sl_points).toBe(34)
    expect(p3.tieBreakValues.sl_points).toBe(34)
    // p2 has 0 points -> group of 1, end position 3 -> 21
    expect(p2.tieBreakValues.sl_points).toBe(21)
    // p1 and p3 are above p2
    expect(p1.place).toBeLessThan(p2.place)
    expect(p3.place).toBeLessThan(p2.place)
  })
})