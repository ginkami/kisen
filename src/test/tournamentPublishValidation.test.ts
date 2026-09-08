import { describe, expect, it } from 'vitest'
import { validateTournamentPublishForm } from '../hooks/useTournamentForm.ts'
import type { TournamentFormState } from '../hooks/useTournamentForm.ts'
import type { ScheduleRow } from '../hooks/useTournamentForm.ts'

function makeState(part: Partial<TournamentFormState> = {}): TournamentFormState {
  return {
    slug: 'test-tournament',
    parentEvent: null,
    hostAssociation: null,
    locales: {
      ru: { title: 'Тестовый турнир', description: '' },
      en: { title: 'Test tournament', description: '' },
    },
    location: {
      latitude: 35.0,
      longitude: 139.0,
      country: 'jp',
      timeZone: null,
      locales: {
        ru: { settlement: '', venue: '' },
        en: { settlement: '', venue: '' },
      },
    },
    arbiter: {
      ru: { givenName: 'Иван', familyName: 'Иванов' },
      en: { givenName: 'Ivan', familyName: 'Ivanov' },
    },
    settings: {} as TournamentFormState['settings'],
    scheduleRows: [],
    participants: [],
    games: [],
    publishedRounds: 0,
    regulations: [],
    ...part,
  } as TournamentFormState
}

function roundRow(part: Partial<Extract<ScheduleRow, { kind: 'round' }>> = {}): ScheduleRow {
  return {
    kind: 'round',
    id: 'round-1',
    number: 1,
    scheduledAt: new Date('2026-09-10T10:00:00Z'),
    scheduledAtLocal: null,
    ...part,
  } as ScheduleRow
}

describe('validateTournamentPublishForm — schedule round times', () => {
  it('reports the rounds error when the program has no rounds', () => {
    const errors = validateTournamentPublishForm(makeState())
    expect(errors.rounds).toBe('required')
    expect(errors.roundTime).toBeUndefined()
  })

  it('reports the roundTime error when a round has no start time', () => {
    const errors = validateTournamentPublishForm(
      makeState({
        scheduleRows: [
          roundRow(),
          roundRow({ id: 'round-2', number: 2, scheduledAt: null }),
        ],
      })
    )
    expect(errors.rounds).toBeUndefined()
    expect(errors.roundTime).toBe('required')
  })

  it('reports no schedule errors when every round has a start time', () => {
    const errors = validateTournamentPublishForm(
      makeState({
        scheduleRows: [roundRow(), roundRow({ id: 'round-2', number: 2 })],
      })
    )
    expect(errors.rounds).toBeUndefined()
    expect(errors.roundTime).toBeUndefined()
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('ignores event rows without a start time', () => {
    const errors = validateTournamentPublishForm(
      makeState({
        scheduleRows: [
          roundRow(),
          {
            kind: 'event',
            id: 'event-1',
            scheduledAt: null,
            scheduledAtLocal: null,
            locales: {
              ru: { title: 'Открытие' },
              en: { title: 'Opening' },
            },
          },
        ],
      })
    )
    expect(errors.rounds).toBeUndefined()
    expect(errors.roundTime).toBeUndefined()
  })
})