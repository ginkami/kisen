import { beforeEach, describe, expect, it, vi } from 'vitest'

const getDocsMock = vi.hoisted(() => vi.fn())
const whereMock = vi.hoisted(() => vi.fn())
const orderByMock = vi.hoisted(() => vi.fn())
const limitMock = vi.hoisted(() => vi.fn())
const updateDocMock = vi.hoisted(() => vi.fn())

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: getDocsMock,
  setDoc: vi.fn(),
  updateDoc: updateDocMock,
  query: vi.fn(),
  where: whereMock,
  orderBy: orderByMock,
  limit: limitMock,
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
}))

vi.mock('../services/firebaseConfig.ts', () => ({
  db: {},
  auth: {},
}))

import { searchByEmailPrefix, setUserRole } from '../services/userService.ts'
import type { User } from '../types/user.ts'

type QueryResult = {
  docs: Array<{
    id: string
    data: () => Record<string, unknown>
  }>
}

function userDoc(id: string, isActive: boolean | undefined, email?: string): QueryResult['docs'][number] {
  return {
    id,
    data: () => ({
      id,
      email: email ?? `${id}@example.com`,
      role: 'user',
      auth:
        isActive === undefined
          ? undefined
          : {
              passwordHash: null,
              providers: [],
              emailVerified: true,
              isActive,
            },
      locales: {
        ru: { familyName: 'Ivanov', givenName: 'I', displayName: 'I' },
        en: { familyName: 'Ivanov', givenName: 'I', displayName: 'I' },
      },
      createdAt: { toDate: () => new Date('2026-01-01T00:00:00Z') },
      updatedAt: { toDate: () => new Date('2026-01-01T00:00:00Z') },
    }),
  }
}

beforeEach(() => {
  getDocsMock.mockReset()
  getDocsMock.mockResolvedValue({ docs: [] })
  whereMock.mockClear()
  orderByMock.mockClear()
  limitMock.mockClear()
  updateDocMock.mockReset()
  updateDocMock.mockResolvedValue(undefined)
})

describe('searchByEmailPrefix', () => {
  it('queries the email field with a prefix range and a limit of 20', async () => {
    await searchByEmailPrefix('iva')

    expect(whereMock).toHaveBeenCalledWith('email', '>=', 'iva')
    expect(whereMock).toHaveBeenCalledWith('email', '<=', 'iva\uf8ff')
    expect(orderByMock).toHaveBeenCalledWith('email')
    expect(limitMock).toHaveBeenCalledWith(20)
  })

  it('includes blocked users so an admin can find and unblock them', async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [userDoc('active', true), userDoc('blocked', false)],
    } as QueryResult)

    const result: User[] = await searchByEmailPrefix('iva')

    expect(result.map((user) => user.id)).toEqual(['active', 'blocked'])
  })

  it('keeps legacy users without the auth flag', async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [userDoc('legacy', undefined)],
    } as QueryResult)

    const result: User[] = await searchByEmailPrefix('iva')

    expect(result.map((user) => user.id)).toEqual(['legacy'])
  })
})

describe('setUserRole', () => {
  it('patches the role via a dot-path update', async () => {
    await setUserRole('user-1', 'manager')

    expect(updateDocMock).toHaveBeenCalledTimes(1)
    const [, patch] = updateDocMock.mock.calls[0]
    expect(patch.role).toBe('manager')
    expect(patch.updatedAt).toEqual({ __serverTimestamp: true })
  })
})
