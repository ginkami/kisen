import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TournamentEditForm } from '../components/tournament/TournamentEditForm.tsx'
import type { Tournament } from '../domain/tournament.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  user: null as unknown,
  firebaseUser: null as unknown,
  isAuthenticated: true,
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

const associationsState = vi.hoisted(() => ({
  associations: [] as Array<{ id: string }>,
  isLoading: false,
}))

vi.mock('../hooks/useAssociations.ts', () => ({
  useMyAssociations: () => ({
    data: associationsState.associations,
    isLoading: associationsState.isLoading,
  }),
  useAssociationsByIds: () => [],
}))

vi.mock('../services/regulationService.ts', () => ({
  regulationService: {
    listEditable: vi.fn(() => Promise.resolve([])),
  },
}))

vi.mock('../services/eventService.ts', () => ({
  eventService: {
    getById: vi.fn(() => Promise.resolve(null)),
  },
}))

const tournamentFormState = vi.hoisted(() => ({
  tournament: null as Tournament | null,
}))

vi.mock('../hooks/useTournamentForm.ts', () => ({
  useTournamentForm: () => ({
    tournament: tournamentFormState.tournament,
    formState: makeFormState(),
    isLoading: false,
    loadError: null,
    createError: null,
    isDirty: false,
    isSaving: false,
    isPublishing: false,
    isDeleting: false,
    saveError: null,
    publishError: null,
    deleteError: null,
    validationErrors: {},
    clearSaveError: vi.fn(),
    clearPublishError: vi.fn(),
    clearDeleteError: vi.fn(),
    clearCreateError: vi.fn(),
    retryCreateDraft: vi.fn(),
    updateLocale: vi.fn(),
    updateBasic: vi.fn(),
    updateLocation: vi.fn(),
    updateLocationLocale: vi.fn(),
    updateArbiter: vi.fn(),
    updateTimeControlType: vi.fn(),
    updateTimeControlField: vi.fn(),
    addTieBreak: vi.fn(),
    removeTieBreak: vi.fn(),
    addRegulation: vi.fn(),
    removeRegulation: vi.fn(),
    updateConsiderSente: vi.fn(),
    addScheduleRow: vi.fn(),
    updateScheduleRow: vi.fn(),
    removeScheduleRow: vi.fn(),
    sortScheduleRows: vi.fn(),
    sortParticipants: vi.fn(),
    addParticipant: vi.fn(),
    updateParticipant: vi.fn(),
    removeParticipant: vi.fn(),
    updateGames: vi.fn(),
    publishDraw: vi.fn(),
    unpublishDraw: vi.fn(),
    updateStartingPoints: vi.fn(),
    save: vi.fn(),
    publish: vi.fn(),
    deleteTournament: vi.fn(),
    slugTaken: false,
  }),
}))

function makeFormState() {
  return {
    slug: 'test-tournament',
    parentEvent: null,
    hostAssociation: null,
    locales: {
      ru: { title: 'Тестовый турнир', description: '' },
      en: { title: 'Test tournament', description: '' },
    },
    location: {
      latitude: null,
      longitude: null,
      country: 'jp',
      timeZone: null,
      locales: {
        ru: { settlement: '', venue: '' },
        en: { settlement: '', venue: '' },
      },
    },
    arbiter: {
      ru: { givenName: '', familyName: '' },
      en: { givenName: '', familyName: '' },
    },
    regulations: [],
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
      ru: { givenName: '', familyName: '' },
      en: { givenName: '', familyName: '' },
    },
    settings: {} as Tournament['settings'],
    schedule: { rounds: [] },
    participants: [],
    games: [],
    publishedRounds: 0,
    ...part,
  } as Tournament
}

function makeUser(role: string) {
  return { role }
}

function makeFirebaseUser(uid: string) {
  return { uid }
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tournaments/edit']}>
        <Routes>
          <Route
            path="/tournaments/edit"
            element={<TournamentEditForm tournamentId="00000000-0000-7000-8000-000000000001" />}
          />
          <Route path="/login" element={<div>login-page-marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  authState.user = makeUser('user')
  authState.firebaseUser = makeFirebaseUser('user-1')
  authState.isAuthenticated = true
  associationsState.associations = []
  associationsState.isLoading = false
  tournamentFormState.tournament = null
})
describe('TournamentEditForm access guard', () => {
  it('redirects unauthenticated visitors to /login', () => {
    authState.isAuthenticated = false
    renderForm()

    expect(screen.getByText('login-page-marker')).toBeTruthy()
    expect(screen.queryByText('tournament.edit.save')).toBeNull()
  })

  it('shows the no-access message instead of the form for an unrelated user', () => {
    tournamentFormState.tournament = makeTournament({ createdBy: 'creator-1' })
    renderForm()

    expect(screen.getByText('tournament.edit.errors.noAccess')).toBeTruthy()
    expect(screen.queryByText('tournament.edit.save')).toBeNull()
    expect(screen.queryByText('tournament.edit.delete')).toBeNull()
  })

  it('renders the full form when the tournament was created by the current user', () => {
    tournamentFormState.tournament = makeTournament({ createdBy: 'user-1' })
    renderForm()

    expect(screen.getByText('tournament.edit.save')).toBeTruthy()
    expect(screen.queryByText('tournament.edit.errors.noAccess')).toBeNull()
  })

  it('renders the full form when the host association is managed by the current user', () => {
    tournamentFormState.tournament = makeTournament({
      createdBy: 'creator-1',
      hostAssociation: 'assn-a',
    })
    associationsState.associations = [{ id: 'assn-a' }]
    renderForm()

    expect(screen.getByText('tournament.edit.save')).toBeTruthy()
    expect(screen.queryByText('tournament.edit.errors.noAccess')).toBeNull()
  })

  it('renders the full form for admins regardless of ownership', () => {
    authState.user = makeUser('admin')
    tournamentFormState.tournament = makeTournament({ createdBy: 'creator-1' })
    renderForm()

    expect(screen.getByText('tournament.edit.save')).toBeTruthy()
    expect(screen.queryByText('tournament.edit.errors.noAccess')).toBeNull()
  })

  it('keeps showing the spinner while the managed associations are loading', () => {
    tournamentFormState.tournament = makeTournament({ createdBy: 'creator-1' })
    associationsState.isLoading = true
    const { container } = renderForm()

    expect(container.querySelector('.loading')).not.toBeNull()
    expect(screen.queryByText('tournament.edit.errors.noAccess')).toBeNull()
    expect(screen.queryByText('tournament.edit.save')).toBeNull()
  })
})
