vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ru' } }),
}))

vi.mock('uuidv7', () => {
  let counter = 0
  return { uuidv7: () => `mock-uuid-${++counter}` }
})

import { render, screen, fireEvent } from '@testing-library/react'
import { PairingsBoard } from '../components/tournament/PairingsBoard.tsx'
import type { Game, Participant } from '../domain/tournament.ts'

function makeP(id: number, familyName: string): Participant {
  return {
    id,
    player: null,
    locales: { ru: { familyName, givenName: `И${id}` } } as unknown as Participant['locales'],
    capturedRating: { value: null, rank: null },
    startingPoints: 0,
  }
}

const p1 = makeP(1, 'Иванов')
const p2 = makeP(2, 'Петров')
const participants = [p1, p2]

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

describe('PairingsBoard handicap button', () => {
  it('single click cycles handicap forward after 250ms delay', () => {
    vi.useFakeTimers()

    const games: Game[] = [
      makeGame({ id: 'g1', round: 1, player1: 1, player2: 2, handicap: '-L', status: 'live' }),
    ]
    const onGamesChange = vi.fn()

    render(
      <PairingsBoard
        games={games}
        participants={participants}
        round={1}
        currentRound={1}
        considerSente={false}
        locale="ru"
        onGamesChange={onGamesChange}
      />,
    )

    const btn = screen.getByRole('button', { name: '-L' })
    fireEvent.click(btn, { detail: 1 })

    // Timer not yet fired — no call
    expect(onGamesChange).not.toHaveBeenCalled()

    // Advance past the 250ms delay
    vi.advanceTimersByTime(300)

    // Cycle forward: -L → -B
    expect(onGamesChange).toHaveBeenCalledTimes(1)
    const updated = onGamesChange.mock.calls[0][0] as Game[]
    const g = updated.find((g) => g.id === 'g1')!
    expect(g.handicap).toBe('-B')

    vi.useRealTimers()
  })

  it('double click resets handicap to null without advancing the cycle', () => {
    vi.useFakeTimers()

    const games: Game[] = [
      makeGame({ id: 'g1', round: 1, player1: 1, player2: 2, handicap: '-L', status: 'live' }),
    ]
    const onGamesChange = vi.fn()

    render(
      <PairingsBoard
        games={games}
        participants={participants}
        round={1}
        currentRound={1}
        considerSente={false}
        locale="ru"
        onGamesChange={onGamesChange}
      />,
    )

    const btn = screen.getByRole('button', { name: '-L' })

    // Simulate double-click sequence: first click (detail=1), second click (detail=2)
    fireEvent.click(btn, { detail: 1 })
    fireEvent.click(btn, { detail: 2 })

    // Reset should have fired immediately (detail >= 2 on the second click)
    expect(onGamesChange).toHaveBeenCalled()
    const lastCall = onGamesChange.mock.calls[onGamesChange.mock.calls.length - 1][0] as Game[]
    const g = lastCall.find((g) => g.id === 'g1')!
    expect(g.handicap).toBeNull()

    // No cycle call should have fired — the only value ever set should be null (reset)
    for (const call of onGamesChange.mock.calls) {
      const callGames = call[0] as Game[]
      const game = callGames.find((g) => g.id === 'g1')!
      expect(game.handicap).not.toBe('-B')
    }

    // Advance past the 250ms delay — no additional calls from orphaned timers
    const callCount = onGamesChange.mock.calls.length
    vi.advanceTimersByTime(300)
    expect(onGamesChange).toHaveBeenCalledTimes(callCount)

    vi.useRealTimers()
  })
})