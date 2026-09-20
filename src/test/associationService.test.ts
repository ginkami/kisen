import { describe, expect, it, vi, beforeEach } from 'vitest'
import type {
  EventRepository,
  PlayerRepository,
  RegulationRepository,
  TournamentRepository,
} from '../services/repository.ts'
import type { Tournament } from '../domain/tournament.ts'
import type { Event } from '../domain/event.ts'
import type { Player } from '../domain/player.ts'
import type { Regulation } from '../domain/regulation.ts'
import type { FirestoreAssociationRepository } from '../services/firestoreAssociationRepository.ts'

vi.mock('../services/firestoreAssociationRepository.ts', () => ({
  firestoreAssociationRepository: {},
}))
vi.mock('../services/firestoreTournamentRepository.ts', () => ({
  firestoreTournamentRepository: {},
}))
vi.mock('../services/firestoreEventRepository.ts', () => ({
  firestoreEventRepository: {},
}))
vi.mock('../services/firestorePlayerRepository.ts', () => ({
  firestorePlayerRepository: {},
}))
vi.mock('../services/firestoreRegulationRepository.ts', () => ({
  firestoreRegulationRepository: {},
}))

import { AssociationService } from '../services/associationService.ts'

const ASSOCIATION_ID = '00000000-0000-7000-8000-00000000a000'
const OTHER_ASSOCIATION_ID = '00000000-0000-7000-8000-00000000b000'

const uuid = (n: number) =>
  `00000000-0000-7000-8000-0000000000${String(n).padStart(2, '0')}`

function makePlayer(part: Partial<Player>): Player {
  return {
    id: uuid(1),
    createdBy: 'user-1',
    locales: {
      ru: { familyName: 'Иванов', givenName: 'Иван' },
    },
    nationality: 'RU',
    gender: null,
    currentRating: { value: null, rank: null },
    birthDate: null,
    primaryAssociation: null,
    secondaryAssociations: [],
    ...part,
  }
}

function makeEvent(part: Partial<Event>): Event {
  return {
    id: uuid(1),
    slug: 'test-event',
    createdBy: 'user-1',
    hostAssociation: null,
    regulations: [],
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    startYearMonth: '202601',
    locales: { ru: { title: 'Событие' } },
    ...part,
  }
}

function makeRegulation(part: Partial<Regulation>): Regulation {
  return {
    id: uuid(1),
    createdBy: 'user-1',
    association: null,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    locales: { ru: { title: 'Регламент' } },
    ...part,
  }
}

interface DeleteTestSetup {
  service: AssociationService
  tournamentRepository: TournamentRepository
  eventRepository: EventRepository
  playerRepository: PlayerRepository
  regulationRepository: RegulationRepository
  associationRepository: FirestoreAssociationRepository
}

