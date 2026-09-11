import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTournamentForm } from '../hooks/useTournamentForm.ts'
import { tournamentService } from '../services/tournamentService.ts'
import type { Tournament } from '../domain/tournament.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

vi.mock('../services/firebaseConfig.ts', () => ({
  app: {},
  auth: {},
  db: {},
}))

vi.mock('../services/userService.ts', () => ({
  createUser: vi.fn(),
  getUserById: vi.fn(),
}))

vi.mock('../services/geoService.ts', () => ({
  resolveLocationByIp: vi.fn(() => Promise.resolve(null)),
  resolvedToTournamentLocation: vi.fn(() => null),
}))

const authState = vi.hoisted(() => ({
  user: null as unknown,
  firebaseUser: null as unknown,
  isAuthenticated: true,
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

const updateMock = vi.hoisted(() => vi.fn())

vi.mock('../services/tournamentService.ts', () => ({
  tournamentService: {
    getById: vi.fn(),
    update: updateMock,
    slugExists: vi.fn(() => Promise.resolve(false)),
    publish: vi.fn(),
    delete: vi.fn(),
  },
}))

const setHasUnsavedChanges = vi.fn()

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Outlet context={{ setHasUnsavedChanges }} />}>
              <Route path="*" element={children} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

function makeTournament(part: Partial<Tournament> = {}): Tournament {
  return {
    id: '00000000-0000-7000-8000-000000000001',
    slug: 'test-tournament',
    createdBy: 'creator-1',
    hostAssociation: null,
    status: 'draft',
    isPublic: false,
    startYearMonth: '202609',
    parentEvent: null,
    regulations: [],
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    locales: {
      ru: { title: 'Тестовый турнир' },
      en: { title: 'Test tournament' },
    },
    location: {
      country: 'jp',
      locales: { ru: { settlement: '' }, en: { settlement: '' } },
    },
    arbiter: {
      locales: {
        ru: { givenName: '', familyName: '' },
        en: { givenName: '', familyName: '' },
      },
    },
    settings: { considerSente: false } as Tournament['settings'],
    schedule: { events: [], rounds: [] },
    participants: [],
    games: [],
    publishedRounds: 0,
    ...part,
  } as Tournament
}

describe('useTournamentForm pairings auto-save', () => {
  beforeEach(() => {
    authState.user = { locales: {} }
    authState.firebaseUser = { uid: 'creator-1' }
    setHasUnsavedChanges.mockClear()
    updateMock.mockReset()
    updateMock.mockImplementation(async (input: { publishedRounds: number; games: [] }) =>
      makeTournament({ publishedRounds: input.publishedRounds, games: input.games })
    )
    vi.mocked(tournamentService.getById).mockReset()
  })

  it('auto-saves the tournament when a round is published', async () => {
    vi.mocked(tournamentService.getById).mockResolvedValue(makeTournament())

    const { result } = renderHook(() => useTournamentForm('00000000-0000-7000-8000-000000000001'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.formState).not.toBeNull())
    expect(result.current.isDirty).toBe(false)

    act(() => result.current.publishDraw(1))

    // The state change marks the form dirty while the auto-save is in flight.
    expect(result.current.formState?.publishedRounds).toBe(1)
    expect(result.current.isDirty).toBe(true)

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))
    expect(updateMock.mock.calls[0][0]).toMatchObject({
      id: '00000000-0000-7000-8000-000000000001',
      publishedRounds: 1,
    })

    // After the auto-save completes the form is clean again → Save is disabled.
    await waitFor(() => expect(result.current.isDirty).toBe(false))
    expect(result.current.formState?.publishedRounds).toBe(1)
  })

  it('auto-saves the tournament when a round is unpublished', async () => {
    vi.mocked(tournamentService.getById).mockResolvedValue(
      makeTournament({ publishedRounds: 1 })
    )

    const { result } = renderHook(() => useTournamentForm('00000000-0000-7000-8000-000000000001'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.formState).not.toBeNull())
    expect(result.current.isDirty).toBe(false)

    act(() => result.current.unpublishDraw())

    expect(result.current.formState?.publishedRounds).toBe(0)
    expect(result.current.isDirty).toBe(true)

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))
    expect(updateMock.mock.calls[0][0]).toMatchObject({
      id: '00000000-0000-7000-8000-000000000001',
      publishedRounds: 0,
    })

    await waitFor(() => expect(result.current.isDirty).toBe(false))
    expect(result.current.formState?.publishedRounds).toBe(0)
  })
})
