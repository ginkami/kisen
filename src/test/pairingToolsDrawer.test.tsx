import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Participant } from '../domain/tournament.ts'
import { PairingError, generatePairings } from '../components/tournament/pairings/pairingEngine.ts'
import type { Game } from '../domain/tournament.ts'
import { PairingToolsDrawer } from '../components/tournament/PairingToolsDrawer.tsx'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

vi.mock('../components/tournament/pairings/pairingEngine.ts', () => {
  class PairingError extends Error {}
  return { generatePairings: vi.fn(), PairingError }
})

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
  render(
    <PairingToolsDrawer
      isOpen
      onClose={onClose}
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
  return { updateGames, onUndo, onRedo, onClose }
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
    fireEvent.click(screen.getByRole('button', { name: /tournament.edit.pairingTools.generate/ }))
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
      screen.getByRole('button', { name: /tournament.edit.pairingTools.generate/ }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.clear' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.undo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.redo' })).toBeEnabled()
  })

  it('keeps generate/clear enabled when all published rounds are complete', () => {
    renderDrawer({ games: completeRoundGames, publishedRounds: 1 })
    expect(
      screen.getByRole('button', { name: /tournament.edit.pairingTools.generate/ }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.clear' })).toBeEnabled()
  })

  it('keeps generate/clear enabled when a lone game (forfeit) has no result', () => {
    // Reproduction: a forfeit with result=null in a published round must not
    // block the drawer actions — lone games do not await a result.
    renderDrawer({ games: forfeitWithoutResultGames, publishedRounds: 1 })
    expect(
      screen.getByRole('button', { name: /tournament.edit.pairingTools.generate/ }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.clear' })).toBeEnabled()
  })

  it('shows the failure alert when pairing is impossible', async () => {
    vi.mocked(generatePairings).mockImplementation(() => {
      throw new PairingError('No full valid pairing exists')
    })
    renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: /tournament.edit.pairingTools.generate/ }))
    await waitFor(() =>
      expect(
        screen.getByText('tournament.edit.pairingTools.pairingFailedTitle'),
      ).toBeInTheDocument(),
    )
  })

  it('clears the round pairings after confirm', () => {
    const { updateGames } = renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'tournament.edit.pairingTools.clear' }))
    expect(
      screen.getByText('tournament.edit.pairingTools.clearConfirmMessage'),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.clearConfirmYes' }),
    )
    expect(updateGames).toHaveBeenCalledTimes(1)
    expect(updateGames).toHaveBeenCalledWith(2, [])
  })
})

