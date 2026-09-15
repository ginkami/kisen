import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Participant } from '../domain/tournament.ts'
import { PairingError, generatePairings } from '../components/tournament/pairings/pairingEngine.ts'
import { generateKnockoutRoundGames } from '../components/tournament/pairings/knockoutEngine.ts'
import type { Game } from '../domain/tournament.ts'
import { PairingToolsDrawer } from '../components/tournament/PairingToolsDrawer.tsx'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      key + (params ? ' ' + JSON.stringify(params) : ''),
    i18n: { language: 'ru' },
  }),
}))

vi.mock('../components/tournament/pairings/pairingEngine.ts', () => {
  class PairingError extends Error {}
  return {
    generatePairings: vi.fn(),
    PairingError,
    // knockoutEngine imports this helper from pairingEngine.
    createByeGame: vi.fn((participantId: number, round: number) => ({
      id: `bye-${participantId}-${round}`,
      player1: participantId,
      player2: null,
      sente: 'unknown',
      handicap: null,
      result: 'player1_won',
      status: 'bye',
      round,
    })),
  }
})

vi.mock('../components/tournament/pairings/knockoutEngine.ts', () => ({
  generateKnockoutRoundGames: vi.fn(),
}))

const participants: Participant[] = [1, 2, 3, 4].map((id) => ({
  id,
  player: null,
  locales: { ru: { familyName: `F${id}`, givenName: 'X' } },
  capturedRating: { value: 1500, rank: null },
  startingPoints: 0,
}))

function makeGame(n: number): Game {
  return {
    id: `g${n}`,
    player1: n,
    player2: n + 1,
    sente: 'unknown',
    handicap: null,
    result: null,
    status: 'not_started',
    round: 2,
  }
}

function renderDrawer(overrides: Partial<Parameters<typeof PairingToolsDrawer>[0]> = {}) {
  const updateGames = vi.fn()
  const onUndo = vi.fn()
  const onRedo = vi.fn()
  const onClose = vi.fn()
  const view = render(
    <PairingToolsDrawer
      isOpen
      onClose={onClose}
      tournamentId="t1"
      round={2}
      participants={participants}
      games={[]}
      publishedRounds={0}
      considerSente={false}
      canUndo={false}
      canRedo={false}
      onUndo={onUndo}
      onRedo={onRedo}
      updateGames={updateGames}
      {...overrides}
    />,
  )
  return { updateGames, onUndo, onRedo, onClose, unmount: view.unmount }
}

function participantsOf(count: number): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    player: null,
    locales: { ru: { familyName: `F${i + 1}`, givenName: 'X' } },
    capturedRating: { value: 2000 - i * 50, rank: null },
    startingPoints: 0,
  }))
}

/** Complete published round 1: two games with results. */
const completeRoundGames: Game[] = [
  { id: 'r1a', player1: 1, player2: 2, sente: 'unknown', handicap: null, result: 'player1_won', status: 'completed', round: 1 },
  { id: 'r1b', player1: 3, player2: 4, sente: 'unknown', handicap: null, result: 'draw', status: 'completed', round: 1 },
]

/** Incomplete published round 1: one live game without a result and one participant without any game. */
const incompleteRoundGames: Game[] = [
  { id: 'r1a', player1: 1, player2: 2, sente: 'unknown', handicap: null, result: null, status: 'live', round: 1 },
]

/**
 * Complete published round 1 despite a forfeit without a result: lone games
 * (bye/forfeit) do not await a result and must not block the actions.
 */
const forfeitWithoutResultGames: Game[] = [
  { id: 'r1a', player1: 1, player2: 2, sente: 'unknown', handicap: null, result: 'player1_won', status: 'completed', round: 1 },
  { id: 'r1b', player1: 3, player2: 4, sente: 'unknown', handicap: null, result: 'player2_won', status: 'completed', round: 1 },
  { id: 'r1c', player1: 5, player2: null, sente: 'unknown', handicap: null, result: null, status: 'forfeit', round: 1 },
]

