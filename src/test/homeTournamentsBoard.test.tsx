import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PublicTournamentsBoard } from '../components/home/PublicTournamentsBoard.tsx'
import type { Tournament } from '../domain/tournament.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  user: { id: 'user-1', role: 'user' } as unknown,
  firebaseUser: { uid: 'user-1' } as unknown,
  isAuthenticated: true,
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

vi.mock('../hooks/useAssociations.ts', () => ({
  useMyAssociations: () => ({ data: [] }),
  useAssociationsByIds: () => [],
}))

vi.mock('../hooks/useEvents.ts', () => ({
  useEventsByIds: () => ({ eventsById: new Map() }),
}))

const sectionsState = vi.hoisted(() => ({
  calls: [] as Array<{ status: string; filters: Record<string, unknown> }>,
  items: [] as Tournament[],
  hasNextPage: false,
  counts: { finished: 5, ongoing: 3, upcoming: 12 } as Record<string, number>,
}))

vi.mock('../hooks/usePublicTournaments.ts', () => ({
  PUBLIC_TOURNAMENTS_PAGE_SIZE: 30,
  usePublicTournamentsSection: vi.fn(
    ({ status, filters }: { status: string; filters: Record<string, unknown> }) => {
      sectionsState.calls.push({ status, filters })
      return {
        data: { pages: [{ items: sectionsState.items, nextCursor: null }] },
        isLoading: false,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: sectionsState.hasNextPage,
        isFetchingNextPage: false,
      }
    }
  ),
  usePublicTournamentCount: vi.fn(({ status }: { status: string }) => ({
    data: sectionsState.counts[status],
  })),
}))

vi.mock('../components/home/TournamentFiltersForm.tsx', () => ({
  EMPTY_TOURNAMENT_FILTERS: { title: '', startFrom: '', startTo: '', country: '', city: '' },
  TournamentFiltersForm: ({
    onApply,
    onCancel,
  }: {
    onApply: (v: Record<string, string>) => void
    onCancel: () => void
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onApply({ title: 'cup', startFrom: '', startTo: '', country: 'JP', city: '' })}
      >
        apply-probe
      </button>
      <button type="button" onClick={onCancel}>
        cancel-probe
      </button>
    </div>
  ),
}))

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: '01890a5d-ac96-774b-bcce-b302099a8057',
    slug: 't-1',
    createdBy: 'creator-1',
    hostAssociation: null,
    parentEvent: null,
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    status: 'finished',
    isPublic: true,
    publishedRounds: 1,
    startYearMonth: '202607',
    startAt: new Date('2026-07-01T00:00:00Z'),
    locales: { ru: { title: 'Кубок' } },
    location: undefined,
    settings: {
      timeControl: { type: 'byoyomi', mainTime: 30, byoyomiTime: 60, byoyomiPeriods: 1 },
      tieBreaks: [],
      considerSente: false,
    },
    schedule: { rounds: [{ number: 1, scheduledAt: new Date('2026-07-01T00:00:00Z') }], events: [] },
    arbiter: undefined,
    participants: [],
    games: [],
    regulations: [],
    ...overrides,
  } as Tournament
}

function renderBoard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PublicTournamentsBoard />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  sectionsState.calls = []
  sectionsState.items = [makeTournament()]
  sectionsState.hasNextPage = false
  sectionsState.counts = { finished: 5, ongoing: 3, upcoming: 12 }
})

describe('PublicTournamentsBoard', () => {
  it('renders the heading and three tabs with counts', () => {
    renderBoard()

    expect(screen.getByText('home.title')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'home.tabs.finished (5)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'home.tabs.ongoing (3)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'home.tabs.upcoming (12)' })).toBeInTheDocument()
  })

  it('renders tournament cards for a section', () => {
    renderBoard()

    // The mocked hook returns the same page for every section, so expect the
    // card to appear at least once.
    expect(screen.getAllByRole('link', { name: 'Кубок' }).length).toBeGreaterThan(0)
  })

  it('shows a placeholder in the tab label while the count is loading', () => {
    sectionsState.counts = {}
    renderBoard()

    expect(
      screen.getByRole('tab', { name: 'home.tabs.finished (\u2026)' })
    ).toBeInTheDocument()
  })

  it('renders the show-more button when a section has more pages', () => {
    sectionsState.hasNextPage = true
    renderBoard()

    expect(screen.getAllByText('home.showMore').length).toBeGreaterThan(0)
  })

  it('applies filters and then resets them on cancel', async () => {
    renderBoard()
    const sectionCallsBefore = sectionsState.calls.length

    fireEvent.click(screen.getAllByText('apply-probe')[0])

    await waitFor(() => {
      const last = sectionsState.calls[sectionsState.calls.length - 1]
      expect(last.filters).toMatchObject({ country: 'JP' })
    })
    expect(sectionsState.calls.length).toBeGreaterThan(sectionCallsBefore)

    const callsAfterApply = sectionsState.calls.length
    fireEvent.click(screen.getAllByText('cancel-probe')[0])

    await waitFor(() => {
      const last = sectionsState.calls[sectionsState.calls.length - 1]
      expect(last.filters).toMatchObject({ country: undefined })
    })
    expect(sectionsState.calls.length).toBeGreaterThan(callsAfterApply)
  })
})
