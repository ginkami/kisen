import { describe, expect, it } from 'vitest'
import type { Game } from '../domain/tournament.ts'
import { buildFesaReport, fesaRoundDates } from '../components/tournament/crosstable/fesaReport.ts'
import type { FesaParticipant } from '../components/tournament/crosstable/fesaReport.ts'

function makeParticipants(withSp: boolean): FesaParticipant[] {
  const sp = (id: number) => (withSp && id !== 5 && id !== 6 ? 1 : 0)
  return [
    { id: 1, familyNameEn: 'Tanyan', givenNameEn: 'Vincent', nationality: 'BY', startingPoints: sp(1) },
    { id: 2, familyNameEn: 'Iglitsky', givenNameEn: 'Eugeny', nationality: 'BY', startingPoints: sp(2) },
    { id: 3, familyNameEn: 'Lysenka', givenNameEn: 'Sergey', nationality: 'BY', startingPoints: sp(3) },
    { id: 4, familyNameEn: 'Kondratov', givenNameEn: 'Yaroslav', nationality: 'BY', startingPoints: sp(4) },
    { id: 5, familyNameEn: 'Dylevsky', givenNameEn: 'Artiom', nationality: 'BY', startingPoints: sp(5) },
    { id: 6, familyNameEn: 'Valkov', givenNameEn: 'Pavel', nationality: 'BY', startingPoints: sp(6) },
  ]
}

function mk(
  round: number,
  player1: number,
  player2: number | null,
  result: Game['result'],
  status: Game['status'],
  handicap: Game['handicap'] = null,
): Game {
  return {
    id: `g-${round}-${player1}`,
    player1,
    player2,
    sente: 'unknown',
    handicap,
    result,
    status,
    round,
  }
}

function makeGames(): Game[] {
  return [
    mk(1, 1, 3, 'player2_won', 'completed'),
    mk(1, 2, 5, 'player1_won', 'completed', '-2p'),
    mk(1, 4, 6, 'player1_won', 'completed'),
    mk(2, 3, null, 'player1_won', 'bye'),
    mk(2, 1, 6, 'player1_won', 'completed'),
    mk(2, 2, null, 'player1_won', 'bye'),
    mk(2, 4, 5, 'player1_won', 'completed'),
    mk(3, 3, 1, 'player1_won', 'completed'),
    mk(3, 2, 4, 'player1_won', 'completed'),
    mk(3, 5, 6, 'draw', 'completed', '+B'),
    mk(4, 5, null, 'player2_won', 'forfeit'),
    mk(4, 6, null, 'player2_won', 'forfeit'),
    mk(4, 1, null, 'player2_won', 'forfeit'),
    mk(4, 3, 2, 'player1_won', 'completed'),
    mk(4, 4, null, null, 'forfeit'),
  ]
}

