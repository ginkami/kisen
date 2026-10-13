import { Bytes } from 'firebase/firestore'
import { playerSchema, type Player } from '../domain/player.ts'
import { sanitizeDeep } from '../utils/sanitize.ts'
import {
  timestampsToDates,
  datesToTimestamps,
  removeUndefined,
} from '../services/firestoreHelpers.ts'
import { toFirestore, fromFirestore } from '../services/firestorePlayerRepository.ts'
import { PlayerService } from '../services/playerService.ts'
import type { PlayerRepository } from '../services/repository.ts'
import {
  createEmptyFormState,
  playerToFormState,
  formStateToCreateInput,
  formStateToUpdateInput,
  formStateSnapshot,
} from '../hooks/playerFormHelpers.ts'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: '01900000-0000-7000-8000-000000000001',
    createdBy: 'user-1',
    locales: { ru: { familyName: 'Иванов', givenName: 'Иван' } },
    nationality: 'ru',
    gender: null,
    currentRating: { value: null, rank: null },
    birthDate: null,
    primaryAssociation: null,
    secondaryAssociations: [],
    ...overrides,
  } as Player
}

function makeService() {
  const repository = {
    getById: vi.fn(),
    create: vi.fn((p: Player) => Promise.resolve(p)),
    update: vi.fn((p: Player) => Promise.resolve(p)),
    updateMany: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    list: vi.fn(() => Promise.resolve([])),
    listAll: vi.fn(() => Promise.resolve([])),
    searchByFamilyName: vi.fn(() => Promise.resolve([])),
  }
  const service = new PlayerService(repository as unknown as PlayerRepository)
  return { service, repository }
}

describe('playerSchema avatar field', () => {
  it('accepts a player without avatar (optional field)', () => {
    expect(() => playerSchema.parse(makePlayer())).not.toThrow()
    expect(playerSchema.parse(makePlayer()).avatar).toBeUndefined()
  })

  it('accepts avatar bytes and returns them unchanged', () => {
    const parsed = playerSchema.parse(makePlayer({ avatar: new Uint8Array([1, 2, 3]) }))
    expect(parsed.avatar).toBeInstanceOf(Uint8Array)
    expect(Array.from(parsed.avatar!)).toEqual([1, 2, 3])
  })

  it('rejects a non-binary avatar', () => {
    const bad = makePlayer({ avatar: { 0: 1 } as unknown as Uint8Array })
    expect(() => playerSchema.parse(bad)).toThrow()
  })
})

describe('binary-safe helpers', () => {
  it('sanitizeDeep keeps Uint8Array untouched while sanitizing strings', () => {
    const bytes = new Uint8Array([137, 80, 78, 71])
    const result = sanitizeDeep({ avatar: bytes, name: '<b>x</b>' }) as Record<string, unknown>
    expect(result.avatar).toBeInstanceOf(Uint8Array)
    expect(Array.from(result.avatar as Uint8Array)).toEqual([137, 80, 78, 71])
    expect(result.name).toBe('x')
  })

  it('timestampsToDates, datesToTimestamps and removeUndefined pass Uint8Array through', () => {
    const bytes = new Uint8Array([7, 8, 9])
    const data = { avatar: bytes, nested: { avatar: bytes } }
    expect((timestampsToDates(data) as typeof data).avatar).toBe(bytes)
    expect((datesToTimestamps(data) as typeof data).avatar).toBe(bytes)
    expect((datesToTimestamps(data) as typeof data).nested.avatar).toBe(bytes)
    expect((removeUndefined(data) as typeof data).avatar).toBe(bytes)
  })

  it('timestampsToDates and removeUndefined pass Firestore Bytes through', () => {
    const binary = Bytes.fromUint8Array(new Uint8Array([4, 5]))
    const data = { avatar: binary }
    expect((timestampsToDates(data) as Record<string, unknown>).avatar).toBe(binary)
    expect((removeUndefined(data) as Record<string, unknown>).avatar).toBe(binary)
  })
})

