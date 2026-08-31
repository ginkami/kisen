vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: { n?: number }) =>
      opts && opts.n != null ? `${k}:${opts.n}` : k,
    i18n: { language: 'ru' },
  }),
}))

import { render, screen, fireEvent } from '@testing-library/react'
import { TournamentResultsSection } from '../components/tournament/view/TournamentResultsSection.tsx'
import { containersFromGames } from '../components/tournament/pairings/pairingsModel.ts'
import type { Game, Participant } from '../domain/tournament.ts'

function makeP(id: number, familyName: string, rating: number | null): Participant {
  return {
    id,
    player: null,
    locales: { ru: { familyName, givenName: `И${id}` } } as unknown as Participant['locales'],
    nationality: 'jp',
    capturedRating: { value: rating, rank: null },
    startingPoints: 0,
  }
}

const p1 = makeP(1, 'Иванов', 2400)
const p2 = makeP(2, 'Петров', 2300)
const p3 = makeP(3, 'Сидоров', 2200)
const p4 = makeP(4, 'Кузнецов', 2100)
const participants = [p1, p2, p3, p4]

function makeGame(overrides: Partial<Game> & { round: number }): Game {
  return {
    id: `game-${Math.random().toString(36).slice(2)}`,
    player1: 0,
    player2: null,
    sente: 'unknown',
    handicap: null,
    result: null,
    status: 'not_started',
    ...overrides,
  }
}

function bodyRows(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('tbody tr'))
}

function rowTexts(row: HTMLElement): string[] {
  return Array.from(row.querySelectorAll('td')).map((td) => td.textContent ?? '')
}

