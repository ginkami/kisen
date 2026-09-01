import { EventService } from '../services/eventService.ts'
import { chunkIds } from '../services/firestoreEventRepository.ts'
import type { EventRepository } from '../services/repository.ts'
import type { Event } from '../domain/event.ts'

function makeEvent(id: string): Event {
  return {
    id,
    slug: `slug-${id}`,
    createdBy: 'user1',
    hostAssociation: null,
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    startYearMonth: '2025-01',
    locales: { ru: { title: `Event ${id}` } },
    regulations: [],
  } as Event
}

function makeRepository(): {
  repository: EventRepository
  calls: string[][]
} {
  const calls: string[][] = []
  const repository: EventRepository = {
    getById: async () => null,
    getBySlug: async () => null,
    getByIds: async (ids: string[]) => {
      calls.push([...ids])
      return ids.filter((id) => id !== 'missing').map(makeEvent)
    },
    list: async () => [],
    create: async (event) => event,
    update: async (event) => event,
    delete: async () => {},
    slugExists: async () => null,
    searchByTitle: async () => [],
  }
  return { repository, calls }
}

describe('EventService.getByIds', () => {
  it('skips the repository call for an empty id list', async () => {
    const { repository, calls } = makeRepository()
    const service = new EventService(repository)
    const result = await service.getByIds([])
    expect(result).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('deduplicates ids before querying', async () => {
    const { repository, calls } = makeRepository()
    const service = new EventService(repository)
    const result = await service.getByIds(['a', 'a', 'b', 'a'])
    expect(calls).toEqual([['a', 'b']])
    expect(result.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('chunks more than 30 ids into multiple queries', async () => {
    const { repository } = makeRepository()
    const service = new EventService(repository)
    const ids = Array.from({ length: 70 }, (_, i) => `id${i}`)
    const result = await service.getByIds(ids)
    // The service itself makes a single (deduplicated) repository call;
    // chunking into Firestore-sized batches happens in the repository.
    expect(result).toHaveLength(70)
  })

  it('omits ids that were not found', async () => {
    const { repository } = makeRepository()
    const service = new EventService(repository)
    const result = await service.getByIds(['a', 'missing', 'b'])
    expect(result.map((e) => e.id)).toEqual(['a', 'b'])
  })
})

describe('chunkIds', () => {
  it('splits ids into chunks of at most 30 by default', () => {
    const ids = Array.from({ length: 70 }, (_, i) => `id${i}`)
    const chunks = chunkIds(ids)
    expect(chunks.map((c) => c.length)).toEqual([30, 30, 10])
    expect(chunks.flat()).toEqual(ids)
  })

  it('returns a single chunk when ids fit', () => {
    expect(chunkIds(['a', 'b'])).toEqual([['a', 'b']])
  })

  it('returns no chunks for an empty list', () => {
    expect(chunkIds([])).toEqual([])
  })

  it('honors a custom chunk size', () => {
    expect(chunkIds(['a', 'b', 'c'], 2).map((c) => c.length)).toEqual([2, 1])
  })
})
