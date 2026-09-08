import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { EventPage } from '../pages/EventPage.tsx'
import { eventService } from '../services/eventService.ts'
import { tournamentService } from '../services/tournamentService.ts'
import { regulationService } from '../services/regulationService.ts'
import type { Event } from '../domain/event.ts'
import type { Tournament } from '../domain/tournament.ts'

const i18nState = vi.hoisted(() => ({ language: 'ru' }))

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key === 'event.view.pageTitle' ? `${opts?.title} | shogi·world` : key,
    i18n: { language: i18nState.language },
  }),
}))

vi.mock('../services/eventService.ts', () => ({
  eventService: { getById: vi.fn(), getBySlug: vi.fn() },
}))

vi.mock('../services/tournamentService.ts', () => ({
  tournamentService: { getById: vi.fn(), getBySlug: vi.fn(), list: vi.fn() },
}))

vi.mock('../services/regulationService.ts', () => ({
  regulationService: { getById: vi.fn() },
}))

const mockedEventGetById = vi.mocked(eventService.getById)
const mockedEventGetBySlug = vi.mocked(eventService.getBySlug)
const mockedTournamentGetById = vi.mocked(tournamentService.getById)
const mockedTournamentGetBySlug = vi.mocked(tournamentService.getBySlug)
const mockedTournamentList = vi.mocked(tournamentService.list)
const mockedRegulationGetById = vi.mocked(regulationService.getById)

const EVENT_ID = '0198b4a0-0000-7000-8000-000000000001'
const EVENT_SLUG = 'city-open'

function makeEvent(part: Partial<Event> = {}): Event {
  return {
    id: EVENT_ID,
    slug: EVENT_SLUG,
    createdBy: 'user-1',
    hostAssociation: null,
    regulations: [],
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    startYearMonth: '202608',
    locales: { ru: { title: 'EVENT_TITLE' } },
    ...part,
  } as Event
}

function makeTournament(part: Partial<Tournament>): Tournament {
  return {
    id: '00000000-0000-7000-0000-000000000001',
    slug: 't-one',
    createdBy: 'user-1',
    hostAssociation: null,
    parentEvent: EVENT_ID,
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    status: 'upcoming',
    isPublic: true,
    publishedRounds: 0,
    startYearMonth: '202608',
    locales: { ru: { title: 'T1' } },
    location: { locales: { ru: {}, en: {} } },
    regulations: [],
    settings: {
      timeControl: { type: 'byoyomi', mainTime: 40, byoyomiTime: 30, byoyomiPeriods: 3 },
      tieBreaks: [{ type: 'points' }],
      considerSente: false,
    },
    schedule: { events: [], rounds: [] },
    arbiter: { locales: { ru: { givenName: '', familyName: '' }, en: { givenName: '', familyName: '' } } },
    participants: [],
    games: [],
    ...part,
  } as Tournament
}

