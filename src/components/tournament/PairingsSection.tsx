import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { PairingsBoard } from './PairingsBoard.tsx'
import { isRoundComplete } from './pairings/pairingsModel.ts'
import type { Game, Participant } from '../../domain/tournament.ts'
import type { ParticipantRow } from '../../hooks/useTournamentForm.ts'
import type { ScheduleRound } from '../../domain/tournament.ts'
import type { SupportedLocale } from '../../domain/locale.ts'

interface PairingsSectionProps {
  games: Game[]
  publishedRounds: number
  participants: Participant[] | ParticipantRow[]
  scheduleRounds: ScheduleRound[]
  considerSente: boolean
  updateGames: (round: number, gamesForRound: Game[]) => void
  publishDraw: (round: number) => void
  unpublishDraw: () => void
  updateStartingPoints: (participantId: number, value: number) => void
  activeRound: number | null
  onActiveRoundChange: (round: number) => void
  pairingToolsAvailable?: boolean
  onTogglePairingTools?: () => void
}

// Resolve the effective active round: the user-selected round, or the default
// (publishedRounds + 1 when it exists) while the user has not picked a tab.
// Shared with TournamentEditForm, which derives the pairing-tools drawer
// visibility from the same value.
export function resolvePairingsActiveRound(
  requested: number | null,
  publishedRounds: number,
  roundCount: number
): number {
  const safePublished = Number.isFinite(publishedRounds) ? publishedRounds : 0
  const safeCount = Number.isFinite(roundCount) ? roundCount : 0
  const defaultRound =
    safePublished === 0
      ? 1
      : safePublished + 1 <= safeCount
        ? safePublished + 1
        : safePublished
  return Math.max(1, Math.min(requested ?? defaultRound, Math.max(1, safeCount)))
}

export function PairingsSection({
  games,
  publishedRounds,
  participants,
  scheduleRounds,
  considerSente,
  updateGames,
  publishDraw,
  unpublishDraw,
  updateStartingPoints,
  activeRound,
  onActiveRoundChange,
  pairingToolsAvailable,
  onTogglePairingTools,
}: PairingsSectionProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'
  const roundCount = scheduleRounds.length

  // Validate publishedRounds to avoid NaN propagation
  const safePublishedRounds = Number.isFinite(publishedRounds) ? publishedRounds : 0
  const safeRoundCount = Number.isFinite(roundCount) ? roundCount : 0

  // Build Participant[] for isRoundComplete
  const participantArray = useMemo((): Participant[] => {
    if (participants.length === 0) return []
    if ('rowId' in participants[0]) {
      return (participants as ParticipantRow[]).map((p) => ({
        id: p.id,
        player: p.player,
        locales: p.locales as unknown as Participant['locales'],
        nationality: p.nationality || undefined,
        residence: p.residence || undefined,
        capturedRating: { value: p.ratingValue ? Number(p.ratingValue) : null, rank: p.rank },
        startingPoints: 0,
      }))
    }
    return participants as Participant[]
  }, [participants])

  // Effective active round: user-selected tab, or the default (publishedRounds
  // + 1 when it exists) while no round tab has been picked yet.
  const safeActiveRound = resolvePairingsActiveRound(
    activeRound,
    safePublishedRounds,
    safeRoundCount
  )

  const roundComplete = useMemo(
    () => isRoundComplete(games, participantArray, safeActiveRound),
    [games, participantArray, safeActiveRound]
  )

  const isAlreadyPublished = safeActiveRound <= safePublishedRounds
  const isPublishedRounds = safeActiveRound === safePublishedRounds
  const canPublish = roundComplete && !isAlreadyPublished

  const handlePublish = useCallback(() => {
    if (canPublish) {
      publishDraw(safeActiveRound)
    }
  }, [canPublish, publishDraw, safeActiveRound])

  const handleGamesChange = useCallback(
    (newGames: Game[]) => {
      updateGames(safeActiveRound, newGames)
    },
    [updateGames, safeActiveRound]
  )

  if (roundCount === 0) {
    return (
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">{t('tournament.edit.pairings.title')}</h2>
          <p className="text-sm opacity-70">
            {t('tournament.edit.pairings.noRounds')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-200 shadow-sm pairing-section">
      <div className="card-body gap-4">
        <div className="flex flex-col-reverse md:flex-row md:justify-between items-center gap-2">
          
          <div className="flex flex-row items-center gap-2">
            <h2 className="card-title mt-[-3px]">{t('tournament.edit.pairings.title')}</h2>
            {/* Round sub-tabs */}
            <div className="tabs tabs-box tabs-sm" role="tablist">
              {Array.from({ length: safeRoundCount }, (_, i) => i + 1).map((num) => {
                const isDisabled = num > safePublishedRounds + 1
                const isActive = num === safeActiveRound
                return (
                  <button
                    key={num}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    disabled={isDisabled}
                    onClick={() => onActiveRoundChange(num)}
                    className={`tab ${isActive ? 'tab-active' : ''} ${isDisabled ? 'tab-disabled' : ''}`}
                  >
                    {num}
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Publish button */}
          <div className="flex gap-2 items-center">
            {isPublishedRounds && safePublishedRounds > 0 && (
              <button
                type="button"
                onClick={unpublishDraw}
                className="btn btn-sm btn-warning"
              >
                {t('tournament.edit.pairings.unpublishDraw')}
              </button>
            )}
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish}
              className={`btn btn-sm ${isPublishedRounds ? 'btn-neutral' : canPublish ? 'btn-success' : 'btn-neutral'}`}
            >
              {isPublishedRounds
                ? t('tournament.edit.pairings.drawPublished')
                : t('tournament.edit.pairings.publishDraw')}
            </button>
          </div>
        </div>

        {/* Pairings board */}
        <PairingsBoard
          games={games}
          participants={participants}
          round={safeActiveRound}
          publishedRounds={safePublishedRounds}
          considerSente={considerSente}
          locale={locale}
          onGamesChange={handleGamesChange}
          updateStartingPoints={updateStartingPoints}
          onTogglePairingTools={pairingToolsAvailable ? onTogglePairingTools : undefined}
        />
      </div>
    </div>
  )
}