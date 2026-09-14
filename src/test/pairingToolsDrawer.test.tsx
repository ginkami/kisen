import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Participant } from '../domain/tournament.ts'
import { PairingError, generatePairings } from '../components/tournament/pairings/pairingEngine.ts'
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

function pairSet(games: Game[]): string[] {
  return games
    .filter((g) => g.player2 != null)
    .map((g) => [g.player1, g.player2 as number].sort((a, b) => a - b).join('-'))
    .sort()
}

function byeIds(games: Game[]): number[] {
  return games.filter((g) => g.status === 'bye').map((g) => g.player1)
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

  it('shows the knockout button with the computed n and applies one round update', async () => {
    // 6 participants, no games в†’ knockout round 1: 2 pairs + 2 byes в†’ n = 4.
    const { updateGames } = renderDrawer({ participants: participantsOf(6) })
    const button = screen.getByRole('button', {
      name: 'tournament.edit.pairingTools.generateKnockout {"n":4}',
    })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    await waitFor(() => expect(updateGames).toHaveBeenCalledTimes(1))
    const applied = updateGames.mock.calls[0][1] as Game[]
    expect(pairSet(applied)).toEqual(['3-6', '4-5'])
    expect(byeIds(applied)).toEqual([1, 2])
  })

  it('keeps the knockout label unchanged once the round has been drawn', () => {
    // 6 participants; round 2 already fully drawn (2 pairs + 2 byes): the plan
    // for the label ignores the round's own games, so n stays 4.
    const drawn: Game[] = [
      { id: 'k1', player1: 3, player2: 6, sente: 'unknown', handicap: null, result: 'player1_won', status: 'completed', round: 2 },
      { id: 'k2', player1: 4, player2: 5, sente: 'unknown', handicap: null, result: 'player2_won', status: 'completed', round: 2 },
      { id: 'k3', player1: 1, player2: null, sente: 'unknown', handicap: null, result: 'player1_won', status: 'bye', round: 2 },
      { id: 'k4', player1: 2, player2: null, sente: 'unknown', handicap: null, result: 'player1_won', status: 'bye', round: 2 },
    ]
    const { unmount: unmountEmpty } = renderDrawer({
      participants: participantsOf(6),
      games: [],
      round: 2,
      publishedRounds: 0,
    })
    const nameBefore = screen.getByRole('button', {
      name: 'tournament.edit.pairingTools.generateKnockout {"n":4}',
    }).getAttribute('name')
    unmountEmpty()

    renderDrawer({
      participants: participantsOf(6),
      games: drawn,
      round: 2,
      publishedRounds: 0,
    })
    const nameAfter = screen.getByRole('button', {
      name: 'tournament.edit.pairingTools.generateKnockout {"n":4}',
    }).getAttribute('name')
    expect(nameAfter).toBe(nameBefore)
  })

  it('uses the final label when n = 1', () => {
    renderDrawer({ participants: participantsOf(2) })
    expect(
      screen.getByRole('button', {
        name: 'tournament.edit.pairingTools.generateKnockoutFinal',
      }),
    ).toBeInTheDocument()
  })

  it('blocks the knockout button together with the Swiss buttons while an earlier round is incomplete', () => {
    renderDrawer({
      participants: participantsOf(6),
      games: incompleteRoundGames,
      publishedRounds: 1,
      canUndo: true,
      canRedo: true,
    })
    expect(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generate {"round":2}' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.clear {"round":2}' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.generateKnockout {"n":4}' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.undo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'tournament.edit.pairingTools.redo' })).toBeEnabled()
  })
})

