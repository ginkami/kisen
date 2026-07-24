import type { TournamentRepository } from './repository.ts'
import type { Tournament } from '../domain/tournament.ts'

vi.mock('./firestoreTournamentRepository.ts', () => ({
  firestoreTournamentRepository: {},
}))

import { TournamentService } from './tournamentService.ts'

function createMockRepository(): TournamentRepository {
  return {
    getBySlug: vi.fn().mockResolvedValue(null),
    getById: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn((tournament: Tournament) => Promise.resolve(tournament)),
    update: vi.fn((tournament: Tournament) => Promise.resolve(tournament)),
    delete: vi.fn().mockResolvedValue(undefined),
    slugExists: vi.fn().mockResolvedValue(false),
  }
}

describe('TournamentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as Response))
  })

  describe('createDraft', () => {
    it('initializes time control to byoyomi by default', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)

      const created = await service.createDraft({
        createdBy: 'user-1',
        arbiter: {
          locales: {
            ru: { givenName: 'Ivan', familyName: 'Ivanov' },
            en: { givenName: 'Ivan', familyName: 'Ivanov' },
          },
        },
      })

      expect(created.settings.timeControl.type).toBe('byoyomi')
      expect(created.settings.timeControl).toMatchObject({
        type: 'byoyomi',
        mainTime: 0,
        byoyomiTime: 0,
        byoyomiPeriods: 1,
      })
    })

    it('initializes tie-breaks to points, buchholz, sonneborn_berger', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)

      const created = await service.createDraft({
        createdBy: 'user-1',
        arbiter: {
          locales: {
            ru: { givenName: 'Ivan', familyName: 'Ivanov' },
            en: { givenName: 'Ivan', familyName: 'Ivanov' },
          },
        },
      })

      expect(created.settings.tieBreaks).toHaveLength(3)
      expect(created.settings.tieBreaks[0].type).toBe('points')
      expect(created.settings.tieBreaks[1].type).toBe('buchholz')
      expect(created.settings.tieBreaks[2].type).toBe('sonneborn_berger')
    })

    it('creates a tournament with draft status and isPublic false', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)

      const created = await service.createDraft({
        createdBy: 'user-1',
        arbiter: {
          locales: {
            ru: { givenName: 'Ivan', familyName: 'Ivanov' },
            en: { givenName: 'Ivan', familyName: 'Ivanov' },
          },
        },
      })

      expect(created.status).toBe('draft')
      expect(created.isPublic).toBe(false)
    })

    it('calls repository.create with the tournament', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)

      await service.createDraft({
        createdBy: 'user-1',
        arbiter: {
          locales: {
            ru: { givenName: 'Ivan', familyName: 'Ivanov' },
            en: { givenName: 'Ivan', familyName: 'Ivanov' },
          },
        },
      })

      expect(repo.create).toHaveBeenCalledTimes(1)
      const tournament = vi.mocked(repo.create).mock.calls[0][0] as Tournament
      expect(tournament.settings.timeControl.type).toBe('byoyomi')
      expect(tournament.settings.tieBreaks).toHaveLength(3)
    })
  })
})