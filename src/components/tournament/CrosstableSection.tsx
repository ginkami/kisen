import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as Flags from 'country-flag-icons/react/3x2'
import { PiCrownSimple } from 'react-icons/pi'
import { getCountryName } from '../../utils/countries.ts'
import { rankToColor, TIEBREAK_ABBR, computeStandings } from './crosstable/crosstableModel.ts'
import type { Game } from '../../domain/tournament.ts'
import type { TieBreak } from '../../domain/tieBreak.ts'
import type { SupportedLocale } from '../../domain/locale.ts'
import type { ParticipantRow } from '../../hooks/useTournamentForm.ts'

interface CrosstableSectionProps {
  games: Game[]
  participants: ParticipantRow[]
  roundCount: number
  considerSente: boolean
  tieBreaks: TieBreak[]
  updateStartingPoints: (participantId: number, value: number) => void
}

const COL_NO = 28, COL_FLAG = 20, COL_RANK = 45
const OFF_FLAG = COL_NO
const OFF_RANK = OFF_FLAG + COL_FLAG
const OFF_NAME = OFF_RANK + COL_RANK

export function CrosstableSection({
  games, participants, roundCount, considerSente, tieBreaks, updateStartingPoints,
}: CrosstableSectionProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'

  const standings = useMemo(
    () => computeStandings(
      games,
      participants.map((p) => ({ id: p.id, startingPoints: p.startingPoints ?? 0 })),
      tieBreaks,
      roundCount,
    ),
    [games, participants, tieBreaks, roundCount],
  )

  const placeById = useMemo(() => {
    const m = new Map<number, number>()
    for (const s of standings) m.set(s.participantId, s.place)
    return m
  }, [standings])

  const rowById = useMemo(() => {
    const m = new Map<number, ParticipantRow>()
    for (const p of participants) m.set(p.id, p)
    return m
  }, [participants])

  function findGame(pid: number, round: number): Game | undefined {
    return games.find((g) => g.round === round && (g.player1 === pid || g.player2 === pid))
  }

  function roundCell(pid: number, round: number) {
    const g = findGame(pid, round)
    if (!g) return <span className="text-xs opacity-40 pl-2">-</span>
    if (g.status === 'bye' && g.player1 === pid)
      return <button type="button" className="btn btn-xs btn-ghost font-mono">+</button>
    if (g.status === 'forfeit')
      return <button type="button" className="btn btn-xs btn-ghost font-mono">-</button>
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
      <button type="button" className="btn btn-xs gap-0.5 btn-ghost font-mono whitespace-nowrap">
        {sente && <span className="">{sente}</span>}
        <span className={` ${cls}`}>{oppPlace}{sym}</span>
        {g.handicap != null && <span className="badge badge-xs bg-base-200">{g.handicap}</span>}
      </button>
    )
  }

  return (
    <div className="overflow-auto max-h-[70vh]">
      <table className="table table-xs w-auto">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-30 bg-base-100 p-0" style={{ minWidth: COL_NO }} />
            <th className="sticky top-0 bg-base-100 z-30 p-0" style={{ left: OFF_FLAG, minWidth: COL_FLAG }} />
            <th className="sticky top-0 bg-base-100 z-30 p-0" style={{ left: OFF_RANK, minWidth: COL_RANK }} />
            <th className="sticky top-0 bg-base-100 z-30 whitespace-nowrap p-0" style={{ left: OFF_NAME }}>{t('tournament.edit.crosstable.name')}</th>
            <th className="sticky top-0 z-20 bg-base-100 whitespace-nowrap">{t('tournament.edit.crosstable.residence')}</th>
            <th className="sticky top-0 z-20 bg-base-100 whitespace-nowrap text-right">{t('tournament.edit.crosstable.rating')}</th>
            {Array.from({ length: roundCount }, (_, i) => i + 1).map((r) => (
              <th key={r} className="sticky top-0 z-20 bg-base-100 text-left pl-2.5">{r}</th>
            ))}
            <th className="sticky top-0 z-20 bg-base-100 text-center whitespace-nowrap w-fit">
              <div className="tooltip tooltip-bottom" data-tip={t('tournament.edit.crosstable.spTooltip')}>{t('tournament.edit.crosstable.sp')}</div>
            </th>
            {tieBreaks.map((tb) => (
              <th
                key={tb.type}
                className="sticky top-0 z-20 bg-base-100 text-right whitespace-nowrap w-fit"
              >
                <div 
                  className={tb.type !== 'points' ? ' tooltip tooltip-bottom' : ''} 
                  {...(tb.type !== 'points' && { 'data-tip': t(`tournament.tieBreak.${tb.type}`) })}
                >
                  {tb.type === 'points' ? t('tournament.edit.crosstable.points') : TIEBREAK_ABBR[tb.type]}
                </div>
              </th>
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
            const rank = p.rank
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
                    <span className="badge badge-xs text-white flex items-center gap-0.5 w-fit" style={{ backgroundColor: rc }}>
                      {rank}
                      {title && <span className="tooltip tooltip-top" data-tip={title}><PiCrownSimple className="h-3 w-3" /></span>}
                    </span>
                  )}
                </td>
                <td className="sticky bg-base-100 z-10 whitespace-nowrap max-w-[10rem] truncate font-medium p-0" style={{ left: OFF_NAME }}>{loc?.familyName}, {loc?.givenName}</td>
                <td className="whitespace-nowrap">
                  {resDiff && ResFlag && <span className="tooltip tooltip-top mr-1" data-tip={getCountryName(res, locale)}><ResFlag className="h-3 w-3 rounded-sm inline" /></span>}
                  {loc?.location || ''}
                </td>
                <td className="text-right font-mono">{p.ratingValue || ''}</td>
                {Array.from({ length: roundCount }, (_, i) => i + 1).map((r) => (
                  <td key={r} className="text-left p-0.5 w-1">{roundCell(s.participantId, r)}</td>
                ))}
                <td className="text-center w-1">
                  <input type="number" min={0} step={1} value={p.startingPoints ?? 0} onChange={(e) => updateStartingPoints(s.participantId, Number(e.target.value) || 0)} className="input input-xs w-12 text-center" />
                </td>
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
