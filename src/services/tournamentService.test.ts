import type { TournamentRepository } from './repository.ts'
import type { Tournament } from '../domain/tournament.ts'
import { TournamentConflictError } from '../domain/tournament.ts'

vi.mock('./firestoreTournamentRepository.ts', () => ({
  firestoreTournamentRepository: {},
}))

vi.mock('./promotionService.ts', () => ({
  deletePromotionsByTournament: vi.fn().mockResolvedValue(undefined),
}))

import { deletePromotionsByTournament } from './promotionService.ts'
import { TournamentService } from './tournamentService.ts'

function createMockRepository(): TournamentRepository {
  return {
    getBySlug: vi.fn().mockResolvedValue(null),
    getById: vi.fn().mockResolvedValue(null),
    getByIds: vi.fn().mockResolvedValue([]),
    subscribeToTournament: vi.fn(() => () => {}),
    announceEditingSession: vi.fn().mockResolvedValue(undefined),
    removeEditingSession: vi.fn().mockResolvedValue(undefined),
    subscribeToEditingSessions: vi.fn(() => () => {}),
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn((tournament: Tournament) => Promise.resolve(tournament)),
    update: vi.fn((tournament: Tournament) => Promise.resolve(tournament)),
    updateMany: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    slugExists: vi.fn().mockResolvedValue(false),
    searchByTitle: vi.fn().mockResolvedValue([]),
    listPublishedTournaments: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
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

      expect(created.settings.tieBreaks).toHaveLength(4)
      expect(created.settings.tieBreaks[0].type).toBe('points')
      expect(created.settings.tieBreaks[1].type).toBe('buchholz')
      expect(created.settings.tieBreaks[2].type).toBe('sonneborn_berger')
      expect(created.settings.tieBreaks[3].type).toBe('buchholz_sum')
    })

    it('passes the loaded revision and propagates conflict errors', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)
      const existing = {
        id: 't-1',
        revision: 7,
        slug: 't',
        createdBy: 'user-1',
        hostAssociation: null,
        parentEvent: null,
        status: 'draft',
        isPublic: false,
        publishedRounds: 0,
        startYearMonth: '202609',
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        locales: { ru: { title: 'T' }, en: { title: 'T' } },
        location: { country: 'jp', locales: { ru: { settlement: '' }, en: { settlement: '' } } },
        arbiter: { locales: { ru: { givenName: '', familyName: '' }, en: { givenName: '', familyName: '' } } },
        settings: { considerSente: false, tieBreaks: [{ type: 'points' }] },
        schedule: { events: [], rounds: [] },
        participants: [],
        games: [],
        regulations: [],
      } as unknown as Tournament
      vi.mocked(repo.getById).mockResolvedValue(existing)
      vi.mocked(repo.update).mockRejectedValue(new TournamentConflictError(8))

      await expect(service.update({ id: 't-1', existing })).rejects.toThrow(
        TournamentConflictError,
      )
      // The document handed to the repository carries the loaded revision.
      expect(vi.mocked(repo.update).mock.calls[0][0]).toMatchObject({ revision: 7 })
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
      expect(tournament.settings.tieBreaks).toHaveLength(4)
    })
  })

  describe('update isPublic', () => {
    function makeExisting(overrides: Partial<Tournament> = {}): Tournament {
      return {
        id: 't-1',
        slug: 't',
        createdBy: 'user-1',
        hostAssociation: null,
        parentEvent: null,
        status: 'draft',
        isPublic: false,
        publishedRounds: 0,
        revision: 3,
        startYearMonth: '202609',
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        locales: { ru: { title: 'T' }, en: { title: 'T' } },
        location: { country: 'jp', locales: { ru: { settlement: '' }, en: { settlement: '' } } },
        arbiter: { locales: { ru: { givenName: '', familyName: '' }, en: { givenName: '', familyName: '' } } },
        settings: { considerSente: false, tieBreaks: [{ type: 'points' }] },
        schedule: { events: [], rounds: [] },
        participants: [],
        games: [],
        regulations: [],
        ...overrides,
      } as Tournament
    }

    it('keeps isPublic true for a draft tournament when explicitly set', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)
      const existing = makeExisting({ status: 'draft', isPublic: false })
      vi.mocked(repo.getById).mockResolvedValue(existing)

      await service.update({ id: 't-1', isPublic: true, existing })

      const saved = vi.mocked(repo.update).mock.calls[0][0] as Tournament
      expect(saved.status).toBe('draft')
      expect(saved.isPublic).toBe(true)
    })

    it('keeps the stored isPublic when the update does not provide one', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)
      const existing = makeExisting({ status: 'upcoming', isPublic: false })
      vi.mocked(repo.getById).mockResolvedValue(existing)

      await service.update({ id: 't-1', existing })

      const saved = vi.mocked(repo.update).mock.calls[0][0] as Tournament
      expect(saved.status).toBe('upcoming')
      expect(saved.isPublic).toBe(false)
    })

    it('unpublish sets isPublic false without changing the status', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)
      // publishedRounds: 1 keeps the data-driven status at 'ongoing' (an
      // ongoing tournament without any published data rolls back to
      // 'upcoming' by the documented lifecycle rules).
      const existing = makeExisting({ status: 'ongoing', isPublic: true, publishedRounds: 1 })
      vi.mocked(repo.getById).mockResolvedValue(existing)

      await service.unpublish('t-1', existing)

      const saved = vi.mocked(repo.update).mock.calls[0][0] as Tournament
      expect(saved.isPublic).toBe(false)
      expect(saved.status).toBe('ongoing')
    })

    it('publish sets isPublic true', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)
      const existing = makeExisting({ status: 'draft', isPublic: false })
      vi.mocked(repo.getById).mockResolvedValue(existing)

      await service.publish('t-1', existing)

      const saved = vi.mocked(repo.update).mock.calls[0][0] as Tournament
      expect(saved.isPublic).toBe(true)
      expect(saved.status).toBe('upcoming')
    })
  })

  describe('delete', () => {
    it('cascades: deletes all promotions of the tournament', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)
      vi.mocked(repo.getById).mockResolvedValue({ id: 't-1' } as Tournament)
      const cascadeMock = vi.mocked(deletePromotionsByTournament)

      await service.delete('t-1')

      expect(repo.delete).toHaveBeenCalledWith('t-1')
      expect(cascadeMock).toHaveBeenCalledWith('t-1')
    })

    it('does not fail the deletion when the promotion cascade fails', async () => {
      const repo = createMockRepository()
      const service = new TournamentService(repo)
      vi.mocked(repo.getById).mockResolvedValue({ id: 't-1' } as Tournament)
      vi.mocked(deletePromotionsByTournament).mockRejectedValue(
        new Error('cascade failed'),
      )
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(service.delete('t-1')).resolves.toBeUndefined()
      expect(repo.delete).toHaveBeenCalledWith('t-1')

      warnSpy.mockRestore()
      vi.mocked(deletePromotionsByTournament).mockResolvedValue(undefined)
    })
  })
})