describe('PairingToolsDrawer', () => {
  it('renders the localized title when open', () => {
    renderDrawer()
    expect(screen.getByText('tournament.edit.pairingTools.title')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const { onClose } = renderDrawer()
    fireEvent.click(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.close' }),
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', () => {
    const { onClose } = renderDrawer()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders undo/redo buttons disabled without applicable states', () => {
    renderDrawer()
    const undo = screen.getByRole('button', { name: 'tournament.edit.pairingTools.undo' })
    const redo = screen.getByRole('button', { name: 'tournament.edit.pairingTools.redo' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()
  })

  it('invokes undo/redo callbacks when enabled', () => {
    const { onUndo, onRedo } = renderDrawer({ canUndo: true, canRedo: true })
    fireEvent.click(screen.getByRole('button', { name: 'tournament.edit.pairingTools.undo' }))
    fireEvent.click(screen.getByRole('button', { name: 'tournament.edit.pairingTools.redo' }))
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(1)
  })

  it('generates pairings via a single round update', async () => {
    const newGames = [makeGame(3)]
    vi.mocked(generatePairings).mockReturnValue(newGames)
    const { updateGames } = renderDrawer({
      games: completeRoundGames,
      publishedRounds: 1,
    })
    fireEvent.click(screen.getByRole('button', { name: 'tournament.edit.pairingTools.generate {"round":2}' }))
    await waitFor(() => expect(updateGames).toHaveBeenCalledTimes(1))
    expect(updateGames).toHaveBeenCalledWith(2, [...newGames])
    expect(generatePairings).toHaveBeenCalledWith(
      expect.objectContaining({ round: 2, publishedRounds: 1, considerSente: false }),
    )
  })

  it('disables generate/clear while an earlier round is incomplete, undo/redo stay enabled', () => {
    renderDrawer({
      games: incompleteRoundGames,
      publishedRounds: 1,
      canUndo: true,
      canRedo: true,
    })
    expect(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generate {"round":2}' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.clear {"round":2}' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.undo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.redo' })).toBeEnabled()
  })

  it('keeps generate/clear enabled when all published rounds are complete', () => {
    renderDrawer({ games: completeRoundGames, publishedRounds: 1 })
    expect(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generate {"round":2}' }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.clear {"round":2}' })).toBeEnabled()
  })

  it('keeps generate/clear enabled when a lone game (forfeit) has no result', () => {
    // Reproduction: a forfeit with result=null in a published round must not
    // block the drawer actions вЂ” lone games do not await a result.
    renderDrawer({ games: forfeitWithoutResultGames, publishedRounds: 1 })
    expect(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generate {"round":2}' }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.clear {"round":2}' })).toBeEnabled()
  })

  it('shows the failure alert when pairing is impossible', async () => {
    vi.mocked(generatePairings).mockImplementation(() => {
      throw new PairingError('No full valid pairing exists')
    })
    renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'tournament.edit.pairingTools.generate {"round":2}' }))
    await waitFor(() =>
      expect(
        screen.getByText('tournament.edit.pairingTools.pairingFailedTitle'),
      ).toBeInTheDocument(),
    )
  })

  it('clears the round pairings after confirm', () => {
    const { updateGames } = renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'tournament.edit.pairingTools.clear {"round":2}' }))
    expect(
      screen.getByText(/tournament.edit.pairingTools.clearConfirmMessage/),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.clearConfirmYes' }),
    )
    expect(updateGames).toHaveBeenCalledTimes(1)
    expect(updateGames).toHaveBeenCalledWith(2, [])
  })

  it('falls back to the default bracket size when the persisted value is not offered', async () => {
    window.localStorage.setItem('kisen.pairingTools.knockoutBracketSize.t1', '16')
    vi.mocked(generateKnockoutRoundGames).mockReturnValue([])
    const { updateGames } = renderDrawer({ participants: participantsOf(6) })
    fireEvent.click(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generateKnockoutPairs' }),
    )
    await waitFor(() => expect(updateGames).toHaveBeenCalledTimes(1))
    expect(generateKnockoutRoundGames).toHaveBeenCalledWith(
      expect.objectContaining({ bracketSize: 8 }),
    )
    window.localStorage.removeItem('kisen.pairingTools.knockoutBracketSize.t1')
  })

  it('blocks the knockout card controls together with the Swiss actions while an earlier round is incomplete', () => {
    renderDrawer({
      participants: participantsOf(6),
      games: incompleteRoundGames,
      publishedRounds: 1,
      canUndo: true,
      canRedo: true,
    })
    expect(screen.getByTestId('knockout-bracket-size')).toBeDisabled()
    expect(screen.getByTestId('knockout-round')).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generateKnockoutPairs' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generate {"round":2}' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.undo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.redo' })).toBeEnabled()
  })

  it('shows the failure alert when the knockout generation is impossible', async () => {
    vi.mocked(generateKnockoutRoundGames).mockImplementation(() => {
      throw new PairingError('No knockout bracket of the chosen size starts at the chosen round')
    })
    renderDrawer({ participants: participantsOf(6) })
    fireEvent.click(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generateKnockoutPairs' }),
    )
    await waitFor(() =>
      expect(
        screen.getByText('tournament.edit.pairingTools.pairingFailedTitle'),
      ).toBeInTheDocument(),
    )
  })
})

  it('shows the knockout card and generates via a single round update', async () => {
    // 6 participants -> bracket size options 4..8 (default 8); knockout round
    // options 1..round(2) (default 2).
    const newGames = [makeGame(3)]
    vi.mocked(generateKnockoutRoundGames).mockReturnValue(newGames)
    const { updateGames } = renderDrawer({ participants: participantsOf(6) })
    const sizeSelect = screen.getByTestId('knockout-bracket-size')
    expect(sizeSelect).toBeEnabled()
    expect(within(sizeSelect).getByRole('option', { name: '4' })).toBeInTheDocument()
    expect(within(sizeSelect).getByRole('option', { name: '8' })).toBeInTheDocument()
    const roundSelect = screen.getByTestId('knockout-round')
    expect(within(roundSelect).getByRole('option', { name: '1' })).toBeInTheDocument()
    expect(within(roundSelect).getByRole('option', { name: '2' })).toBeInTheDocument()
    const button = screen.getByRole('button', {
      name: 'tournament.edit.pairingTools.generateKnockoutPairs',
    })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    await waitFor(() => expect(updateGames).toHaveBeenCalledTimes(1))
    expect(updateGames).toHaveBeenCalledWith(2, [...newGames])
    expect(generateKnockoutRoundGames).toHaveBeenCalledWith(
      expect.objectContaining({
        round: 2,
        publishedRounds: 0,
        bracketSize: 8,
        knockoutRound: 2,
        considerSente: false,
      }),
    )
  })

  it('passes the chosen bracket size and knockout round to the engine', async () => {
    vi.mocked(generateKnockoutRoundGames).mockReturnValue([])
    const { updateGames } = renderDrawer({ participants: participantsOf(6) })
    fireEvent.change(screen.getByTestId('knockout-bracket-size'), { target: { value: '4' } })
    fireEvent.change(screen.getByTestId('knockout-round'), { target: { value: '1' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generateKnockoutPairs' }),
    )
    await waitFor(() => expect(updateGames).toHaveBeenCalledTimes(1))
    expect(generateKnockoutRoundGames).toHaveBeenCalledWith(
      expect.objectContaining({ bracketSize: 4, knockoutRound: 1 }),
    )
  })

  it('persists the bracket size locally per tournament', async () => {
    const key = 'kisen.pairingTools.knockoutBracketSize.t1'
    window.localStorage.removeItem(key)
    vi.mocked(generateKnockoutRoundGames).mockReturnValue([])
    const first = renderDrawer({ participants: participantsOf(6) })
    fireEvent.change(screen.getByTestId('knockout-bracket-size'), { target: { value: '4' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generateKnockoutPairs' }),
    )
    await waitFor(() =>
      expect(generateKnockoutRoundGames).toHaveBeenLastCalledWith(
        expect.objectContaining({ bracketSize: 4 }),
      ),
    )
    first.unmount()
    // Reopen: the choice survives.
    const second = renderDrawer({ participants: participantsOf(6) })
    fireEvent.click(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generateKnockoutPairs' }),
    )
    await waitFor(() =>
      expect(generateKnockoutRoundGames).toHaveBeenLastCalledWith(
        expect.objectContaining({ bracketSize: 4 }),
      ),
    )
    second.unmount()
    // A different tournament keeps its own (default) value.
    const third = renderDrawer({ participants: participantsOf(6), tournamentId: 't2' })
    fireEvent.click(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generateKnockoutPairs' }),
    )
    await waitFor(() =>
      expect(generateKnockoutRoundGames).toHaveBeenLastCalledWith(
        expect.objectContaining({ bracketSize: 8 }),
      ),
    )
    third.unmount()
    window.localStorage.removeItem(key)
    window.localStorage.removeItem('kisen.pairingTools.knockoutBracketSize.t2')
  })
