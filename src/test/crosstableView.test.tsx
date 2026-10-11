vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'ru' },
  }),
}))

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CrosstableView } from '../components/tournament/view/CrosstableView.tsx'
import { getCountryName } from '../utils/countries.ts'
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

function renderView(overrides: Partial<Parameters<typeof CrosstableView>[0]> = {}) {
  return render(
    <CrosstableView
      games={games}
      participants={[p1, p2, p3]}
      publishedRounds={3}
      considerSente={false}
      tieBreaks={tieBreaks}
      {...overrides}
    />,
  )
}

// Match rows by the name cell's own name span. Tooltip cards render in a
// portal now, but the in-cell lookup remains the reliable row key.
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

const user = userEvent.setup()

/** Hover a cell's tooltip trigger wrapper and return the open bubble (role=tooltip, portaled to body). */
async function openTooltip(trigger: HTMLElement | null): Promise<HTMLElement> {
  expect(trigger).not.toBeNull()
  await user.hover(trigger as HTMLElement)
  return await screen.findByRole('tooltip')
}

/** Opponent card wrappers (the `display: contents` divs) inside the bubble's grid. */
function cardsIn(bubble: HTMLElement): HTMLElement[] {
  const grid = bubble.querySelector('.grid')
  if (!grid) throw new Error('opponent card grid not found in tooltip')
  return Array.from(grid.querySelectorAll(':scope > div')) as HTMLElement[]
}

describe('CrosstableView opponent tooltips', () => {
  it('hides unpublished rounds: games beyond publishedRounds are not rendered', async () => {
    // Round 4 pairings exist but the draw is not published yet.
    const unpublished = makeGame({ id: 'g5', round: 4, player1: 1, player2: 2, result: null, status: 'not_started' })
    const { container } = renderView({ games: [...games, unpublished] })
    // Only three round columns are rendered (place, flag, rank, name,
    // residence, rating + one cell per published round + one tie-break).
    const cells = rowBy(container, 'Иванов').querySelectorAll('td')
    expect(cells).toHaveLength(6 + 3 + 1)
    // The name tooltip lists published games only — the round-4 opponent is absent.
    const nameCell = rowBy(container, 'Иванов').querySelectorAll('td')[3] as HTMLElement
    const c = await openTooltip(nameCell.querySelector(':scope > span'))
    expect(c.textContent).toContain('Петров, И2')
    expect(cardsIn(c)).toHaveLength(1)
  })

  it('shows the opponent card on a paired result cell, from the hovered player perspective', async () => {
    const { container } = renderView()
    const cell = roundCellOf(rowBy(container, 'Иванов'), 1)
    const c = await openTooltip(cell.querySelector(':scope > span'))
    const text = c.textContent ?? ''
    expect(text).toContain('Петров, И2')
    expect(text).toContain('2300')
    // Петров: 0 tournament points (lost round 1, round 2 unfinished)
    expect(c.querySelector('.badge-primary')?.textContent).toBe('0')
    expect(c.querySelector('.badge-success')?.textContent).toBe('+')
  })

  it('shows no tooltip on bye, forfeit, and empty cells', async () => {
    const { container } = renderView()
    expect(screen.queryByRole('tooltip')).toBeNull()
    await user.hover(roundCellOf(rowBy(container, 'Иванов'), 3)) // bye
    expect(screen.queryByRole('tooltip')).toBeNull()
    await user.hover(roundCellOf(rowBy(container, 'Сидоров'), 3)) // forfeit
    expect(screen.queryByRole('tooltip')).toBeNull()
    await user.hover(roundCellOf(rowBy(container, 'Иванов'), 2)) // no game
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('lists all opponent cards in the name tooltip, byes omitted, forfeit result-only', async () => {
    const { container } = renderView()
    const nameCell = rowBy(container, 'Иванов').querySelectorAll('td')[3] as HTMLElement
    const trigger = nameCell.querySelector<HTMLElement>(':scope > span')
    const c = await openTooltip(trigger)
    // Only the round-1 opponent; the round-3 bye is omitted
    expect(c.textContent).toContain('Петров, И2')
    expect(c.textContent).not.toContain('Сидоров, И3')
    expect(cardsIn(c)).toHaveLength(1)

    await user.unhover(trigger as HTMLElement)
    expect(screen.queryByRole('tooltip')).toBeNull()

    // p3: round-2 card vs p2 (?), round-3 forfeit → result-only card
    const nameCell3 = (rowBy(container, 'Сидоров').querySelectorAll('td')[3] as HTMLElement)
    const c3 = await openTooltip(nameCell3.querySelector(':scope > span'))
    const cards3 = cardsIn(c3)
    expect(cards3).toHaveLength(2)
    expect(cards3[0].textContent).toContain('Петров, И2')
    expect(cards3[1].textContent).toBe('-') // result-only forfeit card
    expect(cards3[1].querySelector('.badge-error')).not.toBeNull()
  })

  it('renders result badges from the hovered player perspective', async () => {
    const { container } = renderView()
    // p2 lost r1 to p1 → '-' error badge in p2's name tooltip
    const nameCell2 = rowBy(container, 'Петров').querySelectorAll('td')[3] as HTMLElement
    const c2 = await openTooltip(nameCell2.querySelector(':scope > span'))
    const cards2 = cardsIn(c2)
    expect(cards2).toHaveLength(2)
    expect(cards2[0].querySelector('.badge-error')?.textContent).toBe('-')
    // r2 game has no result → '?' on base-300
    expect(cards2[1].querySelector('.bg-base-300')?.textContent).toBe('?')
  })

  it('shows country and title tooltips inside the opponent card', async () => {
    const titled: Participant = {
      ...p2,
      capturedRating: { value: 2300, rank: '1d' },
      locales: { ru: { familyName: 'Петров', givenName: 'И2', title: 'Титул' } } as unknown as Participant['locales'],
    }
    const { container } = renderView({ participants: [p1, titled, p3] })
    const cell = roundCellOf(rowBy(container, 'Иванов'), 1)
    const bubble = await openTooltip(cell.querySelector(':scope > span'))

    // The card's flag carries a country-name tooltip (spec: opponent hover cards).
    // useHover opens via natively-bound mouseenter, so dispatch it directly.
    const flagTrigger = bubble.querySelector('.grid .contents > span')
    expect(flagTrigger).not.toBeNull()
    fireEvent.mouseEnter(flagTrigger!)
    const tipsAfterFlag = await screen.findAllByRole('tooltip')
    expect(tipsAfterFlag.map((el) => el.textContent)).toContain(getCountryName('jp', 'ru'))

    // The card's crown icon carries the opponent's title tooltip.
    // mouseenter does not bubble, so dispatch it on the Tooltip's trigger
    // wrapper (the element the native listener is bound to), not the svg.
    const crown = bubble.querySelector('.badge svg')
    expect(crown).not.toBeNull()
    const crownTrigger = crown!.closest('span')
    expect(crownTrigger).not.toBeNull()
    fireEvent.mouseEnter(crownTrigger!)
    const tipsAfterCrown = await screen.findAllByRole('tooltip')
    expect(tipsAfterCrown.map((el) => el.textContent)).toContain('Титул')
  })
})
