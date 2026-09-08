import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canEditTournament, type Tournament } from '../domain/tournament.ts'
import { tournamentService } from '../services/tournamentService.ts'
import { firestoreTournamentRepository } from '../services/firestoreTournamentRepository.ts'

vi.mock('../services/firestoreTournamentRepository.ts', () => ({
  firestoreTournamentRepository: { list: vi.fn() },
}))
vi.mock('../services/firestoreEventRepository.ts', () => ({
  firestoreEventRepository: { list: vi.fn(), getByIds: vi.fn() },
}))

type EditableFields = Pick<Tournament, 'createdBy' | 'hostAssociation'>

const UID = 'user-1'
const ASSN_A = '00000000-0000-7000-8000-00000000000a'
const ASSN_B = '00000000-0000-7000-8000-00000000000b'

function makeTournamentFields(part: Partial<EditableFields> = {}): EditableFields {
  return {
    createdBy: 'creator-1',
    hostAssociation: null,
    ...part,
  }
}

describe('canEditTournament', () => {
  it('allows admins to edit any tournament', () => {
    expect(canEditTournament(makeTournamentFields(), 'someone-else', true, [])).toBe(true)
  })

  it('allows the creator regardless of role', () => {
    expect(canEditTournament(makeTournamentFields({ createdBy: UID }), UID, false, [])).toBe(true)
  })

  it('allows a manager of the host association', () => {
    const tournament = makeTournamentFields({ hostAssociation: ASSN_A })
    expect(canEditTournament(tournament, UID, false, [ASSN_A])).toBe(true)
  })

  it('rejects users not affiliated with the tournament', () => {
    const tournament = makeTournamentFields({ hostAssociation: ASSN_A })
    expect(canEditTournament(tournament, UID, false, [ASSN_B])).toBe(false)
  })

  it('rejects when hostAssociation is null and the user is not the creator', () => {
    const tournament = makeTournamentFields({ createdBy: 'someone-else' })
    expect(canEditTournament(tournament, UID, false, [ASSN_A])).toBe(false)
  })
})

describe('tournamentService.listEditable', () => {
  const listMock = vi.mocked(firestoreTournamentRepository.list)

  const ownTournament = {
    id: 't-own',
    createdBy: UID,
    hostAssociation: null,
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  } as Tournament
  const associationTournament = {
    id: 't-assn',
    createdBy: 'someone-else',
    hostAssociation: ASSN_A,
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  } as Tournament
  const foreignTournament = {
    id: 't-foreign',
    createdBy: 'someone-else',
    hostAssociation: null,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  } as Tournament

  beforeEach(() => {
    listMock.mockReset()
  })

  it('returns all tournaments for admins', async () => {
    listMock.mockResolvedValue([foreignTournament])
    const result = await tournamentService.listEditable(UID, [], true)
    expect(listMock).toHaveBeenCalledWith({})
    expect(result).toEqual([foreignTournament])
  })

  it('merges created and managed-association tournaments for regular users', async () => {
    listMock.mockImplementation(async (filters) => {
      if (filters?.createdBy === UID) return [ownTournament]
      if (filters?.hostAssociation === ASSN_A) return [associationTournament]
      return []
    })
    const result = await tournamentService.listEditable(UID, [ASSN_A, ASSN_B], false)
    expect(listMock).toHaveBeenCalledWith({ createdBy: UID })
    expect(listMock).toHaveBeenCalledWith({ hostAssociation: ASSN_A })
    expect(listMock).toHaveBeenCalledWith({ hostAssociation: ASSN_B })
    expect(result.map((tournament) => tournament.id)).toEqual(['t-own', 't-assn'])
    expect(result).not.toContain(foreignTournament)
  })

  it('deduplicates tournaments matching several managed associations', async () => {
    listMock.mockImplementation(async (filters) => {
      if (filters?.createdBy === UID) return []
      if (filters?.hostAssociation === ASSN_A) return [associationTournament]
      if (filters?.hostAssociation === ASSN_B) return [associationTournament]
      return []
    })
    const result = await tournamentService.listEditable(UID, [ASSN_A, ASSN_B], false)
    expect(result.map((tournament) => tournament.id)).toEqual(['t-assn'])
  })
})