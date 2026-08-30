import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TournamentDescriptionSection } from '../components/tournament/view/TournamentDescriptionSection.tsx'
import { regulationService } from '../services/regulationService.ts'
import type { Event } from '../domain/event.ts'
import type { Tournament } from '../domain/tournament.ts'
import type { Regulation } from '../domain/regulation.ts'

const i18nState = vi.hoisted(() => ({ language: 'ru' }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: i18nState.language } }),
}))

vi.mock('../services/regulationService.ts', () => ({
  regulationService: { getById: vi.fn() },
}))

const mockedGetById = vi.mocked(regulationService.getById)

function makeRegulation(id: string, description: string): Regulation {
  return {
    id,
    createdBy: 'user-1',
    association: null,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    locales: { ru: { title: `Reg ${id}`, description } },
  } as Regulation
}

function makeTournament(part: Partial<Tournament>): Tournament {
  return part as Tournament
}

function makeEvent(part: Partial<Event>): Event {
  return part as Event
}

function renderSection(tournament: Tournament, event: Event | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TournamentDescriptionSection tournament={tournament} event={event} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  i18nState.language = 'ru'
  mockedGetById.mockReset()
})

describe('TournamentDescriptionSection', () => {
  it('renders content in order: event description, tournament description, event regulations, tournament regulations', async () => {
    mockedGetById.mockImplementation(async (id: string) =>
      makeRegulation(id, `# ${id}\nbody of ${id}`)
    )
    const tournament = makeTournament({
      locales: { ru: { title: 'T', description: 'TOUR_DESC' } },
      regulations: ['reg-t'],
    })
    const event = makeEvent({
      locales: { ru: { title: 'E', description: 'EVENT_DESC' } },
      regulations: ['reg-e'],
    })
    const { container } = renderSection(tournament, event)
    await waitFor(() => expect(mockedGetById).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(container.textContent).toContain('body of reg-e'))

    const text = container.textContent ?? ''
    expect(text).toContain('TOUR_DESC')
    expect(text).toContain('reg-e')
    expect(text).toContain('reg-t')
    expect(text.indexOf('EVENT_DESC')).toBeLessThan(text.indexOf('TOUR_DESC'))
    expect(text.indexOf('TOUR_DESC')).toBeLessThan(text.indexOf('reg-e'))
    expect(text.indexOf('reg-e')).toBeLessThan(text.indexOf('reg-t'))
  })
  it('deduplicates regulations shared with the event, keeping the tournament copy', async () => {
    mockedGetById.mockImplementation(async (id: string) =>
      makeRegulation(id, `# ${id}\nbody of ${id}`)
    )
    const tournament = makeTournament({
      locales: { ru: { title: 'T', description: 'TOUR_DESC' } },
      regulations: ['reg-shared', 'reg-t'],
    })
    const event = makeEvent({
      locales: { ru: { title: 'E', description: 'EVENT_DESC' } },
      regulations: ['reg-shared', 'reg-e'],
    })
    const { container } = renderSection(tournament, event)
    await waitFor(() => expect(container.textContent).toContain('body of reg-t'))

    const text = container.textContent ?? ''
    expect(text.split('body of reg-shared').length - 1).toBe(1)
    expect(mockedGetById).toHaveBeenCalledWith('reg-shared')
    expect(mockedGetById).toHaveBeenCalledWith('reg-e')
    expect(mockedGetById).toHaveBeenCalledWith('reg-t')
    expect(mockedGetById).toHaveBeenCalledTimes(3)
  })

  it('renders a standalone tournament without an event', async () => {
    mockedGetById.mockImplementation(async (id: string) => makeRegulation(id, `# ${id}\nbody`))
    const tournament = makeTournament({
      locales: { ru: { title: 'T', description: 'TOUR_DESC' } },
      regulations: ['reg-t'],
    })
    const { container } = renderSection(tournament, null)
    await waitFor(() => expect(container.textContent).toContain('TOUR_DESC'))
    await waitFor(() => expect(container.textContent).toContain('reg-t'))

    expect(container.textContent).not.toContain('EVENT_DESC')
    expect(mockedGetById).toHaveBeenCalledTimes(1)
    expect(mockedGetById).toHaveBeenCalledWith('reg-t')
  })

  it('falls back to the ru locale when the current locale is missing', async () => {
    i18nState.language = 'en'
    const regulation = {
      id: 'reg-ru',
      createdBy: 'user-1',
      association: null,
      updatedAt: new Date(),
      locales: { ru: { title: 'RU reg', description: 'RU_REG_DESC' } },
    } as Regulation
    mockedGetById.mockResolvedValue(regulation)
    const tournament = makeTournament({
      locales: { ru: { title: 'T', description: 'RU_TOUR_DESC' } },
      regulations: ['reg-ru'],
    })
    // i18n.language is 'en' here; en is missing, so content falls back to ru.
    const { container } = renderSection(tournament, null)
    await waitFor(() => expect(container.textContent).toContain('RU_REG_DESC'))
    expect(container.textContent).toContain('RU_TOUR_DESC')
  })

  it('renders nothing when there is no content', () => {
    const tournament = makeTournament({
      locales: { ru: { title: 'T' } },
      regulations: [],
    })
    const { container } = renderSection(tournament, null)
    expect(container.children).toHaveLength(0)
  })

  it('renders nothing when descriptions are empty and regulations are missing', async () => {
    mockedGetById.mockResolvedValue(null)
    const tournament = makeTournament({
      locales: { ru: { title: 'T', description: '   ' } },
      regulations: ['reg-missing'],
    })
    const { container } = renderSection(tournament, null)
    await waitFor(() => expect(mockedGetById).toHaveBeenCalled())
    await waitFor(() => expect(container.children).toHaveLength(0))
  })
})
