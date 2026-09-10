import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  queryConstraints: [] as unknown[],
  getDocsDocs: [] as Array<{ id: string; data: () => Record<string, unknown> }>,
}))

const FakeTimestamp = vi.hoisted(
  () =>
    class FakeTimestamp {
      seconds: number
      nanoseconds: number
      constructor(seconds: number, nanoseconds: number) {
        this.seconds = seconds
        this.nanoseconds = nanoseconds
      }
      toDate(): Date {
        return new Date(this.seconds * 1000)
      }
      static fromDate(d: Date): FakeTimestamp {
        return new FakeTimestamp(Math.floor(d.getTime() / 1000), 0)
      }
    }
)

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ __collection: true })),
  doc: vi.fn(() => ({ __doc: true })),
  getDoc: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: state.getDocsDocs })),
  setDoc: vi.fn(),
  writeBatch: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn((_source: unknown, ...constraints: unknown[]) => {
    state.queryConstraints = constraints
    return { __query: true }
  }),
  where: vi.fn((field: string, op: string, value: unknown) => ({
    __where: { field, op, value },
  })),
  orderBy: vi.fn((field: string, direction?: string) => ({
    __orderBy: { field, direction: direction ?? 'asc' },
  })),
  limit: vi.fn((n: number) => ({ __limit: n })),
  startAfter: vi.fn((...args: unknown[]) => ({ __startAfter: args })),
  Timestamp: FakeTimestamp,
}))

vi.mock('../services/firebaseConfig.ts', () => ({
  db: {},
  auth: {},
}))

import { firestoreTournamentRepository } from '../services/firestoreTournamentRepository.ts'
import type { Tournament } from '../domain/tournament.ts'

function docSnap(id: string, data: Record<string, unknown>) {
  return { id, data: () => data }
}

function makeDocData(status: string) {
  const start = new Date('2026-07-01T00:00:00Z')
  return {
    slug: 't-1',
    status,
    isPublic: true,
    startAt: { toDate: () => start },
    locales: { ru: { title: 'Tournament' } },
    location: { country: 'JP', locales: { ru: { settlement: 'Tokyo' } } },
    settings: {
      timeControl: { type: 'byoyomi', mainTime: 30, byoyomiTime: 60, byoyomiPeriods: 1 },
      tieBreaks: [],
      considerSente: false,
    },
    schedule: {
      rounds: [{ number: 1, scheduledAt: { toDate: () => start } }],
      events: [],
    },
    participants: [],
    games: [],
  }
}

beforeEach(() => {
  state.queryConstraints = []
  state.getDocsDocs = []
})

describe('listPublishedTournaments', () => {
  it('builds composite-index constraints for an ascending section', async () => {
    state.getDocsDocs = [docSnap('t1', makeDocData('upcoming'))]

    const result = await firestoreTournamentRepository.listPublishedTournaments({
      status: 'upcoming',
      pageSize: 30,
    })

    const wheres = state.queryConstraints.filter(
      (c) => typeof c === 'object' && c !== null && '__where' in c
    ) as Array<{ __where: { field: string; op: string; value: unknown } }>
    expect(wheres).toEqual([
      { __where: { field: 'isPublic', op: '==', value: true } },
      { __where: { field: 'status', op: '==', value: 'upcoming' } },
    ])

    const order = state.queryConstraints.find(
      (c) => typeof c === 'object' && c !== null && '__orderBy' in c
    ) as { __orderBy: { field: string; direction: string } }
    expect(order.__orderBy).toEqual({ field: 'startAt', direction: 'asc' })

    const lim = state.queryConstraints.find(
      (c) => typeof c === 'object' && c !== null && '__limit' in c
    ) as { __limit: number }
    expect(lim.__limit).toBe(30)

    expect(result.items).toHaveLength(1)
    // A single document is not a full page of 30, so the cursor is null.
    expect(result.nextCursor).toBeNull()
  })

  it('orders finished tournaments descending and applies cursor', async () => {
    state.getDocsDocs = [docSnap('t1', makeDocData('finished'))]
    const cursor = { __cursorDoc: true } as never

    await firestoreTournamentRepository.listPublishedTournaments({
      status: 'finished',
      pageSize: 30,
      cursor,
    })

    const order = state.queryConstraints.find(
      (c) => typeof c === 'object' && c !== null && '__orderBy' in c
    ) as { __orderBy: { direction: string } }
    expect(order.__orderBy.direction).toBe('desc')

    const after = state.queryConstraints.find(
      (c) => typeof c === 'object' && c !== null && '__startAfter' in c
    ) as { __startAfter: unknown[] }
    expect(after.__startAfter).toEqual([cursor])
  })

  it('adds country and startAt range constraints when filters provided', async () => {
    state.getDocsDocs = []
    const startFrom = new Date('2026-01-01T00:00:00Z')
    const startTo = new Date('2026-12-31T23:59:59Z')

    await firestoreTournamentRepository.listPublishedTournaments({
      status: 'ongoing',
      country: 'JP',
      startFrom,
      startTo,
      pageSize: 30,
    })

    const wheres = state.queryConstraints.filter(
      (c) => typeof c === 'object' && c !== null && '__where' in c
    ) as Array<{ __where: { field: string; op: string; value: unknown } }>
    expect(wheres).toEqual([
      { __where: { field: 'isPublic', op: '==', value: true } },
      { __where: { field: 'status', op: '==', value: 'ongoing' } },
      { __where: { field: 'location.country', op: '==', value: 'JP' } },
      { __where: { field: 'startAt', op: '>=', value: startFrom } },
      { __where: { field: 'startAt', op: '<=', value: startTo } },
    ])
  })

  it('returns a cursor when the page is full', async () => {
    state.getDocsDocs = [docSnap('t1', makeDocData('upcoming'))]

    const result = await firestoreTournamentRepository.listPublishedTournaments({
      status: 'upcoming',
      pageSize: 1,
    })

    expect(result.nextCursor).not.toBeNull()
  })

  it('returns a null cursor for a short page and maps startAt to a Date', async () => {
    state.getDocsDocs = [docSnap('t1', makeDocData('upcoming'))]

    const result = await firestoreTournamentRepository.listPublishedTournaments({
      status: 'upcoming',
      pageSize: 30,
    })

    expect(result.nextCursor).toBeNull()
    const item = result.items[0] as Tournament
    expect(item.startAt).toEqual(new Date('2026-07-01T00:00:00Z'))
    expect(item.status).toBe('upcoming')
  })
})