describe('repository avatar conversion', () => {
  it('toFirestore stores Bytes and fromFirestore returns identical Uint8Array', () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const player = makePlayer({ avatar: bytes })
    const data = toFirestore(player)
    expect(data.avatar).toBeInstanceOf(Bytes)
    const loaded = fromFirestore(data)
    expect(loaded.avatar).toBeInstanceOf(Uint8Array)
    expect(Array.from(loaded.avatar!)).toEqual([1, 2, 3, 4])
  })

  it('round-trips a player without avatar', () => {
    const player = makePlayer()
    expect(fromFirestore(toFirestore(player)).avatar).toBeUndefined()
  })
})

describe('playerService avatar persistence', () => {
  it('create passes avatar bytes to the repository unchanged', async () => {
    const { service, repository } = makeService()
    const bytes = new Uint8Array([10, 20, 30])
    await service.create({
      createdBy: 'user-1',
      locales: { ru: { familyName: 'Иванов', givenName: 'Иван' } },
      nationality: 'ru',
      avatar: bytes,
    })
    expect(repository.create).toHaveBeenCalledTimes(1)
    const written = repository.create.mock.calls[0][0] as Player
    expect(written.avatar).toBeInstanceOf(Uint8Array)
    expect(Array.from(written.avatar!)).toEqual([10, 20, 30])
  })

  it('update with avatar bytes persists them', async () => {
    const { service, repository } = makeService()
    const bytes = new Uint8Array([1, 2])
    await service.update({ id: 'p', avatar: bytes, existing: makePlayer() })
    const written = repository.update.mock.calls[0][0] as Player
    expect(Array.from(written.avatar!)).toEqual([1, 2])
  })

  it('update with avatar null clears the stored photo', async () => {
    const { service, repository } = makeService()
    const existing = makePlayer({ avatar: new Uint8Array([9, 9]) })
    const result = await service.update({ id: existing.id, avatar: null, existing })
    expect(result.avatar).toBeUndefined()
    const written = repository.update.mock.calls[0][0] as Player
    expect(written.avatar).toBeUndefined()
  })

  it('update without avatar keeps the stored photo', async () => {
    const { service } = makeService()
    const existing = makePlayer({ avatar: new Uint8Array([3, 3]) })
    const result = await service.update({ id: existing.id, existing })
    expect(Array.from(result.avatar!)).toEqual([3, 3])
  })
})

describe('form state avatar round-trip', () => {
  it('loads avatar bytes into form state and maps them back on save', () => {
    const bytes = new Uint8Array([4, 5, 6])
    const player = makePlayer({ avatar: bytes })
    const state = playerToFormState(player)
    expect(state.avatar).toBeInstanceOf(Uint8Array)
    expect(Array.from(state.avatar!)).toEqual([4, 5, 6])
    expect(formStateToCreateInput(state, 'user-1').avatar).toEqual(bytes)
    expect(formStateToUpdateInput(player, state).avatar).toEqual(bytes)
  })

  it('players without avatar map to null in form state', () => {
    expect(playerToFormState(makePlayer()).avatar).toBeNull()
    const state = createEmptyFormState()
    expect(state.avatar).toBeNull()
    expect(formStateToCreateInput(state, 'user-1').avatar).toBeUndefined()
  })
})

describe('formStateSnapshot binary-safe dirty tracking', () => {
  it('equal bytes produce equal snapshots and different bytes differ', () => {
    const base = createEmptyFormState()
    const a = { ...base, avatar: new Uint8Array([1, 2, 3]) }
    const b = { ...base, avatar: new Uint8Array([1, 2, 3]) }
    const c = { ...base, avatar: new Uint8Array([9]) }
    expect(formStateSnapshot(a)).toBe(formStateSnapshot(b))
    expect(formStateSnapshot(a)).not.toBe(formStateSnapshot(c))
    expect(formStateSnapshot(a)).not.toBe(formStateSnapshot(base))
  })

  it('encodes avatar as base64, not as a numeric-key object', () => {
    const snapshot = formStateSnapshot({ ...createEmptyFormState(), avatar: new Uint8Array([1, 2]) })
    expect(snapshot).not.toContain('"0":1')
    expect(snapshot).toContain('"AQI=') // base64 of [1, 2]
  })
})
