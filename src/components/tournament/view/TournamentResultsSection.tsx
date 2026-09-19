import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as Flags from 'country-flag-icons/react/3x2'
import { PiCrownSimple } from 'react-icons/pi'
import { getCountryName } from '../../../utils/countries.ts'
import { rankToColor } from '../crosstable/crosstableModel.ts'
import {
  containersFromGames,
  gamesForRound,
  calculateParticipantPoints,
} from '../pairings/pairingsModel.ts'
import type { Game, Participant } from '../../../domain/tournament.ts'
import type { SupportedLocale } from '../../../domain/locale.ts'

interface TournamentResultsSectionProps {
  games: Game[]
  participants: Participant[]
  roundCount: number
  publishedRounds: number
  considerSente: boolean
}

interface ResultRow {
  game: Game
  forfeit: boolean
}

export function TournamentResultsSection({
  games,
  participants,
  roundCount,
  publishedRounds,
  considerSente,
}: TournamentResultsSectionProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'

  const safeRoundCount = Number.isFinite(roundCount) ? roundCount : 0
  // Published rounds: publishedRounds equals the number of published draws.
  // Zero published rounds → empty state, no tabs at all.
  const publishedRoundCount = publishedRounds >= 1 ? Math.min(safeRoundCount, publishedRounds) : 0

  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const activeRound =
    selectedRound != null
      ? Math.min(selectedRound, publishedRoundCount)
      : publishedRoundCount

  const participantById = useMemo(() => {
    const m = new Map<number, Participant>()
    for (const p of participants) m.set(p.id, p)
    return m
  }, [participants])

  // Pair + bye rows in the same pair-strength order as the pairings board,
  // followed by forfeit rows at the end.
  const rows = useMemo<ResultRow[]>(() => {
    if (publishedRoundCount < 1) return []
    const containers = containersFromGames(games, participants, activeRound)
    const forfeits = gamesForRound(games, activeRound)
      .filter((g) => g.status === 'forfeit')
      .map((game) => ({ game, forfeit: true }))
    return [...containers.games.map((game) => ({ game, forfeit: false })), ...forfeits]
  }, [games, participants, activeRound, publishedRoundCount])

  function pointsBeforeRound(pid: number | null): number | null {
    if (pid == null) return null
    const p = participantById.get(pid)
    return calculateParticipantPoints(games, pid, activeRound - 1, p?.startingPoints ?? 0)
  }

  function resultText(game: Game): string {
    if (game.status === 'forfeit') return '-'
    if (game.player2 == null) return game.result === 'draw' ? '=' : '+'
    if (game.result === 'player1_won') return '+ : -'
    if (game.result === 'player2_won') return '- : +'
    if (game.result === 'draw') return '= : ='
    return '? : ?'
  }

  function resultFirstPlayer(game: Game): string {
    if (game.status === 'forfeit') return '-'
    if (game.player2 == null) return game.result === 'draw' ? '=' : '+'
    if (game.result === 'player1_won') return '+'
    if (game.result === 'player2_won') return '-'
    if (game.result === 'draw') return '='
    return '?'
  }

  function playerCells(pid: number | null) {
    const p = pid != null ? (participantById.get(pid) ?? null) : null
    if (!p) {
      return (
        <>
          <td />
          <td className="hidden sm:table-cell" />
          <td className="hidden sm:table-cell" />
          <td className="hidden sm:table-cell" />
          <td className="hidden sm:table-cell" />
        </>
      )
    }
    const loc = p.locales[locale] ?? p.locales.ru ?? p.locales.en
    const nat = p.nationality || 'xx'
    const Flag = Flags[nat.toUpperCase() as keyof typeof Flags]
    const rank = p.capturedRating?.rank
    const rc = rank ? rankToColor(rank) : null
    const title = loc?.title || ''
    const points = pointsBeforeRound(p.id)
    return (
      <>
        <td className="p-0 hidden sm:table-cell">
          {Flag && (
            <div className="tooltip tooltip-top" data-tip={getCountryName(nat, locale)}>
              <Flag className="h-3 w-4 rounded-sm ml-1 mt-1" />
            </div>
          )}
        </td>
        <td className="p-0 hidden sm:table-cell">
          {rank && (
            <span
              className="badge badge-xs text-white flex items-center gap-0.5 w-fit"
              style={{ backgroundColor: rc ?? undefined }}
            >
              {rank}
              {title && (
                <span className="tooltip tooltip-top" data-tip={title}>
                  <PiCrownSimple className="h-3 w-3" />
                </span>
              )}
            </span>
          )}
        </td>
        <td className="sm:whitespace-nowrap max-w-[10rem] sm:truncate font-medium p-0.5 pl-1">
          {loc?.familyName}, {loc?.givenName}
        </td>
        <td className="text-right font-mono hidden sm:table-cell">{p.capturedRating?.value ?? ''}</td>
        <td className="text-center hidden sm:table-cell">
          <span className="badge badge-xs badge-primary font-mono">{points}</span>
        </td>
      </>
    )
  }

  if (publishedRoundCount < 1) {
    return (
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body">
          <p className="text-sm opacity-70">{t('tournament.view.results.noResults')}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-row items-center gap-2">
        <h2 className="card-title mt-[-3px]">{t('tournament.view.results.rounds')}</h2>
        {/* Round sub-tabs (published rounds only) */}
        <div className="tabs tabs-box tabs-sm" role="tablist">
          {Array.from({ length: publishedRoundCount }, (_, i) => i + 1).map((num) => {
            const isActive = num === activeRound
            return (
              <button
                key={num}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedRound(num)}
                className={`tab ${isActive ? 'tab-active' : ''}`}
              >
                {num}
              </button>
            )
          })}
        </div>
      </div>

      <div className="tournament-results table-container w-[calc(100vw-32px)] md:w-auto overflow-x-auto mt-2">
        <table className="table table-sm w-auto table-fixed border-b border-base-300 pb-2">
          <thead className="bg-base-200 text-base-200-content text-xs">
            <tr>
              <th className="first:rounded-tl-xl" />
              <th className="hidden sm:table-cell" />
              <th className="hidden sm:table-cell" />
              <th>{considerSente ? '☗' : ''}</th>
              <th className="text-right hidden sm:table-cell">{t('tournament.view.results.rating')}</th>
              <th className="text-center hidden sm:table-cell">{t('tournament.view.results.pts')}</th>
              <th className="text-center whitespace-nowrap text-sm sm:text-base text-primary">
                {t('tournament.view.results.round', { n: activeRound })}
              </th>
              <th className="hidden sm:table-cell"/>
              <th className="hidden sm:table-cell"/>
              <th className="rounded-tr-xl sm:rounded-tr-none">{considerSente ? '☖' : ''}</th>
              <th className="text-right hidden sm:table-cell">{t('tournament.view.results.rating')}</th>
              <th className="last:rounded-tr-xl text-center hidden sm:table-cell">{t('tournament.view.results.pts')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ game, forfeit }, idx) => (
              <tr key={game.id} className="hover hover:relative hover:z-30">
                <td className="p-0 text-center text-xs">{idx + 1}.</td>
                {playerCells(game.player1)}
                <td
                  className={`text-center whitespace-nowrap font-mono pl-0 pr-0 font-bold ${forfeit ? 'text-error' : ''}`}
                  data-result={resultFirstPlayer(game)}
                >
                  {resultText(game)}
                </td>
                {playerCells(game.player2)}
              </tr>
            ))}
            <tr><td colSpan={12}></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

