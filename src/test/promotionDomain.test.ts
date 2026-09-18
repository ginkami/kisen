import { describe, expect, it } from 'vitest'
import {
  comparePromotions,
  promotionSchema,
  promotionStatus,
  type Promotion,
} from '../domain/promotion'

const date = (iso: string) => new Date(iso)

const makePromotion = (overrides: Partial<Promotion> = {}): Promotion =>
  promotionSchema.parse({
    id: '01234567-89ab-8def-9123-456789abcdef',
    tournament: '76543210-89ab-4def-8123-456789abcdef',
    showOnHome: false,
    startedAt: date('2026-01-10T00:00:00Z'),
    endedAt: date('2026-01-20T00:00:00Z'),
    ...overrides,
  })

describe('promotionSchema', () => {
  it('applies the showOnHome default', () => {
    const promotion = makePromotion({ showOnHome: undefined as unknown as boolean })
    expect(promotion.showOnHome).toBe(false)
  })

  it('keeps showOnHome when provided', () => {
    const promotion = makePromotion({ showOnHome: true })
    expect(promotion.showOnHome).toBe(true)
  })

  it('rejects a promotion without a tournament', () => {
    expect(() =>
      promotionSchema.parse({
        id: '01234567-89ab-8def-9123-456789abcdef',
        startedAt: date('2026-01-10T00:00:00Z'),
        endedAt: date('2026-01-20T00:00:00Z'),
      }),
    ).toThrow()
  })
})

describe('promotionStatus', () => {
  const startedAt = date('2026-01-10T12:00:00Z')
  const endedAt = date('2026-01-20T12:00:00Z')

  it('reports notStarted before the window', () => {
    expect(promotionStatus(startedAt, endedAt, date('2026-01-10T11:59:59Z'))).toBe('notStarted')
  })

  it('reports active within the window', () => {
    expect(promotionStatus(startedAt, endedAt, date('2026-01-15T00:00:00Z'))).toBe('active')
    expect(promotionStatus(startedAt, endedAt, startedAt)).toBe('active')
  })

  it('reports finished after the window', () => {
    expect(promotionStatus(startedAt, endedAt, date('2026-01-20T12:00:01Z'))).toBe('finished')
  })

  it('treats the end boundary as finished', () => {
    expect(promotionStatus(startedAt, endedAt, endedAt)).toBe('finished')
  })
})

describe('comparePromotions', () => {
  const now = date('2026-06-15T00:00:00Z')
  const active = { startedAt: date('2026-06-10T00:00:00Z'), endedAt: date('2026-06-20T00:00:00Z') }
  const activeLater = {
    startedAt: date('2026-06-12T00:00:00Z'),
    endedAt: date('2026-06-25T00:00:00Z'),
  }
  const upcoming = {
    startedAt: date('2026-06-18T00:00:00Z'),
    endedAt: date('2026-06-30T00:00:00Z'),
  }
  const upcomingNearest = {
    startedAt: date('2026-06-16T00:00:00Z'),
    endedAt: date('2026-07-01T00:00:00Z'),
  }
  const finished = {
    startedAt: date('2026-05-01T00:00:00Z'),
    endedAt: date('2026-06-01T00:00:00Z'),
  }
  const finishedLaterEnd = {
    startedAt: date('2026-04-01T00:00:00Z'),
    endedAt: date('2026-06-05T00:00:00Z'),
  }

  it('ranks active before upcoming before finished', () => {
    const sorted = [finished, upcoming, active].sort((a, b) => comparePromotions(a, b, now))
    expect(sorted[0]).toBe(active)
    expect(sorted[1]).toBe(upcoming)
    expect(sorted[2]).toBe(finished)
  })

  it('orders active promotions by the latest start first', () => {
    expect(comparePromotions(activeLater, active, now)).toBeLessThan(0)
    expect(comparePromotions(active, activeLater, now)).toBeGreaterThan(0)
  })

  it('orders upcoming promotions by the nearest start first', () => {
    expect(comparePromotions(upcomingNearest, upcoming, now)).toBeLessThan(0)
    expect(comparePromotions(upcoming, upcomingNearest, now)).toBeGreaterThan(0)
  })

  it('orders finished promotions by the latest end first', () => {
    expect(comparePromotions(finishedLaterEnd, finished, now)).toBeLessThan(0)
    expect(comparePromotions(finished, finishedLaterEnd, now)).toBeGreaterThan(0)
  })

  it('sorts a mixed list deterministically', () => {
    const sorted = [finishedLaterEnd, upcomingNearest, active, finished, upcoming, activeLater].sort(
      (a, b) => comparePromotions(a, b, now),
    )
    expect(sorted).toEqual([activeLater, active, upcomingNearest, upcoming, finishedLaterEnd, finished])
  })
})