describe('buildFesaReport', () => {
  it('builds the report with a parent event, starting points and handicaps', () => {
    const report = buildFesaReport({
      isFinished: true,
      tournamentTitleEn: 'Test tournament',
      parentEventTitleEn: 'Test event',
      settlementEn: 'Minsk',
      timeControl: { type: 'byoyomi', mainTime: 30, byoyomiTime: 60, byoyomiPeriods: 1 },
      roundDates: fesaRoundDates(
        [
          { number: 1, scheduledAt: new Date('2026-09-10T00:00:00Z'), scheduledAtLocal: D1 },
          { number: 2, scheduledAt: new Date('2026-09-13T00:00:00Z'), scheduledAtLocal: D2 },
          { number: 3, scheduledAt: new Date('2026-09-13T00:00:00Z'), scheduledAtLocal: D2 },
          { number: 4, scheduledAt: new Date('2026-09-23T00:00:00Z'), scheduledAtLocal: D4 },
        ],
        4,
      ),
      roundCount: 4,
      participants: makeParticipants(true),
      games: makeGames(),
      standings: standings(true),
    })
    expect(report).not.toBeNull()
    expect(report!.fileName).toBe('2026-09-23 Test event - Test tournament.txt')
    expect(report!.content).toBe(
      expected([
        '[Test event: Test tournament, Minsk]',
        '[2026-09-10/23]',
        '[Time control: 30min + 60sec]',
        'Nr Name Nat 1 2 3 4 MMSS Pts MMS',
        '1 [Lysenka] [Sergey] BY [4+ 0+ 4+ 2+] [1] 4 5',
        '2 [Iglitsky] [Eugeny] BY [5+(-2p) 0+ 3+ 1-] [1] 3 4',
        '3 [Kondratov] [Yaroslav] BY [6+ 5+ 2- 0-] [1] 2 3',
        '4 [Tanyan] [Vincent] BY [1- 6+ 1- 0-] [1] 1 2',
        '5 [Dylevsky] [Artiom] BY [2-(+2p) 3- 6=(+B) 0-] [0] 0.5 0.5',
        '6 [Valkov] [Pavel] BY [3- 4- 5=(-B) 0-] [0] 0.5 0.5',
      ]),
    )
  })

// Crosstable standings order (places) with points including starting points.
function standings(withSp: boolean) {
  const rows: { participantId: number; place: number; points: number }[] = [
    { participantId: 3, place: 1, points: 4 },
    { participantId: 2, place: 2, points: 3 },
    { participantId: 4, place: 3, points: 2 },
    { participantId: 1, place: 4, points: 1 },
    { participantId: 5, place: 5, points: 0.5 },
    { participantId: 6, place: 6, points: 0.5 },
  ]
  return withSp
    ? rows.map((r) => ({ ...r, points: r.points + (r.participantId !== 5 && r.participantId !== 6 ? 1 : 0) }))
    : rows
}

function expected(lines: string[]): string {
  return lines.join('\r\n')
}

const D1 = { year: 2026, month: 9, day: 10 }
const D2 = { year: 2026, month: 9, day: 13 }
const D4 = { year: 2026, month: 9, day: 23 }

  it('builds the report without a parent event and without starting points', () => {
    const report = buildFesaReport({
      isFinished: true,
      tournamentTitleEn: 'Test tournament',
      parentEventTitleEn: null,
      settlementEn: 'Minsk',
      timeControl: { type: 'fischer', mainTime: 30, increment: 5 },
      roundDates: fesaRoundDates(
        [
          { number: 1, scheduledAt: new Date('2026-09-10T00:00:00Z'), scheduledAtLocal: D1 },
          { number: 2, scheduledAt: new Date('2026-09-10T00:00:00Z'), scheduledAtLocal: D1 },
          { number: 3, scheduledAt: new Date('2026-09-10T00:00:00Z'), scheduledAtLocal: D1 },
          { number: 4, scheduledAt: new Date('2026-09-10T00:00:00Z'), scheduledAtLocal: D1 },
        ],
        4,
      ),
      roundCount: 4,
      participants: makeParticipants(false),
      games: makeGames(),
      standings: standings(false),
    })
    expect(report).not.toBeNull()
    expect(report!.fileName).toBe('2026-09-10 Test tournament.txt')
    expect(report!.content).toBe(
      expected([
        '[Test tournament, Minsk]',
        '[2026-09-10]',
        '[Time control: 30min + 5sec]',
        'Nr Name Nat 1 2 3 4 Pts',
        '1 [Lysenka] [Sergey] BY [4+ 0+ 4+ 2+] 4',
        '2 [Iglitsky] [Eugeny] BY [5+(-2p) 0+ 3+ 1-] 3',
        '3 [Kondratov] [Yaroslav] BY [6+ 5+ 2- 0-] 2',
        '4 [Tanyan] [Vincent] BY [1- 6+ 1- 0-] 1',
        '5 [Dylevsky] [Artiom] BY [2-(+2p) 3- 6=(+B) 0-] 0.5',
        '6 [Valkov] [Pavel] BY [3- 4- 5=(-B) 0-] 0.5',
      ]),
    )
  })

  it('renders a two-month date range', () => {
    const report = buildFesaReport({
      isFinished: true,
      tournamentTitleEn: 'Test tournament',
      parentEventTitleEn: null,
      settlementEn: 'Minsk',
      timeControl: { type: 'canadian', mainTime: 35, canadianTime: 20, canadianMoves: 1 },
      roundDates: fesaRoundDates(
        [
          { number: 1, scheduledAt: new Date('2026-09-10T00:00:00Z'), scheduledAtLocal: D1 },
          { number: 2, scheduledAt: new Date('2026-09-10T00:00:00Z'), scheduledAtLocal: D1 },
          { number: 3, scheduledAt: new Date('2026-09-10T00:00:00Z'), scheduledAtLocal: D1 },
          { number: 4, scheduledAt: new Date('2026-10-08T00:00:00Z'), scheduledAtLocal: { year: 2026, month: 10, day: 8 } },
        ],
        4,
      ),
      roundCount: 4,
      participants: makeParticipants(false),
      games: makeGames(),
      standings: standings(false),
    })
    expect(report).not.toBeNull()
    expect(report!.fileName).toBe('2026-10-08 Test tournament.txt')
    expect(report!.content).toContain('[2026-09-10/10-08]')
    expect(report!.content).toContain('[Time control: 35min + 20sec]')
  })

  it('returns null when the tournament is not finished', () => {
    expect(
      buildFesaReport({
        isFinished: false,
        tournamentTitleEn: 'Test tournament',
        parentEventTitleEn: null,
        settlementEn: 'Minsk',
        timeControl: { type: 'absolute', mainTime: 30 },
        roundDates: ['2026-09-10'],
        roundCount: 1,
        participants: makeParticipants(false),
        games: [],
        standings: [],
      }),
    ).toBeNull()
  })
})
