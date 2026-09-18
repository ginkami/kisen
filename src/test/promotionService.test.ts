import { beforeEach, describe, expect, it, vi } from 'vitest'

const getDocsMock = vi.hoisted(() => vi.fn())
const whereMock = vi.hoisted(() => vi.fn())
const writeBatchMock = vi.hoisted(() => vi.fn())
const batchDeleteMock = vi.hoisted(() => vi.fn())
const batchCommitMock = vi.hoisted(() => vi.fn())

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: getDocsMock,
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: whereMock,
  writeBatch: writeBatchMock,
  Timestamp: class {
    seconds: number
    nanoseconds: number
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds
      this.nanoseconds = nanoseconds
    }
    toDate() {
      return new Date(this.seconds * 1000)
    }
    static fromDate(d: Date) {
      return { seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 }
    }
  },
}))

vi.mock('../services/firebaseConfig.ts', () => ({
  db: {},
}))

import {
  listAllPromotions,
  listPromotionsByTournament,
  deletePromotionsByTournament,
} from '../services/promotionService.ts'

const TOURNAMENT_ID = '01234567-89ab-4def-8123-456789abcdef'
const PROMOTION_ID = '76543210-abcd-4def-9123-456789abcdef'

function promotionDoc(fields: {
  startedAt: unknown
  endedAt: unknown
}): { ref: { id: string }; data: () => Record<string, unknown> } {
  return {
    ref: { id: PROMOTION_ID },
    data: () => ({
      id: PROMOTION_ID,
      tournament: TOURNAMENT_ID,
      showOnHome: true,
      ...fields,
    }),
  }
}

beforeEach(() => {
  getDocsMock.mockReset()
  getDocsMock.mockResolvedValue({ empty: true, docs: [] })
  whereMock.mockClear()
  writeBatchMock.mockReset()
  batchDeleteMock.mockReset()
  batchCommitMock.mockReset()
  writeBatchMock.mockReturnValue({ delete: batchDeleteMock, commit: batchCommitMock })
  batchCommitMock.mockResolvedValue(undefined)
})

describe('document reading', () => {
  it('parses a document with Timestamp-like date fields (regression: double conversion)', async () => {
    // Plain { seconds, nanoseconds } — as after a structured clone in IndexedDB.
    getDocsMock.mockResolvedValue({
      empty: false,
      docs: [
        promotionDoc({
          startedAt: { seconds: 1767225600, nanoseconds: 0 },
          endedAt: { seconds: 1767830400, nanoseconds: 0 },
        }),
      ],
    })

    const promotions = await listAllPromotions()

    expect(promotions).toHaveLength(1)
    const promotion = promotions[0]
    expect(promotion.id).toBe(PROMOTION_ID)
    expect(promotion.tournament).toBe(TOURNAMENT_ID)
    expect(promotion.showOnHome).toBe(true)
    expect(promotion.startedAt).toBeInstanceOf(Date)
    expect(promotion.startedAt.toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(promotion.endedAt).toBeInstanceOf(Date)
    expect(promotion.endedAt.toISOString()).toBe('2026-01-08T00:00:00.000Z')
  })

  it('parses a document whose date fields are already native Dates', async () => {
    getDocsMock.mockResolvedValue({
      empty: false,
      docs: [
        promotionDoc({
          startedAt: new Date('2026-06-10T00:00:00Z'),
          endedAt: new Date('2026-06-20T00:00:00Z'),
        }),
      ],
    })

    const promotions = await listAllPromotions()

    expect(promotions).toHaveLength(1)
    expect(promotions[0].startedAt.toISOString()).toBe('2026-06-10T00:00:00.000Z')
    expect(promotions[0].endedAt.toISOString()).toBe('2026-06-20T00:00:00.000Z')
  })

  it('lists only the promotions of the requested tournament', async () => {
    getDocsMock.mockImplementation(() =>
      Promise.resolve({
        empty: false,
        docs: [
          promotionDoc({
            startedAt: new Date('2026-06-10T00:00:00Z'),
            endedAt: new Date('2026-06-20T00:00:00Z'),
          }),
          {
            ref: { id: 'other-promotion' },
            data: () => ({
              id: 'f0e0d0c0-b0a0-4999-8888-777766665555',
              tournament: '99999999-aaaa-4bbb-8ccc-ddddeeeeffff',
              showOnHome: true,
              startedAt: new Date('2026-06-10T00:00:00Z'),
              endedAt: new Date('2026-06-20T00:00:00Z'),
            }),
          },
        ],
      }),
    )

    const promotions = await listPromotionsByTournament(TOURNAMENT_ID)

    expect(promotions).toHaveLength(1)
    expect(promotions[0].tournament).toBe(TOURNAMENT_ID)
  })
})

describe('deletePromotionsByTournament', () => {
  it('does nothing when the tournament has no promotions', async () => {
    await deletePromotionsByTournament('tournament-1')

    expect(batchCommitMock).not.toHaveBeenCalled()
  })

  it('deletes every promotion document of the tournament in one batch', async () => {
    const refA = { id: 'promo-a' }
    const refB = { id: 'promo-b' }
    getDocsMock.mockResolvedValue({
      empty: false,
      docs: [{ ref: refA }, { ref: refB }],
    })

    await deletePromotionsByTournament('tournament-1')

    expect(writeBatchMock).toHaveBeenCalledTimes(1)
    expect(batchDeleteMock).toHaveBeenCalledTimes(2)
    expect(batchDeleteMock).toHaveBeenNthCalledWith(1, refA)
    expect(batchDeleteMock).toHaveBeenNthCalledWith(2, refB)
    expect(batchCommitMock).toHaveBeenCalledTimes(1)
  })

  it('propagates a failed batch commit', async () => {
    getDocsMock.mockResolvedValue({
      empty: false,
      docs: [{ ref: { id: 'promo-a' } }],
    })
    batchCommitMock.mockRejectedValue(new Error('commit failed'))

    await expect(deletePromotionsByTournament('tournament-1')).rejects.toThrow('commit failed')
  })
})
