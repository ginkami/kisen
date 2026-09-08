import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canEditEvent, type Event } from '../domain/event.ts'
import { eventService } from '../services/eventService.ts'
import { firestoreEventRepository } from '../services/firestoreEventRepository.ts'
import type { ListEventsFilters } from '../services/repository.ts'

vi.mock('../services/firestoreEventRepository.ts', () => ({
  firestoreEventRepository: { list: vi.fn() },
}))
vi.mock('../services/firestoreTournamentRepository.ts', () => ({
  firestoreTournamentRepository: {},
}))

type EditableFields = Pick<Event, 'createdBy' | 'hostAssociation'>

const UID = 'user-1'
const ASSN_A = '00000000-0000-7000-8000-00000000000a'
const ASSN_B = '00000000-0000-7000-8000-00000000000b'

function makeEventFields(part: Partial<EditableFields> = {}): EditableFields {
  return {
    createdBy: 'creator-1',
    hostAssociation: null,
    ...part,
  }
}

describe('canEditEvent', () => {
  it('allows admins to edit any event', () => {
    expect(canEditEvent(makeEventFields(), 'someone-else', true, [])).toBe(true)
  })

  it('allows the creator regardless of role', () => {
    expect(canEditEvent(makeEventFields({ createdBy: UID }), UID, false, [])).toBe(true)
  })

  it('allows a manager of the host association', () => {
    const event = makeEventFields({ hostAssociation: ASSN_A })
    expect(canEditEvent(event, UID, false, [ASSN_A])).toBe(true)
  })

  it('rejects users not affiliated with the event', () => {
    const event = makeEventFields({ hostAssociation: ASSN_A })
    expect(canEditEvent(event, UID, false, [ASSN_B])).toBe(false)
  })

  it('rejects when hostAssociation is null and the user is not the creator', () => {
    const event = makeEventFields({ createdBy: 'someone-else' })
    expect(canEditEvent(event, UID, false, [ASSN_A])).toBe(false)
  })
})

describe('eventService.listEditable', () => {
  const listMock = vi.mocked(firestoreEventRepository.list)

  const ownEvent = {
    id: 'e-own',
    createdBy: UID,
    hostAssociation: null,
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  } as Event
  const associationEvent = {
    id: 'e-assn',
    createdBy: 'someone-else',
    hostAssociation: ASSN_A,
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  } as Event
  const foreignEvent = {
    id: 'e-foreign',
    createdBy: 'someone-else',
    hostAssociation: null,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  } as Event

  beforeEach(() => {
    listMock.mockReset()
  })

  it('returns all events for admins', async () => {
    listMock.mockResolvedValue([foreignEvent])
    const result = await eventService.listEditable(UID, [], true)
    expect(listMock).toHaveBeenCalledWith({})
    expect(result).toEqual([foreignEvent])
  })

  it('merges created and managed-association events for regular users', async () => {
    listMock.mockImplementation(async (filters?: ListEventsFilters) => {
      if (filters?.createdBy === UID) return [ownEvent]
      if (filters?.hostAssociation === ASSN_A) return [associationEvent]
      return []
    })
    const result = await eventService.listEditable(UID, [ASSN_A, ASSN_B], false)
    expect(listMock).toHaveBeenCalledWith({ createdBy: UID })
    expect(listMock).toHaveBeenCalledWith({ hostAssociation: ASSN_A })
    expect(listMock).toHaveBeenCalledWith({ hostAssociation: ASSN_B })
    expect(result.map((event) => event.id)).toEqual(['e-own', 'e-assn'])
    expect(result).not.toContain(foreignEvent)
  })

  it('deduplicates events matching several managed associations', async () => {
    listMock.mockImplementation(async (filters?: ListEventsFilters) => {
      if (filters?.createdBy === UID) return []
      if (filters?.hostAssociation === ASSN_A) return [associationEvent]
      if (filters?.hostAssociation === ASSN_B) return [associationEvent]
      return []
    })
    const result = await eventService.listEditable(UID, [ASSN_A, ASSN_B], false)
    expect(result.map((event) => event.id)).toEqual(['e-assn'])
  })
})