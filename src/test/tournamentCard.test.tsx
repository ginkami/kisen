import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TournamentCard } from '../components/home/TournamentCard.tsx'
import type { Association } from '../domain/association.ts'
import type { Event } from '../domain/event.ts'
import type { Tournament } from '../domain/tournament.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const START = new Date('2026-07-18T06:30:00Z')

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: '01890a5d-ac96-774b-bcce-b302099a8057',
    slug: 't-1',
    createdBy: 'creator-1',
    hostAssociation: null,
    parentEvent: null,
    updatedAt: START,
    status: 'finished',
    isPublic: true,
    publishedRounds: 3,
    startYearMonth: '202607',
    startAt: START,
    locales: { ru: { title: 'Летний турнир' } },
    location: {
      country: 'JP',
      locales: { ru: { settlement: 'Токио' } },
    },
    settings: {
      timeControl: { type: 'byoyomi', mainTime: 30, byoyomiTime: 60, byoyomiPeriods: 1 },
      tieBreaks: [],
      considerSente: false,
    },
    schedule: {
      rounds: [{ number: 1, scheduledAt: START }],
      events: [],
    },
    arbiter: undefined,
    participants: [{ id: 1 }, { id: 2 }] as Tournament['participants'],
    games: [],
    regulations: [],
    ...overrides,
  } as Tournament
}

function makeEvent(): Event {
  return {
    id: '01890a5d-ac96-774b-bcce-b302099a8058',
    slug: 'summer-fest',
    locales: { ru: { title: 'Летний фестиваль' } },
  } as unknown as Event
}

function makeAssociation(): Association {
  return {
    id: '01890a5d-ac96-774b-bcce-b302099a8059',
    slug: 'nihon-shogi',
    locales: { ru: { title: 'Ассоциация Японии' } },
  } as unknown as Association
}

function renderCard(props: {
  tournament?: Tournament
  parentEvent?: Event | null
  association?: Association | null
  canEdit?: boolean
}) {
  return render(
    <MemoryRouter>
      <TournamentCard
        tournament={props.tournament ?? makeTournament()}
        parentEvent={props.parentEvent ?? null}
        association={props.association ?? null}
        canEdit={props.canEdit ?? false}
      />
    </MemoryRouter>
  )
}

describe('TournamentCard', () => {
  it('renders the title as a link to the tournament page by slug', () => {
    renderCard({})
    const link = screen.getByRole('link', { name: 'Летний турнир' })
    expect(link).toHaveAttribute('href', '/tournaments/t-1')
  })

  it('renders the parent event title as a smaller link by slug', () => {
    renderCard({ parentEvent: makeEvent() })
    const link = screen.getByRole('link', { name: 'Летний фестиваль' })
    expect(link).toHaveAttribute('href', '/events/summer-fest')
  })

  it('shows the meta row with dates, time control, participants and rounds', () => {
    renderCard({})
    expect(screen.getByText('tournament.view.playersCount')).toBeInTheDocument()
    expect(screen.getByText('tournament.view.roundsCount')).toBeInTheDocument()
  })

  it('shows the association badge and country with settlement', () => {
    renderCard({ association: makeAssociation() })
    expect(screen.getByText('Ассоциация Японии')).toBeInTheDocument()
    expect(screen.getByText(/Япония/)).toBeInTheDocument()
    expect(screen.getByText(/Токио/)).toBeInTheDocument()
  })

  it('shows the edit icon only for users who may edit', () => {
    const { rerender } = renderCard({ canEdit: true })
    const editIcon = screen.getByRole('link', { name: 'home.editTournament' })
    expect(editIcon).toHaveAttribute(
      'href',
      '/tournaments/01890a5d-ac96-774b-bcce-b302099a8057/edit'
    )

    rerender(
      <MemoryRouter>
        <TournamentCard
          tournament={makeTournament()}
          parentEvent={null}
          association={null}
          canEdit={false}
        />
      </MemoryRouter>
    )
    expect(
      screen.queryByRole('link', { name: 'home.editTournament' })
    ).not.toBeInTheDocument()
  })
})