describe('TournamentResultsSection', () => {
  it('renders tabs only for published rounds and defaults to the last one', () => {
    render(
      <TournamentResultsSection
        games={[]}
        participants={participants}
        roundCount={7}
        currentRound={3}
        considerSente={false}
      />,
    )
    for (const n of ['1', '2', '3']) {
      expect(screen.queryByRole('tab', { name: n })).not.toBeNull()
    }
    expect(screen.queryByRole('tab', { name: '4' })).toBeNull()
    // Default active round = last published
    expect(
      screen.getByText('tournament.view.results.round:3').textContent,
    ).toBe('tournament.view.results.round:3')
  })

  it('renders the empty state when no round is published', () => {
    const { container } = render(
      <TournamentResultsSection
        games={[]}
        participants={participants}
        roundCount={7}
        currentRound={0}
        considerSente={false}
      />,
    )
    expect(screen.getByText('tournament.view.results.noResults')).not.toBeNull()
    expect(screen.queryByRole('tab')).toBeNull()
    expect(container.querySelectorAll('table')).toHaveLength(0)
  })

  it('lists the boards in the same order as the pairings board, forfeits last', () => {
    // Round 1: 1 beat 2, 3 beat 4 → equal points; max rating orders (1v2) before (3v4)
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: 4, result: 'player1_won', status: 'completed' }),
      // Round 2 boards passed in reverse order
      makeGame({ id: 'g34', round: 2, player1: 3, player2: 4, status: 'live' }),
      makeGame({ id: 'g12', round: 2, player1: 1, player2: 2, status: 'live' }),
    ]
    // Forfeit for a distinct player not in another game of the round
    const p5 = makeP(5, 'Волков', 2000)
    games.push(
      makeGame({ id: 'g5f', round: 2, player1: 5, player2: null, status: 'forfeit', result: 'player2_won' }),
    )

    const { container } = render(
      <TournamentResultsSection
        games={games}
        participants={[...participants, p5]}
        roundCount={7}
        currentRound={3}
        considerSente={false}
      />,
    )
    // Switch to round 2
    fireEvent.click(screen.getByRole('tab', { name: '2' }))

    const rows = bodyRows(container)
    const expectedPairOrder = containersFromGames(games, [...participants, p5], 2).games.map(
      (g) => g.id,
    )
    expect(expectedPairOrder).toEqual(['g12', 'g34'])
    // Rows: pair rows in board order, then the forfeit row
    expect(rows).toHaveLength(3)
    expect(rowTexts(rows[0])).toContain('Иванов, И1')
    expect(rowTexts(rows[0])).toContain('Петров, И2')
    expect(rowTexts(rows[1])).toContain('Сидоров, И3')
    expect(rowTexts(rows[1])).toContain('Кузнецов, И4')
    expect(rowTexts(rows[2])).toContain('Волков, И5')
    expect(rowTexts(rows[2])).toContain('-')
    // Sequential pair numbers 1..3
    expect(rowTexts(rows[0])[0]).toBe('1')
    expect(rowTexts(rows[1])[0]).toBe('2')
    expect(rowTexts(rows[2])[0]).toBe('3')
  })

  it('maps result values to symbols', () => {
    const games: Game[] = [
      makeGame({ id: 'a', round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ id: 'b', round: 1, player1: 3, player2: 4, result: 'player2_won', status: 'completed' }),
    ]
    const { container } = render(
      <TournamentResultsSection
        games={games}
        participants={participants}
        roundCount={1}
        currentRound={1}
        considerSente={false}
      />,
    )
    const rows = bodyRows(container)
    expect(rowTexts(rows[0])).toContain('+ : -')
    expect(rowTexts(rows[1])).toContain('- : +')
  })

  it('renders ? : ? for games without a result and = : = for draws', () => {
    const games: Game[] = [
      makeGame({ id: 'a', round: 1, player1: 1, player2: 2, result: null, status: 'live' }),
      makeGame({ id: 'b', round: 1, player1: 3, player2: 4, result: 'draw', status: 'completed' }),
    ]
    const { container } = render(
      <TournamentResultsSection
        games={games}
        participants={participants}
        roundCount={1}
        currentRound={1}
        considerSente={false}
      />,
    )
    const rows = bodyRows(container)
    expect(rowTexts(rows[0])).toContain('? : ?')
    expect(rowTexts(rows[1])).toContain('= : =')
  })

  it('renders bye rows with + and empty player-2 cells, draw-bye with =', () => {
    const games: Game[] = [
      makeGame({ id: 'a', round: 1, player1: 1, player2: null, status: 'bye', result: 'player1_won' }),
      makeGame({ id: 'b', round: 1, player1: 2, player2: null, status: 'bye', result: 'draw' }),
    ]
    const { container } = render(
      <TournamentResultsSection
        games={games}
        participants={participants}
        roundCount={1}
        currentRound={1}
        considerSente={false}
      />,
    )
    const rows = bodyRows(container)
    expect(rowTexts(rows[0])).toContain('+')
    expect(rowTexts(rows[0])).toContain('Иванов, И1')
    expect(rowTexts(rows[0])).not.toContain('Петров, И2')
    expect(rowTexts(rows[0])).not.toContain('Сидоров, И3')
    expect(rowTexts(rows[0])).not.toContain('Кузнецов, И4')
    expect(rowTexts(rows[1])).toContain('=')
  })

  it('shows points accumulated before the active round', () => {
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
      makeGame({ round: 1, player1: 3, player2: 4, result: 'draw', status: 'completed' }),
      makeGame({ round: 2, player1: 1, player2: 3, status: 'live' }),
      makeGame({ round: 2, player1: 2, player2: 4, status: 'live' }),
    ]
    const { container } = render(
      <TournamentResultsSection
        games={games}
        participants={participants}
        roundCount={2}
        currentRound={2}
        considerSente={false}
      />,
    )
    const rows = bodyRows(container)
    // Row 1: p1 (1 pt before round 2) vs p3 (0.5); Row 2: p2 (0) vs p4 (0.5)
    expect(rowTexts(rows[0])).toContain('1')
    expect(rowTexts(rows[0])).toContain('0.5')
    expect(rowTexts(rows[1])).toContain('0')
    expect(rowTexts(rows[1])).toContain('0.5')
  })

  it('shows ratings from capturedRating', () => {
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: 2, status: 'live' }),
    ]
    const { container } = render(
      <TournamentResultsSection
        games={games}
        participants={[p1, p2]}
        roundCount={1}
        currentRound={1}
        considerSente={false}
      />,
    )
    const row = bodyRows(container)[0]
    expect(rowTexts(row)).toContain('2400')
    expect(rowTexts(row)).toContain('2300')
  })

  it('shows ☗/☖ name headers when considerSente is true, empty otherwise', () => {
    const games: Game[] = [
      makeGame({ round: 1, player1: 1, player2: 2, sente: 'player1', status: 'live' }),
    ]
    const { container, unmount } = render(
      <TournamentResultsSection
        games={games}
        participants={[p1, p2]}
        roundCount={1}
        currentRound={1}
        considerSente={true}
      />,
    )
    const head = container.querySelector('thead')!
    expect(head.textContent).toContain('☗')
    expect(head.textContent).toContain('☖')
    unmount()

    const { container: c2 } = render(
      <TournamentResultsSection
        games={games}
        participants={[p1, p2]}
        roundCount={1}
        currentRound={1}
        considerSente={false}
      />,
    )
    const head2 = c2.querySelector('thead')!
    expect(head2.textContent).not.toContain('☗')
    expect(head2.textContent).not.toContain('☖')
  })

  it('renders the localized round label with the active round number', () => {
    const games: Game[] = [
      makeGame({ round: 2, player1: 1, player2: 2, status: 'live' }),
    ]
    render(
      <TournamentResultsSection
        games={games}
        participants={[p1, p2]}
        roundCount={2}
        currentRound={2}
        considerSente={false}
      />,
    )
    expect(screen.getByText('tournament.view.results.round:2')).not.toBeNull()
  })
})

