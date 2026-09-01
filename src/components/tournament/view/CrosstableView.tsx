import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as Flags from 'country-flag-icons/react/3x2'
import { PiCrownSimple } from 'react-icons/pi'
import { getCountryName } from '../../../utils/countries.ts'
import { rankToColor, computeStandings, handicapForView } from '../crosstable/crosstableModel.ts'
import type { Game, Participant } from '../../../domain/tournament.ts'
import type { TieBreak } from '../../../domain/tieBreak.ts'
import type { SupportedLocale } from '../../../domain/locale.ts'

const COL_NO = 28, COL_FLAG = 20, COL_RANK = 45
const OFF_FLAG = COL_NO
const OFF_RANK = OFF_FLAG + COL_FLAG
const OFF_NAME = OFF_RANK + COL_RANK

interface CrosstableViewProps {
  games: Game[]
  participants: Participant[]
  roundCount: number
  currentRound: number
  considerSente: boolean
  tieBreaks: TieBreak[]
}

export function CrosstableView({
  games, participants, roundCount, considerSente, tieBreaks,
}: CrosstableViewProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'

  const standings = useMemo(
    () => computeStandings(
      games,
      participants.map((p) => ({ id: p.id, startingPoints: p.startingPoints ?? 0 })),
      tieBreaks, roundCount,
    ),
    [games, participants, tieBreaks, roundCount],
  )

  const placeById = useMemo(() => {
    const m = new Map<number, number>()
    for (const s of standings) m.set(s.participantId, s.place)
    return m
  }, [standings])

  const rowById = useMemo(() => {
    const m = new Map<number, Participant>()
    for (const p of participants) m.set(p.id, p)
    return m
  }, [participants])

  const showStartingPoints = participants.some((p) => (p.startingPoints ?? 0) > 0)

  // Tournament points per participant (from standings, includes startingPoints)
  const pointsById = useMemo(() => {
    const m = new Map<number, number>()
    for (const s of standings) m.set(s.participantId, s.points)
    return m
  }, [standings])

  // Per participant: games involving them, ascending by round.
  // oppId is null for byes and forfeits (single-player games).
  const gamesByPid = useMemo(() => {
    const m = new Map<number, Array<{ oppId: number | null; game: Game }>>()
    for (const p of participants) m.set(p.id, [])
    for (const g of [...games].sort((a, b) => a.round - b.round)) {
      if (g.player1 != null && m.has(g.player1)) {
        m.get(g.player1)!.push({ oppId: g.player2, game: g })
      }
      if (g.player2 != null && m.has(g.player2)) {
        m.get(g.player2)!.push({ oppId: g.player1, game: g })
      }
    }
    return m
  }, [games, participants])

  // Result symbol from the given participant's perspective in this game.
  function resultSymbolFor(g: Game, pid: number): '+' | '-' | '=' | '?' {
    if (g.status === 'forfeit') return '-'
    if (g.player2 == null) return g.result === 'draw' ? '=' : '+'
    const isP1 = g.player1 === pid
    if (g.result === 'draw') return '='
    if ((g.result === 'player1_won' && isP1) || (g.result === 'player2_won' && !isP1)) return '+'
    if (g.result != null) return '-'
    return '?'
  }

  // Compact opponent row card in the style of the results table player cells.
  function OpponentCard({ oppId, symbol, handicap }: { oppId: number | null; symbol: '+' | '-' | '=' | '?'; handicap: string | null }) {
    const badgeCls =
      symbol === '+' ? 'badge-success'
      : symbol === '-' ? 'badge-error'
      : symbol === '=' ? 'badge-secondary'
      : 'bg-base-300'
    const resultBadge = <span className={`badge badge-xs text-white font-mono gap-0.5 ${badgeCls}`}>{symbol}{handicap != null && <span className="badge badge-xs bg-base-200">{ handicap }</span>}</span>
    const p = oppId != null ? (rowById.get(oppId) ?? null) : null
    if (!p) {
      return <span className="col-span-6 text-right">{resultBadge}</span>
    }
    const loc = p.locales[locale] ?? p.locales.ru ?? p.locales.en
    const nat = p.nationality || 'xx'
    const Flag = Flags[nat.toUpperCase() as keyof typeof Flags]
    const rank = p.capturedRating?.rank
    const rc = rank ? rankToColor(rank) : null
    const title = loc?.title || ''
    const points = pointsById.get(p.id) ?? 0
    return (
      <>
        {Flag && (
          <span className="tooltip tooltip-top" data-tip={getCountryName(nat, locale)}>
            <Flag className="h-3 w-4 rounded-sm" />
          </span>
        )}
        {rank && (
          <span className="badge badge-xs text-white flex items-center gap-0.5" style={{ backgroundColor: rc ?? undefined }}>
            {rank}
            {title && (
              <span className="tooltip tooltip-top" data-tip={title}>
                <PiCrownSimple className="h-3 w-3" />
              </span>
            )}
          </span>
        )}
        <span className="font-medium pl-1">{loc?.familyName}, {loc?.givenName}</span>
        <span className="font-mono text-[80%] mt-[3px]">{p.capturedRating?.value ?? ''}</span>
        <span className="badge badge-xs badge-primary font-mono">{points}</span>

        {resultBadge}
      </>
    )
  }

  function findGame(pid: number, round: number): Game | undefined {
    return games.find((g) => g.round === round && (g.player1 === pid || g.player2 === pid))
  }

  function roundCell(pid: number, round: number) {
    const g = findGame(pid, round)
    if (!g) return <span className="text-xs opacity-40 pl-2">-</span>
    if (g.status === 'bye' && g.player1 === pid)
      return <span className="font-mono pl-2">{g.result === 'draw' ? '=' : '+'}</span>
    if (g.status === 'forfeit') return <span className="font-mono pl-2">-</span>

    const isP1 = g.player1 === pid
    const oppId = isP1 ? g.player2 : g.player1
    const oppPlace = oppId != null ? (placeById.get(oppId) ?? '?') : '?'
    const raw = g.result
    let sym = '?', cls = ''
    if (raw === 'draw') sym = '='
    else if ((raw === 'player1_won' && isP1) || (raw === 'player2_won' && !isP1)) { sym = '+'; cls = 'text-success' }
    else if (raw != null) { sym = '-'; cls = 'text-error' }
    const sente = considerSente
      ? (isP1 && g.sente === 'player1') || (!isP1 && g.sente === 'player2') ? '☗' : '☖'
      : ''
    return (
      <span className="tooltip tooltip-bottom">
        <div className="grid grid-cols-[auto_auto_max-content_auto_auto_auto] z-50 gap-1 text-xs text-left tooltip-content bg-neutral text-neutral-content shadow-lg rounded-lg p-1.5">
          <div className="contents">
            <OpponentCard 
              oppId={oppId} 
              symbol={sym as '+' | '-' | '=' | '?'} 
              handicap={g.handicap != null ? handicapForView(g.handicap as string, isP1) : null} 
            />
          </div>
        </div>
        <span className="font-mono whitespace-nowrap pl-2 inline-flex items-center gap-0.5">
          {sente && <span>{sente}</span>}
          <span className={cls}>{oppPlace}{sym}</span>
          {g.handicap != null && <span className="badge badge-xs bg-base-200">{handicapForView(g.handicap as string, isP1)}</span>}
        </span>

      </span>
    )
  }

  return (
    <div className="table-container w-[calc(100vw-32px)] md:w-auto overflow-x-auto">
      <table className="table table-xs w-auto table-fixed">
        <thead className="bg-base-200 text-base-200-content text-xs">
          <tr>
            <th rowSpan={2} className="first:rounded-tl-xl sticky top-0 left-0 z-30 p-0 bg-base-200" style={{ minWidth: COL_NO }} />
            <th rowSpan={2} className="sticky top-0 z-30 p-0 bg-base-200" style={{ left: OFF_FLAG, minWidth: COL_FLAG }} />
            <th rowSpan={2} className="sticky top-0 z-30 p-0 bg-base-200" style={{ left: OFF_RANK, minWidth: COL_RANK }} />
            <th rowSpan={2} className="sticky top-0 shadow-[5px_0_10px_-2px_rgba(0,0,0,0.1)] z-30 whitespace-nowrap p-0.5 bg-base-200" style={{ left: OFF_NAME }}>{t('tournament.edit.crosstable.name')}</th>
            <th rowSpan={2} className="sticky top-0 z-20 whitespace-nowrap">{t('tournament.edit.crosstable.residence')}</th>
            <th rowSpan={2} className="sticky top-0 z-20 whitespace-nowrap text-right">{t('tournament.edit.crosstable.rating')}</th>
            <th colSpan={roundCount} className="sticky top-0 z-20 text-center p-0 pt-1 text-[80%] border-b border-b-base-200-content/30">{t('tournament.edit.pairings.title')}</th>
            {showStartingPoints && (
              <th rowSpan={2} className="sticky top-0 z-20 text-center whitespace-nowrap p-0.5">
                <div className="tooltip tooltip-bottom" data-tip={t('tournament.edit.crosstable.spTooltip')}>{t('tournament.edit.crosstable.sp')}</div>
              </th>
            )}
            {tieBreaks.map((tb, index, array) => (
              <th 
                key={tb.type} 
                rowSpan={2} 
                className={`sticky top-0 z-20 text-right whitespace-nowrap w-fit ${index === array.length - 1 ? 'last:rounded-tr-xl' : ''}`}
              >
                <div 
                  className={tb.type !== 'points' ? ' tooltip tooltip-bottom relative z-20' : ''} 
                  {...(tb.type !== 'points' && { 'data-tip': t(`tournament.tieBreak.${tb.type}`) })}
                >
                  {tb.type === 'points'
                  ? t('tournament.edit.crosstable.points')
                  : t(`tournament.tieBreak.abbr.${tb.type}`) + (tb.type === 'buchholz_cut' ? String(tb.cutCount) : '')}
                </div>
              </th>
            ))}
          </tr>
          <tr>
            {Array.from({ length: roundCount }, (_, i) => i + 1).map((r) => (
              <th key={r} className="sticky top-0 z-20 text-left pl-2.5">{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const p = rowById.get(s.participantId)
            if (!p) return null
            const loc = p.locales[locale] ?? p.locales.ru ?? p.locales.en
            const nat = p.nationality || 'xx'
            const Flag = Flags[nat.toUpperCase() as keyof typeof Flags]
            const res = p.residence || ''
            const resDiff = res && res !== nat
            const ResFlag = resDiff ? Flags[res.toUpperCase() as keyof typeof Flags] : null
            const rank = p.capturedRating?.rank
            const rc = rank ? rankToColor(rank) : null
            const title = loc?.title || ''
            return (
              <tr key={s.participantId} className="hover hover:relative hover:z-30">
                <td className="sticky left-0 bg-base-100 z-10 font-mono text-center p-0" style={{ minWidth: COL_NO }}>{s.place}</td>
                <td className="sticky bg-base-100 z-10 p-0" style={{ left: OFF_FLAG, minWidth: COL_FLAG }}>
                  {Flag && <div className="tooltip tooltip-top" data-tip={getCountryName(nat, locale)}><Flag className="h-3 w-4 rounded-sm" /></div>}
                </td>
                <td className="sticky bg-base-100 z-10 p-0" style={{ left: OFF_RANK, minWidth: COL_RANK }}>
                  {rank && (
                    <span className="badge badge-xs text-white flex items-center gap-0.5 w-fit" style={{ backgroundColor: rc ?? undefined }}>
                      {rank}
                      {title && <span className="tooltip tooltip-top" data-tip={title}><PiCrownSimple className="h-3 w-3" /></span>}
                    </span>
                  )}
                </td>
                <td className="sticky shadow-[5px_0_10px_-2px_rgba(0,0,0,0.1)] bg-base-100 z-10 whitespace-nowrap max-w-[10rem] font-medium p-0.5" style={{ left: OFF_NAME }}>
                  {(gamesByPid.get(s.participantId) ?? []).some(
                    (e) => e.oppId != null || e.game.status === 'forfeit',
                  ) ? (
                    // truncate stays off the td: overflow-hidden here would clip
                    // the absolutely-positioned tooltip-content bubble
                    <span className="tooltip tooltip-bottom z-50 flex">
                      <span className="truncate">{loc?.familyName}, {loc?.givenName}</span>
                      <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto] text-xs text-left tooltip-content bg-neutral text-neutral-content shadow-lg rounded-lg p-1.5 gap-1">
                        {(gamesByPid.get(s.participantId) ?? [])
                          .filter((e) => e.oppId != null || e.game.status === 'forfeit')
                          .map((e, i) => (
                            <div className="contents" key={i}>
                              <OpponentCard
                                oppId={e.oppId}
                                symbol={resultSymbolFor(e.game, s.participantId)}
                                handicap={e.game.handicap != null ? handicapForView(e.game.handicap as string, e.game.player2 === e.oppId) : null} 
                              />
                            </div>
                          ))}
                      </div>
                    </span>
                  ) : (
                    <span className="truncate">{loc?.familyName}, {loc?.givenName}</span>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  {resDiff && ResFlag && <span className="tooltip tooltip-top mr-1" data-tip={getCountryName(res, locale)}><ResFlag className="h-3 w-3 rounded-sm inline" /></span>}
                  {loc?.location || ''}
                </td>
                <td className="text-right font-mono">{p.capturedRating?.value ?? ''}</td>
                {Array.from({ length: roundCount }, (_, i) => i + 1).map((r) => (
                  <td key={r} className="text-left p-0.5 w-1">{roundCell(s.participantId, r)}</td>
                ))}
                {showStartingPoints && <td className="text-center font-mono w-1">{p.startingPoints ?? 0}</td>}
                {tieBreaks.map((tb) => (
                  <td key={tb.type} className="text-right font-mono w-1">{tb.type === 'points' ? s.points : s.tieBreakValues[tb.type]}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
