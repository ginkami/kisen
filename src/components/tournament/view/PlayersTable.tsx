import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as Flags from 'country-flag-icons/react/3x2'
import { PiCrownSimple } from 'react-icons/pi'
import { getCountryName } from '../../../utils/countries.ts'
import { rankToColor } from '../crosstable/crosstableModel.ts'
import type { Participant } from '../../../domain/tournament.ts'
import type { SupportedLocale } from '../../../domain/locale.ts'

const COL_NO = 28, COL_FLAG = 20, COL_RANK = 45
const OFF_FLAG = COL_NO
const OFF_RANK = OFF_FLAG + COL_FLAG
const OFF_NAME = OFF_RANK + COL_RANK

interface PlayersTableProps {
  participants: Participant[]
}

export function PlayersTable({ participants }: PlayersTableProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'

  const sorted = useMemo(
    () =>
      [...participants].sort((a, b) => {
        const ra = a.capturedRating?.value ?? -Infinity
        const rb = b.capturedRating?.value ?? -Infinity
        if (rb !== ra) return rb - ra
        const nameA = a.locales[locale]?.familyName ?? ''
        const nameB = b.locales[locale]?.familyName ?? ''
        return nameA.localeCompare(nameB, locale)
      }),
    [participants, locale],
  )

  return (
    <div className="table-container w-[calc(100vw-32px)] md:w-auto overflow-x-auto">
      <table className="table table-xs w-auto table-fixed">
        <thead className="bg-base-200 text-base-200-content text-xs">
          <tr>
            <th className="first:rounded-tl-xl sticky top-0 left-0 z-30 p-0 bg-base-200" style={{ minWidth: COL_NO }} />
            <th className="sticky top-0 z-20 p-0 bg-base-200" style={{ left: OFF_FLAG, minWidth: COL_FLAG }} />
            <th className="sticky top-0 z-20 p-0 bg-base-200" style={{ left: OFF_RANK, minWidth: COL_RANK }} />
            <th className="sticky top-0 shadow-[5px_0_10px_-2px_rgba(0,0,0,0.1)] z-30 whitespace-nowrap p-0.5 bg-base-200" style={{ left: OFF_NAME }}>{t('tournament.edit.crosstable.name')}</th>
            <th className="sticky top-0 z-20 text-left">{t('tournament.edit.crosstable.residence')}</th>
            <th className="last:rounded-tr-xl sticky top-0 z-20 text-right">{t('tournament.edit.crosstable.rating')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, idx) => {
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
              <tr key={p.id} className="hover hover:relative hover:z-30">
                <td className="sticky left-0 bg-base-100 z-10 font-mono text-center p-0" style={{ minWidth: COL_NO }}>
                  {idx + 1}
                </td>
                <td className="sticky bg-base-100 z-10 p-0" style={{ left: OFF_FLAG, minWidth: COL_FLAG }}>
                  {Flag && (
                    <div className="tooltip tooltip-top" data-tip={getCountryName(nat, locale)}>
                      <Flag className="h-3 w-4 rounded-sm" />
                    </div>
                  )}
                </td>
                <td className="sticky bg-base-100 z-10 p-0" style={{ left: OFF_RANK, minWidth: COL_RANK }}>
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
                <td
                  className="sticky shadow-[5px_0_10px_-2px_rgba(0,0,0,0.1)] bg-base-100 z-10 whitespace-nowrap max-w-[10rem] truncate font-medium p-0.5"
                  style={{ left: OFF_NAME }}
                >
                  {loc?.familyName}, {loc?.givenName}
                </td>
                <td className="whitespace-nowrap">
                  {resDiff && ResFlag && (
                    <span className="tooltip tooltip-top mr-1" data-tip={getCountryName(res, locale)}>
                      <ResFlag className="h-3 w-3 rounded-sm inline" />
                    </span>
                  )}
                  {loc?.location || ''}
                </td>
                <td className="text-right font-mono">{p.capturedRating?.value ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
