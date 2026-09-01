import { remapLegacyRounds } from '../services/firestoreTournamentRepository.ts'

describe('remapLegacyRounds', () => {
  it('migrates a legacy document with currentRound and zero publishedRounds', () => {
    const doc = { slug: 't1', publishedRounds: 0, currentRound: 3, status: 'ongoing' }
    const result = remapLegacyRounds(doc) as Record<string, unknown>
    expect(result.publishedRounds).toBe(3)
    expect(result).not.toHaveProperty('currentRound')
    expect(result.slug).toBe('t1')
    expect(result.status).toBe('ongoing')
  })

  it('falls back to currentRound when publishedRounds is missing', () => {
    const result = remapLegacyRounds({ slug: 't2', currentRound: 5 })
    expect(result.publishedRounds).toBe(5)
    expect(result).not.toHaveProperty('currentRound')
  })

  it('keeps a non-zero publishedRounds over the legacy currentRound', () => {
    const result = remapLegacyRounds({ slug: 't3', publishedRounds: 2, currentRound: 3 })
    expect(result.publishedRounds).toBe(2)
    expect(result).not.toHaveProperty('currentRound')
  })

  it('leaves new documents without currentRound untouched', () => {
    const doc = { slug: 't4', publishedRounds: 2, status: 'upcoming' }
    expect(remapLegacyRounds(doc)).toBe(doc)
  })

  it('leaves documents without any rounds fields untouched', () => {
    const doc = { slug: 't5', status: 'draft' }
    expect(remapLegacyRounds(doc)).toBe(doc)
  })
})
