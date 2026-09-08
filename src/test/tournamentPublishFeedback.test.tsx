import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

const validateTournamentPublishFormMock = vi.hoisted(() =>
  vi.fn((): Record<string, string> => ({}))
)

const formStateOverrides = vi.hoisted(() => ({
  value: null as Record<string, unknown> | null,
}))

const validationErrorsState = vi.hoisted(() => ({
  value: {} as Record<string, string>,
}))

const setValidationErrorsMock = vi.hoisted(() =>
  vi.fn((errors: Record<string, string>) => {
    validationErrorsState.value = errors
  })
)

vi.mock('../hooks/useTournamentForm.ts', () => ({
  useTournamentForm: () => ({
    tournament: tournamentFormState.tournament,
    formState: formStateOverrides.value
      ? ({ ...makeFormState(), ...formStateOverrides.value } as ReturnType<typeof makeFormState>)
      : makeFormState(),
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
    validationErrors: validationErrorsState.value,
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
    setValidationErrors: setValidationErrorsMock,
    slugTaken: false,
  }),
  validateTournamentPublishForm: validateTournamentPublishFormMock,
}))

function makeFormState() {
  return {
    slug: 'test-tournament',
    parentEvent: null,
    hostAssociation: null,
    locales: {
      ru: { title: 'РўРµСЃС‚РѕРІС‹Р№ С‚СѓСЂРЅРёСЂ', description: '' },
      en: { title: 'Test tournament', description: '' },
    },
    location: {
      latitude: 35.0,
      longitude: 139.0,
      country: 'jp',
      timeZone: null,
      locales: {
        ru: { settlement: '', venue: '' },
        en: { settlement: '', venue: '' },
      },
    },
    arbiter: {
      ru: { givenName: 'РРІР°РЅ', familyName: 'РРІР°РЅРѕРІ' },
      en: { givenName: 'Ivan', familyName: 'Ivanov' },
    },
    settings: {} as Tournament['settings'],
    scheduleRows: [],
    participants: [],
    games: [],
    publishedRounds: 0,
    regulations: [],
  }
}

function makeTournament(): Tournament {
  return {
    id: '00000000-0000-7000-8000-000000000001',
    slug: 'test-tournament',
    createdBy: 'user-1',
    hostAssociation: null,
    status: 'draft',
    isPublic: false,
    startYearMonth: '202609',
    parentEvent: null,
    regulations: [],
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    locales: {
      ru: { title: 'РўРµСЃС‚РѕРІС‹Р№ С‚СѓСЂРЅРёСЂ' },
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
    schedule: { rounds: [], events: [] },
    participants: [],
    games: [],
    publishedRounds: 0,
  } as unknown as Tournament
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TournamentEditForm tournamentId="00000000-0000-7000-8000-000000000001" />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  authState.user = { role: 'manager' }
  authState.firebaseUser = { uid: 'user-1' }
  authState.isAuthenticated = true
  associationsState.associations = []
  associationsState.isLoading = false
  setValidationErrorsMock.mockClear()
  validationErrorsState.value = {}
  validateTournamentPublishFormMock.mockReturnValue({})
  tournamentFormState.tournament = makeTournament()
  formStateOverrides.value = null
})

describe('Tournament publish validation feedback', () => {
  it('switches to the schedule tab with a hint when a round has no time', () => {
    validateTournamentPublishFormMock.mockReturnValue({ roundTime: 'required' })
    formStateOverrides.value = {
      scheduleRows: [
        {
          kind: 'round',
          id: 'round-1',
          number: 1,
          scheduledAt: null,
          scheduledAtLocal: null,
        },
      ],
    }
    renderForm()

    fireEvent.click(screen.getByText('tournament.edit.publish'))

    // Switched to the schedule tab
    expect(screen.getByText('tournament.edit.program.title')).toBeTruthy()
    expect(screen.getByText('tournament.edit.program.roundTimeRequired')).toBeTruthy()
    expect(screen.queryByText('tournament.edit.basicInfo')).toBeNull()
    // Confirm dialog is not opened
    expect(document.querySelector('dialog[open]')).toBeNull()
    // Validation errors were set for the form state
    expect(setValidationErrorsMock).toHaveBeenCalled()
  })

  it('highlights the untimed round input with the error style', () => {
    validateTournamentPublishFormMock.mockReturnValue({ roundTime: 'required' })
    formStateOverrides.value = {
      scheduleRows: [
        {
          kind: 'round',
          id: 'round-1',
          number: 1,
          scheduledAt: null,
          scheduledAtLocal: null,
        },
      ],
    }
    const { container } = renderForm()

    fireEvent.click(screen.getByText('tournament.edit.publish'))

    expect(container.querySelector('input.input-error')).not.toBeNull()
  })

  it('opens the confirm dialog when the tournament is publish-ready', () => {
    formStateOverrides.value = {
      scheduleRows: [
        {
          kind: 'round',
          id: 'round-1',
          number: 1,
          scheduledAt: new Date('2026-09-10T10:00:00Z'),
          scheduledAtLocal: null,
        },
      ],
    }
    renderForm()

    fireEvent.click(screen.getByText('tournament.edit.publish'))

    expect(document.querySelector('dialog[open]')).not.toBeNull()
    expect(screen.getByText('tournament.edit.publishConfirmTitle')).toBeTruthy()
    expect(setValidationErrorsMock).not.toHaveBeenCalled()
  })
})
