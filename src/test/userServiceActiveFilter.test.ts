import { beforeEach, describe, expect, it, vi } from 'vitest'

const getDocsMock = vi.hoisted(() => vi.fn())

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: getDocsMock,
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(),
}))

vi.mock('../services/firebaseConfig.ts', () => ({
  db: {},
  auth: {},
}))

import { searchByFamilyName } from '../services/userService.ts'
import type { User } from '../types/user.ts'

type LocaleQueryResult = {
  docs: Array<{
    id: string
    data: () => Record<string, unknown>
  }>
}

function userDoc(id: string, isActive: boolean | undefined): LocaleQueryResult['docs'][number] {
  return {
    id,
    data: () => ({
      id,
      email: `${id}@example.com`,
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
})

describe('searchByFamilyName excludes blocked users', () => {
  it('excludes users with auth.isActive === false', async () => {
    getDocsMock
      .mockResolvedValueOnce({
        docs: [userDoc('active', true), userDoc('blocked', false)],
      } as LocaleQueryResult)
      .mockResolvedValueOnce({ docs: [] } as LocaleQueryResult)

    const result: User[] = await searchByFamilyName('Ivanov')

    expect(result.map((user) => user.id)).toEqual(['active'])
  })

  it('keeps legacy users without the auth flag', async () => {
    getDocsMock
      .mockResolvedValueOnce({
        docs: [userDoc('legacy', undefined)],
      } as LocaleQueryResult)
      .mockResolvedValueOnce({ docs: [] } as LocaleQueryResult)

    const result: User[] = await searchByFamilyName('Ivanov')

    expect(result.map((user) => user.id)).toEqual(['legacy'])
  })
})