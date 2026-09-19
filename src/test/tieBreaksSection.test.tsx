import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TournamentEditForm } from '../components/tournament/TournamentEditForm.tsx'
import type { Tournament } from '../domain/tournament.ts'
import type { TieBreak } from '../domain/tieBreak.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  user: { role: 'user' } as unknown,
  firebaseUser: { uid: 'user-1' } as unknown,
  isAuthenticated: true,
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/useAssociations.ts', () => ({
  useMyAssociations: () => ({ data: [], isLoading: false }),
  useAssociationsByIds: () => [],
}))

vi.mock('../services/regulationService.ts', () => ({
  regulationService: { listEditable: vi.fn(() => Promise.resolve([])) },
}))

vi.mock('../services/eventService.ts', () => ({
  eventService: { getById: vi.fn(() => Promise.resolve(null)) },
}))

const tieBreaksState = vi.hoisted(() => ({
  tieBreaks: [] as Array<{ type: string; cutCount?: number }>,
  addTieBreak: vi.fn(),
}))

vi.mock('../hooks/useTournamentForm.ts', () => ({
  useTournamentForm: () => ({
    tournament: makeTournament(),
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
    addTieBreak: tieBreaksState.addTieBreak,
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
    restorePairingSnapshot: vi.fn(),
    updateStartingPoints: vi.fn(),
    save: vi.fn(),
    publish: vi.fn(),
    deleteTournament: vi.fn(),
    slugTaken: false,
  }),
  rowsToParticipants: (rows: unknown[]) => rows,
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
      locales: { ru: { settlement: '', venue: '' }, en: { settlement: '', venue: '' } },
    },
    arbiter: {
      ru: { givenName: '', familyName: '' },
      en: { givenName: '', familyName: '' },
    },
    regulations: [],
    settings: {
      considerSente: false,
      hasKnockoutBracket: { size: 0, startRound: 0 },
      tieBreaks: tieBreaksState.tieBreaks,
      timeControl: { type: 'absolute', mainTime: 60 },
    },
    games: [],
    participants: [],
    publishedRounds: 0,
    scheduleRows: [],
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
    settings: {} as Tournament['settings'],
    schedule: { rounds: [], events: [] },
    participants: [],
    games: [],
    publishedRounds: 0,
  } as Tournament
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
            element={
              <Outlet
                context={{
                  setHasUnsavedChanges: vi.fn(),
                  closeAdminDrawer: vi.fn(),
                  isPairingToolsOpen: false,
                  setPairingToolsOpen: vi.fn(),
                }}
              />
            }
          >
            <Route
              path="/tournaments/edit"
              element={<TournamentEditForm tournamentId="00000000-0000-7000-8000-000000000001" />}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  tieBreaksState.tieBreaks = []
  tieBreaksState.addTieBreak = vi.fn()
})

function tieBreakSelect(): HTMLSelectElement {
  const select = screen
    .getAllByRole('combobox')
    .find((el) => el.querySelector('option[value="buchholz_cut"]'))
  expect(select).toBeDefined()
  return select as HTMLSelectElement
}

describe('TieBreaksSection add control', () => {
  it('derives the first available type and shows the cut-count field for buchholz_cut on init', () => {
    // Regression: with the default tie-breaks (points, buchholz,
    // sonneborn_berger) the stale selectedType was 'buchholz' — filtered out
    // of the list. The select displayed the first option «Бухгольц усеченный»
    // while the cut-count field never appeared and Add silently added a
    // duplicate.
    tieBreaksState.tieBreaks = [
      { type: 'points' },
      { type: 'buchholz' },
      { type: 'sonneborn_berger' },
    ] as TieBreak[]
    renderForm()
    fireEvent.click(screen.getByRole('tab', { name: 'tournament.edit.tabs.settings' }))

    const select = tieBreakSelect()
    expect(select.value).toBe('buchholz_cut')
    expect(screen.getByText('tournament.edit.tieBreaks.cutCount')).toBeTruthy()
    expect(document.querySelector('input[type="number"]')).not.toBeNull()
  })

  it('adds buchholz_cut with the cut count from the field', () => {
    tieBreaksState.tieBreaks = [
      { type: 'points' },
      { type: 'buchholz' },
      { type: 'sonneborn_berger' },
    ] as TieBreak[]
    renderForm()
    fireEvent.click(screen.getByRole('tab', { name: 'tournament.edit.tabs.settings' }))

    fireEvent.click(screen.getByText('tournament.edit.tieBreaks.add'))

    expect(tieBreaksState.addTieBreak).toHaveBeenCalledWith('buchholz_cut', 1)
  })

  it('hides the cut-count field for non-cut types and adds without one', () => {
    tieBreaksState.tieBreaks = [{ type: 'points' }] as TieBreak[]
    renderForm()
    fireEvent.click(screen.getByRole('tab', { name: 'tournament.edit.tabs.settings' }))

    const select = tieBreakSelect()
    expect(select.value).toBe('buchholz')
    expect(screen.queryByText('tournament.edit.tieBreaks.cutCount')).toBeNull()

    fireEvent.change(select, { target: { value: 'buchholz_median' } })
    expect(screen.queryByText('tournament.edit.tieBreaks.cutCount')).toBeNull()

    fireEvent.click(screen.getByText('tournament.edit.tieBreaks.add'))
    expect(tieBreaksState.addTieBreak).toHaveBeenCalledWith('buchholz_median', undefined)
  })

  it('re-derives the selection when the previously selected type is unavailable', () => {
    // A unique type was already added: it dropped from the list, so the stale
    // selectedType must not linger — the select falls back to the first
    // available option instead of a phantom value.
    tieBreaksState.tieBreaks = [
      { type: 'points' },
      { type: 'buchholz_median' },
    ] as TieBreak[]
    renderForm()
    fireEvent.click(screen.getByRole('tab', { name: 'tournament.edit.tabs.settings' }))

    const select = tieBreakSelect()
    expect(select.value).toBe('buchholz')
    expect(select.value).not.toBe('buchholz_median')
  })
})