function createService(
  linked: {
    tournaments?: Tournament[]
    events?: Event[]
    playersByPrimary?: Player[]
    playersBySecondary?: Player[]
    regulations?: Regulation[]
  } = {}
): DeleteTestSetup {
  const tournamentRepository: TournamentRepository = {
    getBySlug: vi.fn(),
    getById: vi.fn(),
    getByIds: vi.fn().mockResolvedValue([]),
    subscribeToTournament: vi.fn(() => () => {}),
    announceEditingSession: vi.fn().mockResolvedValue(undefined),
    removeEditingSession: vi.fn().mockResolvedValue(undefined),
    subscribeToEditingSessions: vi.fn(() => () => {}),
    listPublishedTournaments: vi.fn(),
    list: vi.fn().mockResolvedValue(linked.tournaments ?? []),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    slugExists: vi.fn(),
    searchByTitle: vi.fn(),
  }
  const eventRepository: EventRepository = {
    getById: vi.fn(),
    getByIds: vi.fn(),
    getBySlug: vi.fn(),
    list: vi.fn().mockResolvedValue(linked.events ?? []),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    slugExists: vi.fn(),
    searchByTitle: vi.fn(),
  }
  const playerRepository: PlayerRepository = {
    getById: vi.fn(),
    listAll: vi.fn(),
    list: vi.fn((filters?: { primaryAssociation?: string; secondaryAssociations?: string }) => {
      if (filters?.primaryAssociation) {
        return Promise.resolve(linked.playersByPrimary ?? [])
      }
      if (filters?.secondaryAssociations) {
        return Promise.resolve(linked.playersBySecondary ?? [])
      }
      return Promise.resolve([])
    }),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    searchByFamilyName: vi.fn(),
  }
  const regulationRepository: RegulationRepository = {
    getById: vi.fn(),
    list: vi.fn().mockResolvedValue(linked.regulations ?? []),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
  }
  const associationRepository = {
    getById: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as FirestoreAssociationRepository

  const service = new AssociationService(
    associationRepository,
    tournamentRepository,
    eventRepository,
    playerRepository,
    regulationRepository
  )

  return {
    service,
    tournamentRepository,
    eventRepository,
    playerRepository,
    regulationRepository,
    associationRepository,
  }
}

describe('AssociationService.delete cascade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears hostAssociation on linked tournaments and events', async () => {
    const tournament = {
      id: uuid(1),
      hostAssociation: ASSOCIATION_ID,
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    } as Tournament
    const event = makeEvent({ id: uuid(2), hostAssociation: ASSOCIATION_ID })
    const { service, tournamentRepository, eventRepository } = createService({
      tournaments: [tournament],
      events: [event],
    })

    await service.delete(ASSOCIATION_ID)

    expect(tournamentRepository.updateMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: tournament.id, hostAssociation: null }),
    ])
    const savedTournament = vi.mocked(tournamentRepository.updateMany).mock
      .calls[0][0][0]
    expect(savedTournament.updatedAt.getTime()).toBeGreaterThan(
      new Date('2026-01-01T00:00:00Z').getTime()
    )
    expect(eventRepository.updateMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: event.id, hostAssociation: null }),
    ])
  })

  it('clears primaryAssociation on players with the deleted id', async () => {
    const player = makePlayer({
      primaryAssociation: ASSOCIATION_ID,
      secondaryAssociations: [OTHER_ASSOCIATION_ID],
    })
    const { service, playerRepository } = createService({
      playersByPrimary: [player],
    })

    await service.delete(ASSOCIATION_ID)

    expect(playerRepository.updateMany).toHaveBeenCalledWith([
      expect.objectContaining({
        id: player.id,
        primaryAssociation: null,
        secondaryAssociations: [OTHER_ASSOCIATION_ID],
      }),
    ])
  })

  it('removes the deleted id from players.secondaryAssociations', async () => {
    const player = makePlayer({
      primaryAssociation: OTHER_ASSOCIATION_ID,
      secondaryAssociations: [ASSOCIATION_ID, OTHER_ASSOCIATION_ID],
    })
    const { service, playerRepository } = createService({
      playersBySecondary: [player],
    })

    await service.delete(ASSOCIATION_ID)

    expect(playerRepository.updateMany).toHaveBeenCalledWith([
      expect.objectContaining({
        id: player.id,
        primaryAssociation: OTHER_ASSOCIATION_ID,
        secondaryAssociations: [OTHER_ASSOCIATION_ID],
      }),
    ])
  })

  it('merges players found by primary and secondary filters (dedup by id)', async () => {
    const player = makePlayer({
      primaryAssociation: ASSOCIATION_ID,
      secondaryAssociations: [ASSOCIATION_ID],
    })
    const { service, playerRepository } = createService({
      playersByPrimary: [player],
      playersBySecondary: [player],
    })

    await service.delete(ASSOCIATION_ID)

    expect(playerRepository.updateMany).toHaveBeenCalledTimes(1)
    expect(playerRepository.updateMany).toHaveBeenCalledWith([
      expect.objectContaining({
        id: player.id,
        primaryAssociation: null,
        secondaryAssociations: [],
      }),
    ])
  })

  it('clears association on linked regulations', async () => {
    const regulation = makeRegulation({ id: uuid(3), association: ASSOCIATION_ID })
    const { service, regulationRepository } = createService({
      regulations: [regulation],
    })

    await service.delete(ASSOCIATION_ID)

    expect(regulationRepository.updateMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: regulation.id, association: null }),
    ])
  })

describe('AssociationService.delete ordering and idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates players through playerSchema before writing', async () => {
    const player = makePlayer({ nationality: 'RUS' }) // must be a 2-letter code
    const { service, playerRepository, associationRepository } = createService({
      playersByPrimary: [player],
    })

    await expect(service.delete(ASSOCIATION_ID)).rejects.toThrow()
    expect(playerRepository.updateMany).not.toHaveBeenCalled()
    // The association document must remain intact when a cleanup fails
    expect(associationRepository.delete).not.toHaveBeenCalled()
  })

  it('deletes the association document only after all cleanups succeed', async () => {
    const tournament = {
      id: uuid(1),
      hostAssociation: ASSOCIATION_ID,
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    } as Tournament
    const regulation = makeRegulation({ id: uuid(3), association: ASSOCIATION_ID })
    const {
      service,
      tournamentRepository,
      regulationRepository,
      associationRepository,
    } = createService({
      tournaments: [tournament],
      regulations: [regulation],
    })

    const order: string[] = []
    vi.mocked(tournamentRepository.updateMany).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      order.push('tournaments')
    })
    vi.mocked(regulationRepository.updateMany).mockImplementation(async () => {
      order.push('regulations')
    })
    vi.mocked(associationRepository.delete).mockImplementation(async () => {
      order.push('delete-association')
      return undefined
    })

    await service.delete(ASSOCIATION_ID)

    expect(order.indexOf('delete-association')).toBe(order.length - 1)
    expect(order).toContain('tournaments')
    expect(order).toContain('regulations')
  })

  it('skips updateMany for collections without linked documents', async () => {
    const {
      service,
      tournamentRepository,
      eventRepository,
      playerRepository,
      regulationRepository,
    } = createService()

    await service.delete(ASSOCIATION_ID)

    expect(tournamentRepository.updateMany).not.toHaveBeenCalled()
    expect(eventRepository.updateMany).not.toHaveBeenCalled()
    expect(playerRepository.updateMany).not.toHaveBeenCalled()
    expect(regulationRepository.updateMany).not.toHaveBeenCalled()
  })

  it('is idempotent on retry: second delete finds nothing to clean', async () => {
    const player = makePlayer({ primaryAssociation: ASSOCIATION_ID })
    const first = createService({ playersByPrimary: [player] })
    await first.service.delete(ASSOCIATION_ID)
    expect(first.playerRepository.updateMany).toHaveBeenCalledTimes(1)

    // After the first pass the list filters return nothing.
    const second = createService()
    await second.service.delete(ASSOCIATION_ID)
    expect(second.playerRepository.updateMany).not.toHaveBeenCalled()
    expect(second.associationRepository.delete).toHaveBeenCalledTimes(1)
  })
})
})
