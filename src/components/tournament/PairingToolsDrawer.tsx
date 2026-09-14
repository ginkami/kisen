import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsArrowClockwise, BsArrowCounterclockwise, BsDice6, BsX } from 'react-icons/bs'
import { CgSwiss } from 'react-icons/cg'
import type { Game, Participant } from '../../domain/tournament.ts'
import type { ParticipantRow } from '../../hooks/useTournamentForm.ts'
import { generatePairings, PairingError } from './pairings/pairingEngine.ts'
import { AlertModal } from '../AlertModal.tsx'
import { ConfirmModal } from '../ConfirmModal.tsx'

interface PairingToolsDrawerProps {
  isOpen: boolean
  onClose: () => void
  /** The round being prepared (publishedRounds + 1). */
  round: number
  participants: Participant[] | ParticipantRow[]
  games: Game[]
  publishedRounds: number
  considerSente: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  updateGames: (round: number, gamesForRound: Game[]) => void
}

// Right-side drawer hosting the pairing-assistant tools for the round being
// prepared (publishedRounds + 1). The drawer chrome mirrors AdminDrawer, but
// it overlays the page content without pushing it (the pairings board is
// wide). Tools, top to bottom: undo/redo row, "generate pairings" action,
// spacer, "clear round pairings" action with a confirm modal.
export function PairingToolsDrawer({
  isOpen,
  onClose,
  round,
  participants,
  games,
  publishedRounds,
  considerSente,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  updateGames,
}: PairingToolsDrawerProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)

  // Drawing or clearing the round being prepared while an earlier round is
  // incomplete (a paired game awaiting its result or a participant without
  // any game) would produce an invalid Swiss state — such actions are blocked.
  // Lone games (bye/forfeit) do not await a result and never block.
  // Undo/Redo are never blocked: they are the way out of the incomplete state.
  const actionsDisabled = useMemo(() => {
    for (let r = 1; r <= publishedRounds; r++) {
      const roundGames = games.filter((g) => g.round === r)
      if (roundGames.some((g) => g.player2 != null && g.result == null)) return true
      const covered = new Set<number>()
      for (const g of roundGames) {
        covered.add(g.player1)
        if (g.player2 != null) covered.add(g.player2)
      }
      if (participants.some((p) => !covered.has(p.id))) return true
    }
    return false
  }, [games, participants, publishedRounds])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const newGames = generatePairings({
        participants: participants as Participant[],
        games,
        round,
        publishedRounds,
        considerSente,
      })
      const roundGames = games.filter((g) => g.round === round)
      updateGames(round, [...roundGames, ...newGames])
    } catch (e) {
      if (e instanceof PairingError) {
        setAlertOpen(true)
      } else {
        throw e
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      ref={panelRef}
      data-testid="pairing-tools-drawer"
      className={[
        'fixed top-0 right-0 z-50 h-full w-80 bg-base-200 shadow-xl transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between bg-base-200 px-4 py-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <BsDice6 className="h-5 w-5" />
          {t('tournament.edit.pairingTools.title')}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-circle btn-ghost"
          aria-label={t('tournament.edit.pairingTools.close')}
        >
          <BsX className="h-5 w-5" />
        </button>
      </div>

      <div className="flex h-[calc(100%-4rem)] flex-col items-center px-4 pb-4">
        {/* Undo / Redo row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="btn btn-circle btn-ghost btn-sm tooltip tooltip-left"
            data-tip={t('tournament.edit.pairingTools.undo')}
            aria-label={t('tournament.edit.pairingTools.undo')}
          >
            <BsArrowCounterclockwise className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="btn btn-circle btn-ghost btn-sm tooltip tooltip-left"
            data-tip={t('tournament.edit.pairingTools.redo')}
            aria-label={t('tournament.edit.pairingTools.redo')}
          >
            <BsArrowClockwise className="h-4 w-4" />
          </button>
        </div>

        {/* Generate pairings */}
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating || actionsDisabled}
          className="btn btn-primary mt-2 w-full"
        >
          {generating ? (
            <span className="loading loading-spinner loading-sm" aria-hidden="true" />
          ) : (
            <CgSwiss className="h-5 w-5" aria-hidden="true" />
          )}
          {generating
            ? t('tournament.edit.pairingTools.generating')
            : t('tournament.edit.pairingTools.generate', { round })}
        </button>

        {/* Spacer */}
        <div className="grow" />

        {/* Clear round pairings */}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={actionsDisabled}
          className="btn btn-outline btn-error mt-2 w-full"
        >
          {t('tournament.edit.pairingTools.clear', { round })}
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title={t('tournament.edit.pairingTools.clearConfirmTitle')}
        message={t('tournament.edit.pairingTools.clearConfirmMessage', { round })}
        confirmText={t('tournament.edit.pairingTools.clearConfirmYes')}
        cancelText={t('common.cancel')}
        variant="error"
        onConfirm={() => {
          setConfirmOpen(false)
          updateGames(round, [])
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <AlertModal
        isOpen={alertOpen}
        title={t('tournament.edit.pairingTools.pairingFailedTitle')}
        message={t('tournament.edit.pairingTools.pairingFailed')}
        confirmText={t('tournament.edit.pairingTools.alertOk')}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  )
}
