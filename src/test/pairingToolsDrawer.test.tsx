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
      publishedRounds={1}
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
    const { updateGames } = renderDrawer({ games: [makeGame(1)] })
    fireEvent.click(screen.getByRole('button', { name: /tournament.edit.pairingTools.generate/ }))
    await waitFor(() => expect(updateGames).toHaveBeenCalledTimes(1))
    expect(updateGames).toHaveBeenCalledWith(2, [makeGame(1), ...newGames])
    expect(generatePairings).toHaveBeenCalledWith(
      expect.objectContaining({ round: 2, publishedRounds: 1, considerSente: false }),
    )
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

