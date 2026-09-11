import { describe, expect, it, vi } from 'vitest'
import { PlayerService } from '../services/playerService.ts'
import type { Player } from '../domain/player.ts'
import type { PlayerRepository } from '../services/repository.ts'
import type { FirestoreAssociationRepository } from '../services/firestoreAssociationRepository.ts'

const ASSOCIATION_ID = '01890a5d-ac96-774b-bcce-b302099a8059'
const OTHER_ASSOCIATION_ID = '01890a5d-ac96-774b-bcce-b302099a8061'

function makePlayer(part: Partial<Player> = {}): Player {
  return {
    id: '01890a5d-ac96-774b-bcce-b302099a8051',
    createdBy: 'admin-1',
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

function makeAssociation() {
  return {
    id: ASSOCIATION_ID,
    slug: 'fesa',
    locales: { ru: { title: 'ФЕСА' }, en: { title: 'FESA' } },
  }
}

function createService(existingPlayers: Player[]) {
  const repository = {
    getById: vi.fn(),
    listAll: vi.fn(async () => existingPlayers),
    list: vi.fn(),
    create: vi.fn(async (player: Player) => player),
    update: vi.fn(async (player: Player) => player),
    updateMany: vi.fn(),
    delete: vi.fn(),
    searchByFamilyName: vi.fn(),
  }
  const associationLookup = {
    getBySlug: vi.fn(async (slug: string) => (slug === 'fesa' ? makeAssociation() : null)),
  }
  const service = new PlayerService(
    repository as unknown as PlayerRepository,
    associationLookup as unknown as Pick<FirestoreAssociationRepository, 'getBySlug'>
  )
  return { service, repository, associationLookup }
}

function csvFile(rows: string[]): File {
  const text = [
    'en.familyName;en.givenName;nationality;association',
    ...rows,
  ].join('\n')
  return new File([text], 'players.csv', { type: 'text/csv' })
}

describe('PlayerService.importFromCsv association column', () => {
  it('creates a new player with the association resolved from the slug', async () => {
    const { service, repository, associationLookup } = createService([])

    const result = await service.importFromCsv(csvFile(['Doe;John;jp;fesa']), 'admin-1')

    expect(result.added).toBe(1)
    expect(result.updated).toBe(0)
    expect(result.invalid).toBe(0)
    expect(repository.create).toHaveBeenCalledTimes(1)
    expect(vi.mocked(repository.create).mock.calls[0][0]).toMatchObject({
      primaryAssociation: ASSOCIATION_ID,
      secondaryAssociations: [],
    })
    expect(associationLookup.getBySlug).toHaveBeenCalledWith('fesa')
  })

  it('creates a new player without an association when the column is empty', async () => {
    const { service, repository } = createService([])

    const result = await service.importFromCsv(csvFile(['Doe;John;jp;']), 'admin-1')

    expect(result.added).toBe(1)
    expect(vi.mocked(repository.create).mock.calls[0][0]).toMatchObject({
      primaryAssociation: null,
    })
  })

  it('sets the primary association on update and removes the id from secondary', async () => {
    const existing = makePlayer({
      locales: { en: { familyName: 'Doe', givenName: 'John' } },
      secondaryAssociations: [ASSOCIATION_ID],
    })
    const { service, repository } = createService([existing])

    const result = await service.importFromCsv(csvFile(['Doe;John;jp;fesa']), 'admin-1')

    expect(result.updated).toBe(1)
    expect(repository.update).toHaveBeenCalledTimes(1)
    expect(vi.mocked(repository.update).mock.calls[0][0]).toMatchObject({
      id: existing.id,
      primaryAssociation: ASSOCIATION_ID,
      secondaryAssociations: [],
    })
  })

  it('clears the primary association on update when the column is empty', async () => {
    const existing = makePlayer({
      locales: { en: { familyName: 'Doe', givenName: 'John' } },
      primaryAssociation: ASSOCIATION_ID,
      secondaryAssociations: [OTHER_ASSOCIATION_ID],
    })
    const { service, repository } = createService([existing])

    const result = await service.importFromCsv(csvFile(['Doe;John;jp;']), 'admin-1')

    expect(result.updated).toBe(1)
    expect(vi.mocked(repository.update).mock.calls[0][0]).toMatchObject({
      id: existing.id,
      primaryAssociation: null,
      secondaryAssociations: [OTHER_ASSOCIATION_ID],
    })
  })

  it('rejects a row with an unknown association slug without writing', async () => {
    const { service, repository } = createService([])

    const result = await service.importFromCsv(csvFile(['Doe;John;jp;nope']), 'admin-1')

    expect(result.invalid).toBe(1)
    expect(result.errors[0]).toMatchObject({
      row: 2,
      reason: expect.stringContaining('nope'),
    })
    expect(result.errors[0].reason).toContain('не найдена')
    expect(repository.create).not.toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('rejects a row with a malformed association slug', async () => {
    const { service, repository } = createService([])

    const result = await service.importFromCsv(csvFile(['Doe;John;jp;ФЕСА']), 'admin-1')

    expect(result.invalid).toBe(1)
    expect(result.errors[0].reason).toContain('некорректный slug ассоциации')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('resolves a repeated slug once per import', async () => {
    const { service, associationLookup } = createService([])

    const result = await service.importFromCsv(
      csvFile(['Doe;John;jp;fesa', 'Smith;Jane;jp;fesa']),
      'admin-1'
    )

    expect(result.added).toBe(2)
    expect(associationLookup.getBySlug).toHaveBeenCalledTimes(1)
  })
})