function renderEventPage(param: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/events/${param}`]}>
        <Routes>
          <Route path="/events/:slug" element={<EventPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  i18nState.language = 'ru'
  mockedEventGetById.mockReset()
  mockedEventGetBySlug.mockReset()
  mockedTournamentGetById.mockReset()
  mockedTournamentGetBySlug.mockReset()
  mockedTournamentList.mockReset()
  mockedRegulationGetById.mockReset()
  mockedRegulationGetById.mockResolvedValue(null)
  document.title = ''
})

describe('EventPage routing and lookup', () => {
  it('loads by id when the param is a UUID', async () => {
    mockedEventGetById.mockResolvedValue(makeEvent())
    mockedTournamentList.mockResolvedValue([])
    const { container } = renderEventPage(EVENT_ID)
    await waitFor(() => expect(container.textContent).toContain('EVENT_TITLE'))
    expect(mockedEventGetById).toHaveBeenCalledWith(EVENT_ID)
    expect(mockedEventGetBySlug).not.toHaveBeenCalled()
  })

  it('loads by slug when the param is not a UUID', async () => {
    mockedEventGetBySlug.mockResolvedValue(makeEvent())
    mockedTournamentList.mockResolvedValue([])
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(container.textContent).toContain('EVENT_TITLE'))
    expect(mockedEventGetBySlug).toHaveBeenCalledWith(EVENT_SLUG)
    expect(mockedEventGetById).not.toHaveBeenCalled()
  })

  it('shows the not-found state for a missing event', async () => {
    mockedEventGetBySlug.mockResolvedValue(null)
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(container.textContent).toContain('event.view.notFound'))
    expect(mockedTournamentList).not.toHaveBeenCalled()
  })

  it('shows the load-error state when the event query fails', async () => {
    mockedEventGetBySlug.mockRejectedValue(new Error('boom'))
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(container.textContent).toContain('event.view.errors.load'))
  })
})

describe('EventPage header', () => {
  it('renders the localized title and sets document.title in the description branch', async () => {
    mockedEventGetBySlug.mockResolvedValue(makeEvent())
    mockedTournamentList.mockResolvedValue([])
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(container.textContent).toContain('EVENT_TITLE'))
    expect(document.title).toBe('EVENT_TITLE | shogi·world')
  })

  it('sets document.title to the event title in the tournament branch', async () => {
    mockedEventGetBySlug.mockResolvedValue(makeEvent())
    const t1 = makeTournament({})
    mockedTournamentList.mockResolvedValue([t1])
    mockedTournamentGetById.mockResolvedValue(t1)
    mockedEventGetById.mockResolvedValue(makeEvent())
    renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(mockedTournamentGetById).toHaveBeenCalledWith(t1.id))
    await waitFor(() => expect(document.title).toBe('EVENT_TITLE | shogi·world'))
  })
})

describe('EventPage tournament branch', () => {
  it('renders the latest public tournament in place', async () => {
    mockedEventGetBySlug.mockResolvedValue(makeEvent())
    const t1 = makeTournament({
      id: '00000000-0000-7000-0000-000000000001',
      locales: { ru: { title: 'TOUR_ONE' } },
      schedule: { events: [], rounds: [{ number: 1, scheduledAt: new Date('2026-08-10T10:00:00Z') }] },
    })
    const t2 = makeTournament({
      id: '00000000-0000-7000-0000-000000000002',
      locales: { ru: { title: 'TOUR_TWO' } },
      schedule: { events: [], rounds: [{ number: 1, scheduledAt: new Date('2026-08-12T10:00:00Z') }] },
    })
    mockedTournamentList.mockResolvedValue([t1, t2])
    mockedTournamentGetById.mockResolvedValue(t2)
    mockedEventGetById.mockResolvedValue(makeEvent())
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(container.textContent).toContain('TOUR_TWO'))
    expect(mockedTournamentGetById).toHaveBeenCalledWith(t2.id)
    expect(mockedTournamentGetBySlug).not.toHaveBeenCalled()
  })

  it('tie-breaks the latest pick by id when start times are equal', async () => {
    mockedEventGetBySlug.mockResolvedValue(makeEvent())
    const start = new Date('2026-08-10T10:00:00Z')
    const t1 = makeTournament({
      id: '00000000-0000-7000-0000-000000000001',
      schedule: { events: [], rounds: [{ number: 1, scheduledAt: start }] },
    })
    const t2 = makeTournament({
      id: '00000000-0000-7000-0000-000000000002',
      schedule: { events: [], rounds: [{ number: 1, scheduledAt: start }] },
    })
    mockedTournamentList.mockResolvedValue([t1, t2])
    mockedTournamentGetById.mockResolvedValue(t2)
    mockedEventGetById.mockResolvedValue(makeEvent())
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(mockedTournamentGetById).toHaveBeenCalledWith(t2.id))
    await waitFor(() => expect(container.textContent).toContain('T1'))
  })

  it('shows the event h1 and a spinner while the tournament list is loading', async () => {
    mockedEventGetBySlug.mockResolvedValue(makeEvent())
    mockedTournamentList.mockImplementation(() => new Promise(() => {}))
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(container.textContent).toContain('EVENT_TITLE'))
    expect(container.querySelector('.loading-spinner')).not.toBeNull()
    expect(mockedTournamentGetById).not.toHaveBeenCalled()
  })

  it('shows the load-error state when the tournament list fails', async () => {
    mockedEventGetBySlug.mockResolvedValue(makeEvent())
    mockedTournamentList.mockRejectedValue(new Error('boom'))
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(container.textContent).toContain('event.view.errors.load'))
  })
})

describe('EventPage description branch', () => {
  it('renders the event description followed by all event regulations in order', async () => {
    mockedEventGetBySlug.mockResolvedValue(
      makeEvent({ locales: { ru: { title: 'EVENT_TITLE', description: 'EVENT_DESC' } }, regulations: ['reg-a', 'reg-b'] })
    )
    mockedTournamentList.mockResolvedValue([])
    mockedRegulationGetById.mockImplementation(async (id: string) => ({
      id,
      createdBy: 'user-1',
      association: null,
      updatedAt: new Date(),
      locales: { ru: { title: `Reg ${id}`, description: `BODY_${id}` } },
    } as never))
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(container.textContent).toContain('BODY_reg-b'))

    const text = container.textContent ?? ''
    expect(text).toContain('EVENT_DESC')
    expect(text.indexOf('EVENT_DESC')).toBeLessThan(text.indexOf('BODY_reg-a'))
    expect(text.indexOf('BODY_reg-a')).toBeLessThan(text.indexOf('BODY_reg-b'))
    expect(mockedRegulationGetById).toHaveBeenCalledWith('reg-a')
    expect(mockedRegulationGetById).toHaveBeenCalledWith('reg-b')
  })

  it('falls back to ru content when the current locale has no text', async () => {
    i18nState.language = 'en'
    mockedEventGetBySlug.mockResolvedValue(
      makeEvent({
        locales: { ru: { title: 'EVENT_TITLE', description: 'RU_EVENT_DESC' } },
        regulations: ['reg-ru'],
      })
    )
    mockedTournamentList.mockResolvedValue([])
    mockedRegulationGetById.mockImplementation(async (id: string) => ({
      id,
      createdBy: 'user-1',
      association: null,
      updatedAt: new Date(),
      locales: { ru: { title: `Reg ${id}`, description: `RU_BODY_${id}` } },
    } as never))
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(container.textContent).toContain('RU_BODY_reg-ru'))
    expect(container.textContent).toContain('RU_EVENT_DESC')
  })

  it('renders only the h1 when the event has no content', async () => {
    mockedEventGetBySlug.mockResolvedValue(makeEvent())
    mockedTournamentList.mockResolvedValue([])
    const { container } = renderEventPage(EVENT_SLUG)
    await waitFor(() => expect(container.textContent).toContain('EVENT_TITLE'))
    // No collapse sections rendered
    expect(container.querySelectorAll('details')).toHaveLength(0)
  })
})