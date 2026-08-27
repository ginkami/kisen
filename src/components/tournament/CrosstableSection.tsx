import { useMemo, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import * as Flags from 'country-flag-icons/react/3x2'
import { PiCrownSimple } from 'react-icons/pi'
import { BsCheckLg } from 'react-icons/bs'
import { getCountryName } from '../../utils/countries.ts'
import {
  rankToColor, computeStandings,
  parseCellInput, gameToCellInput, withCellEdited, CELL_PARTIAL_RE,
  handicapForView,
} from './crosstable/crosstableModel.ts'
import type { Game } from '../../domain/tournament.ts'
import type { TieBreak } from '../../domain/tieBreak.ts'
import type { SupportedLocale } from '../../domain/locale.ts'
import type { ParticipantRow } from '../../hooks/useTournamentForm.ts'

interface CrosstableSectionProps {
  games: Game[]
  participants: ParticipantRow[]
  roundCount: number
  currentRound: number
  considerSente: boolean
  tieBreaks: TieBreak[]
  updateStartingPoints: (participantId: number, value: number) => void
  updateGames: (round: number, gamesForRound: Game[]) => void
}

const COL_NO = 28, COL_FLAG = 20, COL_RANK = 45
const OFF_FLAG = COL_NO
const OFF_RANK = OFF_FLAG + COL_FLAG
const OFF_NAME = OFF_RANK + COL_RANK

export function CrosstableSection({
  games, participants, roundCount, currentRound, considerSente, tieBreaks, updateStartingPoints, updateGames,
}: CrosstableSectionProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'
  const [editing, setEditing] = useState<{ pid: number; round: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const commitFlagRef = useRef(false)

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

  const commitEdit = useCallback(() => {
    if (!editing) return
    const { pid, round } = editing
    const result = withCellEdited(games, participants.map((p) => ({ id: p.id, startingPoints: p.startingPoints ?? 0 })), tieBreaks, pid, round, editValue, considerSente, currentRound)
    if (result != null) {
      updateGames(round, result.filter((g) => g.round === round))
    }
    setEditing(null)
    setEditValue('')
    commitFlagRef.current = false
  }, [editing, editValue, games, participants, tieBreaks, considerSente, updateGames])

  function handleOpenEditor(pid: number, round: number) {
    const g = findGame(pid, round)
    const oppId = g ? (g.player1 === pid ? g.player2 : g.player1) : null
    const oppPlace = oppId != null ? (placeById.get(oppId) ?? null) : null
    setEditing({ pid, round })
    setEditValue(gameToCellInput(g, pid, oppPlace, considerSente))
    commitFlagRef.current = false
  }

  function roundCell(pid: number, round: number, currentRound: number) {
    const isEditing = editing?.pid === pid && editing?.round === round
    const canEdit = round <= currentRound + 1

    if (isEditing) {
      return (
        <span className="inline-flex items-center gap-0.5">
          <input
            type="text"
            autoFocus
            value={editValue}
            onChange={(e) => { const v = e.target.value.replace(/[lbr]/g, (c) => c.toUpperCase()); if (CELL_PARTIAL_RE.test(v)) setEditValue(v) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitEdit() } }}
            onBlur={(e) => { if (e.relatedTarget?.closest?.('[data-confirm-edit]')) return; commitEdit() }}
            className="input input-xs w-20 font-mono"
          />
          <button
            type="button"
            data-confirm-edit="true"
            onClick={() => { commitFlagRef.current = true; commitEdit() }}
            className="btn btn-xs btn-ghost"
          >
            <BsCheckLg className="h-3 w-3" />
          </button>
        </span>
      )
    }

    const g = findGame(pid, round)
    if (!g) {
      if (round > currentRound + 1)
        return <span className="text-xs opacity-40 pl-2">-</span>
      return (
        <button type="button" className="btn btn-xs btn-ghost font-mono" onClick={canEdit ? () => handleOpenEditor(pid, round) : undefined}>
          -
        </button>
      )
    }
    if (g.status === 'bye' && g.player1 === pid)
      return (
        <button type="button" className="btn btn-xs btn-ghost font-mono" onClick={canEdit ? () => handleOpenEditor(pid, round) : undefined}>{g.result === 'draw' ? '=' : '+'}</button>
      )
    if (g.status === 'forfeit')
      return (
        <button type="button" className="btn btn-xs btn-ghost font-mono" onClick={canEdit ? () => handleOpenEditor(pid, round) : undefined}>-</button>
      )
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
      <button type="button" className="btn btn-xs gap-0.5 btn-ghost font-mono whitespace-nowrap" onClick={canEdit ? () => handleOpenEditor(pid, round) : undefined}>
        {sente && <span>{sente}</span>}
        <span className={cls}>{oppPlace}{sym}</span>
        {g.handicap != null && <span className="badge badge-xs bg-base-200">{handicapForView(g.handicap as string, isP1)}</span>}
      </button>
    )
  }

  return (
    <div className="table-container w-[calc(100vw-32px)] md:w-auto overflow-x-auto">
      <table className="table table-xs w-auto table-fixed">
        <thead className="rounded-t-xl bg-base-200">
          <tr>
            <th rowSpan={2} className="first:rounded-tl-xl sticky top-0 left-0 z-30 p-0" style={{ minWidth: COL_NO }} />
            <th rowSpan={2} className="sticky top-0 z-30 p-0" style={{ left: OFF_FLAG, minWidth: COL_FLAG }} />
            <th rowSpan={2} className="sticky top-0 z-30 p-0" style={{ left: OFF_RANK, minWidth: COL_RANK }} />
            <th rowSpan={2} className="sticky top-0 shadow-[5px_0_10px_-2px_rgba(0,0,0,0.1)] z-30 whitespace-nowrap p-0.5" style={{ left: OFF_NAME }}>{t('tournament.edit.crosstable.name')}</th>
            <th rowSpan={2} className="sticky top-0 z-20 whitespace-nowrap">{t('tournament.edit.crosstable.residence')}</th>
            <th rowSpan={2} className="sticky top-0 z-20 whitespace-nowrap text-right">{t('tournament.edit.crosstable.rating')}</th>
            <th colSpan={roundCount} className="sticky top-0 z-20 text-center p-0 text-xs">{t('tournament.edit.pairings.title')}</th>
            <th rowSpan={2} className="sticky top-0 z-20 text-center whitespace-nowrap w-fit">
              <div className="tooltip tooltip-bottom" data-tip={t('tournament.edit.crosstable.spTooltip')}>{t('tournament.edit.crosstable.sp')}</div>
            </th>
            {tieBreaks.map((tb, index, array) => (
              <th
                rowSpan={2}
                key={tb.type}
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
                <td className="sticky shadow-[5px_0_10px_-2px_rgba(0,0,0,0.1)] bg-base-100 z-10 whitespace-nowrap max-w-[10rem] truncate font-medium p-0.5" style={{ left: OFF_NAME }}>{loc?.familyName}, {loc?.givenName}</td>
                <td className="whitespace-nowrap">
                  {resDiff && ResFlag && <span className="tooltip tooltip-top mr-1" data-tip={getCountryName(res, locale)}><ResFlag className="h-3 w-3 rounded-sm inline" /></span>}
                  {loc?.location || ''}
                </td>
                <td className="text-right font-mono">{p.ratingValue || ''}</td>
                {Array.from({ length: roundCount }, (_, i) => i + 1).map((r) => (
                  <td key={r} className="text-left p-0.5 w-1">{roundCell(s.participantId, r, currentRound)}</td>
                ))}
                <td className="text-center w-1">
                  <input type="number" min={0} step={1} value={p.startingPoints ?? 0} onChange={(e) => updateStartingPoints(s.participantId, Number(e.target.value) || 0)} onKeyDown={(e) => { if (e.key === '-') e.preventDefault() }} className="input input-xs w-12 text-center" />
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
