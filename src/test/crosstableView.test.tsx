vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'ru' },
  }),
}))

import { render } from '@testing-library/react'
import { CrosstableView } from '../components/tournament/view/CrosstableView.tsx'
import type { Game, Participant } from '../domain/tournament.ts'
import type { TieBreak } from '../domain/tieBreak.ts'

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

// r1: p1 beat p2; r2: p2 vs p3 without result; r3: p1 bye, p3 forfeit
const games: Game[] = [
  makeGame({ id: 'g1', round: 1, player1: 1, player2: 2, result: 'player1_won', status: 'completed' }),
  makeGame({ id: 'g2', round: 2, player1: 2, player2: 3, result: null, status: 'live' }),
  makeGame({ id: 'g3', round: 3, player1: 1, player2: null, result: 'player1_won', status: 'bye' }),
  makeGame({ id: 'g4', round: 3, player1: 3, player2: null, result: 'player2_won', status: 'forfeit' }),
]

const tieBreaks: TieBreak[] = [{ type: 'points' }]

function renderView() {
  return render(
    <CrosstableView
      games={games}
      participants={[p1, p2, p3]}
      roundCount={3}
      currentRound={3}
      considerSente={false}
      tieBreaks={tieBreaks}
    />,
  )
}

// Match rows by the name cell's own name span — tooltip cards embed other
// participants' names into the row text, so tr.textContent is not reliable.
function rowBy(container: HTMLElement, name: string): HTMLElement {
  const row = Array.from(container.querySelectorAll('tbody tr')).find((tr) => {
    const td = (tr as HTMLElement).querySelectorAll('td')[3] as HTMLElement | undefined
    if (!td) return false
    const span =
      td.querySelector(':scope > span > span') ?? td.querySelector(':scope > span')
    return (span?.textContent ?? '').startsWith(name)
  })
  if (!row) throw new Error(`row not found: ${name}`)
  return row as HTMLElement
}

function roundCellOf(row: HTMLElement, round: number): HTMLElement {
  // cells: place, flag, rank, name, residence, rating, then one per round
  return row.querySelectorAll('td')[5 + round] as HTMLElement
}

function card(cell: HTMLElement): HTMLElement | null {
  return cell.querySelector('.tooltip-content')
}

describe('CrosstableView opponent tooltips', () => {
  it('shows the opponent card on a paired result cell, from the hovered player perspective', () => {
    const { container } = renderView()
    const c = card(roundCellOf(rowBy(container, 'Иванов'), 1))
    expect(c).not.toBeNull()
    const text = c!.textContent ?? ''
    expect(text).toContain('Петров, И2')
    expect(text).toContain('2300')
    // Петров: 0 tournament points (lost round 1, round 2 unfinished)
    expect(c!.querySelector('.badge-primary')?.textContent).toBe('0')
    expect(c!.querySelector('.badge-success')?.textContent).toBe('+')
  })

  it('shows no tooltip on bye, forfeit, and empty cells', () => {
    const { container } = renderView()
    expect(card(roundCellOf(rowBy(container, 'Иванов'), 3))).toBeNull() // bye
    expect(card(roundCellOf(rowBy(container, 'Сидоров'), 3))).toBeNull() // forfeit
    expect(card(roundCellOf(rowBy(container, 'Иванов'), 2))).toBeNull() // no game
  })

  it('lists all opponent cards in the name tooltip, byes omitted, forfeit result-only', () => {
    const { container } = renderView()
    const nameCell = rowBy(container, 'Иванов').querySelectorAll('td')[3] as HTMLElement
    const c = nameCell.querySelector('.tooltip-content')
    expect(c).not.toBeNull()
    // Only the round-1 opponent; the round-3 bye is omitted
    expect(c!.textContent).toContain('Петров, И2')
    expect(c!.textContent).not.toContain('Сидоров, И3')
    expect(c!.querySelectorAll(':scope > div')).toHaveLength(1)

    // p3: round-2 card vs p2 (?), round-3 forfeit → result-only card
    const c3 = (rowBy(container, 'Сидоров').querySelectorAll('td')[3] as HTMLElement)
      .querySelector('.tooltip-content')
    expect(c3).not.toBeNull()
    const cards3 = Array.from(c3!.querySelectorAll(':scope > div'))
    expect(cards3).toHaveLength(2)
    expect(cards3[0].textContent).toContain('Петров, И2')
    expect(cards3[1].textContent).toBe('-') // result-only forfeit card
    expect(cards3[1].querySelector('.badge-error')).not.toBeNull()
  })

  it('renders result badges from the hovered player perspective', () => {
    const { container } = renderView()
    // p2 lost r1 to p1 → '-' error badge in p2's name tooltip
    const c2 = (rowBy(container, 'Петров').querySelectorAll('td')[3] as HTMLElement)
      .querySelector('.tooltip-content')!
    const cards2 = Array.from(c2.querySelectorAll(':scope > div'))
    expect(cards2).toHaveLength(2)
    expect(cards2[0].querySelector('.badge-error')?.textContent).toBe('-')
    // r2 game has no result → '?' on base-300
    expect(cards2[1].querySelector('.bg-base-300')?.textContent).toBe('?')
  })
})
