import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsArrowClockwise, BsArrowCounterclockwise, BsDiagram2Fill, BsX, BsPlus, BsDash } from 'react-icons/bs'
import { AiOutlineUsergroupAdd, AiOutlineUsergroupDelete } from "react-icons/ai";
import { FaPeopleArrows } from "react-icons/fa";
import { CH as SwissFlag } from 'country-flag-icons/react/1x1'
import type { Game, Participant } from '../../domain/tournament.ts'
import { createByeGame, createForfeitGame, generatePairings, PairingError } from './pairings/pairingEngine.ts'
import { generateKnockoutRoundGames } from './pairings/knockoutEngine.ts'
import { AlertModal } from '../AlertModal.tsx'
import { ConfirmModal } from '../ConfirmModal.tsx'

interface PairingToolsDrawerProps {
  isOpen: boolean
  onClose: () => void
  /** Tournament id for local UI preferences ('new' for unsaved tournaments). */
  tournamentId: string
  /** The round being prepared (publishedRounds + 1). */
  round: number
  /** Domain participants (with capturedRating) — rows lack ratings. */
  participants: Participant[]
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
// bulk bye/forfeit for unpaired players, «Игры плей-офф» knockout card,
// spacer, "clear round pairings" action with a confirm modal.

function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}
export function PairingToolsDrawer({
  isOpen,
  onClose,
  tournamentId,
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

  // Participants without any game in the round being prepared (no opponent,
  // no bye, no forfeit).
  const unpairedIds = useMemo(() => {
    const placed = new Set<number>()
    for (const g of games) {
      if (g.round !== round) continue
      placed.add(g.player1)
      if (g.player2 != null) placed.add(g.player2)
    }
    return participants.filter((p) => !placed.has(p.id)).map((p) => p.id)
  }, [games, participants, round])

  const applyLoneGamesToUnpaired = (create: (participantId: number) => Game) => {
    if (unpairedIds.length === 0) return
    const roundGames = games.filter((g) => g.round === round)
    updateGames(round, [...roundGames, ...unpairedIds.map(create)])
  }

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
        participants,
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

  // «Knockout games» collapse card state: the bracket size is a local per-tournament
  // preference (survives drawer close/reopen), the knockout round defaults to
  // the round being prepared and resets when the drawer is (re)opened.
  const bracketSizeOptions = useMemo(() => {
    const options: number[] = []
    for (let b = 4; b <= Math.max(4, nextPowerOfTwo(participants.length)); b *= 2) {
      options.push(b)
    }
    return options
  }, [participants.length])
  const defaultBracketSize = bracketSizeOptions[bracketSizeOptions.length - 1]
  const bracketSizeStorageKey = `kisen.pairingTools.knockoutBracketSize.${tournamentId}`
  const [bracketSize, setBracketSize] = useState(() => {
    try {
      const saved = Number(window.localStorage.getItem(bracketSizeStorageKey))
      if (Number.isInteger(saved) && saved >= 4) return saved
    } catch {
      // localStorage unavailable — fall back to the default
    }
    return defaultBracketSize
  })
  // Re-validate the persisted choice when the options change (participants
  // added/removed) and persist every confirmed choice.
  useEffect(() => {
    if (!bracketSizeOptions.includes(bracketSize)) setBracketSize(defaultBracketSize)
  }, [bracketSizeOptions, bracketSize, defaultBracketSize])
  useEffect(() => {
    try {
      window.localStorage.setItem(bracketSizeStorageKey, String(bracketSize))
    } catch {
      // localStorage unavailable — the choice just won't persist
    }
  }, [bracketSizeStorageKey, bracketSize])

  const [knockoutRound, setKnockoutRound] = useState(round)
  useEffect(() => {
    if (knockoutRound > round) setKnockoutRound(round)
  }, [round, knockoutRound])

  const handleGenerateKnockout = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const newGames = generateKnockoutRoundGames({
        participants,
        games,
        round,
        publishedRounds,
        considerSente,
        bracketSize,
        knockoutRound,
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
          <FaPeopleArrows className="h-5 w-5" />
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
          className="btn btn-secondary mt-2 w-full"
        >
          {generating ? (
            <span className="loading loading-spinner loading-sm" aria-hidden="true" />
          ) : (
            <SwissFlag className="h-5 w-5" aria-hidden="true" />
          )}
          {generating
            ? t('tournament.edit.pairingTools.generating')
            : t('tournament.edit.pairingTools.generate', { round })}
        </button>

        {/* Bulk bye / forfeit for unpaired players */}
        <button
          type="button"
          onClick={() => applyLoneGamesToUnpaired((id) => createByeGame(id, round, considerSente))}
          disabled={actionsDisabled}
          className="btn btn-secondary mt-2 w-full"
        >
          <AiOutlineUsergroupAdd className="h-6 w-6" aria-hidden="true" />
          {t('tournament.edit.pairingTools.unpairedBye')}
          <BsPlus className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => applyLoneGamesToUnpaired((id) => createForfeitGame(id, round, considerSente))}
          disabled={actionsDisabled}
          className="btn btn-secondary mt-2 w-full"
        >
          <AiOutlineUsergroupDelete className="h-6 w-6" aria-hidden="true" />
          {t('tournament.edit.pairingTools.unpairedForfeit')}
          <BsDash className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* «Knockout games» collapse card */}
        <details className="collapse bg-base-100 shadow-sm mt-2">
          <summary className="collapse-title">
            <h3>{t('tournament.edit.pairingTools.knockoutTitle')}</h3>
          </summary>
          <div className="collapse-content text-sm">
            <label className="label" htmlFor="knockout-bracket-size">
              <span className="label-text">{t('tournament.edit.pairingTools.knockoutBracketSize')}</span>
            </label>
            <select
              id="knockout-bracket-size"
              value={bracketSize}
              onChange={(e) => setBracketSize(Number(e.target.value))}
              disabled={actionsDisabled}
              className="select select-bordered select-sm w-full"
              data-testid="knockout-bracket-size"
            >
              {bracketSizeOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <label className="label" htmlFor="knockout-round">
              <span className="label-text">{t('tournament.edit.pairingTools.knockoutRound')}</span>
            </label>
            <select
              id="knockout-round"
              value={knockoutRound}
              onChange={(e) => setKnockoutRound(Number(e.target.value))}
              disabled={actionsDisabled}
              className="select select-bordered select-sm w-full"
              data-testid="knockout-round"
            >
              {Array.from({ length: round }, (_, i) => i + 1).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleGenerateKnockout()}
              disabled={generating || actionsDisabled}
              className="btn btn-secondary mt-1 w-full"
            >
              {generating ? (
                <span className="loading loading-spinner loading-sm" aria-hidden="true" />
              ) : (
                <BsDiagram2Fill className="h-5 w-5" aria-hidden="true" />
              )}
              {generating
                ? t('tournament.edit.pairingTools.generating')
                : t('tournament.edit.pairingTools.generateKnockoutPairs')}
            </button>
          </div>
        </details>

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
