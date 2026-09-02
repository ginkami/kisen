import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as Flags from 'country-flag-icons/react/3x2'
import { PiCrownSimple } from 'react-icons/pi'
import { getCountryName } from '../../../utils/countries.ts'
import { rankToColor } from '../crosstable/crosstableModel.ts'
import type { Participant } from '../../../domain/tournament.ts'
import type { SupportedLocale } from '../../../domain/locale.ts'
import { TableScrollProvider, StickyTableCell } from '../tablescroll';

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
    <TableScrollProvider>
      <table className="table table-xs md:table-sm w-auto table-fixed border-b border-base-300 pb-2">
        <thead className="bg-base-200 text-base-200-content text-xs">
          <tr>
            <StickyTableCell as="th" rowSpan={2} width={COL_NO} className="first:rounded-tl-xl p-0 bg-base-200" />
            <StickyTableCell as="th" rowSpan={2} left={OFF_FLAG} width={COL_FLAG} className="p-0 bg-base-200" />
            <StickyTableCell as="th" rowSpan={2} left={OFF_RANK} width={COL_RANK} className="p-0 bg-base-200" />
            <StickyTableCell as="th" rowSpan={2} left={OFF_NAME} className="whitespace-nowrap p-0.5 bg-base-200" showShadow>{t('tournament.edit.crosstable.name')}</StickyTableCell>
            <th className="z-20 text-left">{t('tournament.edit.crosstable.residence')}</th>
            <th className="last:rounded-tr-xl z-20 text-right">{t('tournament.edit.crosstable.rating')}</th>
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
                <StickyTableCell width={COL_NO} className="!z-10 bg-base-100 font-mono text-center p-0">{idx + 1}</StickyTableCell>
                <StickyTableCell left={OFF_FLAG} width={COL_FLAG} className="!z-10 bg-base-100 p-0">
                  {Flag && 
                    <div className="tooltip tooltip-top" data-tip={getCountryName(nat, locale)}>
                      <Flag className="h-3 w-4 rounded-sm mt-1" />
                    </div>
                  }
                </StickyTableCell>
                <StickyTableCell left={OFF_RANK} width={COL_RANK} className="!z-10 bg-base-100 p-0">
                  {rank && (
                    <span className="badge badge-xs text-white flex items-center gap-0.5 w-fit" style={{ backgroundColor: rc ?? undefined }}>
                      {rank}
                      {title && <span className="tooltip tooltip-top" data-tip={title}><PiCrownSimple className="h-3 w-3" /></span>}
                    </span>
                  )}
                </StickyTableCell>
                <StickyTableCell left={OFF_NAME} className="!z-10 bg-base-100 whitespace-nowrap max-w-[10rem] p-0.5" showShadow>{loc?.familyName}, {loc?.givenName}</StickyTableCell>
                <td className="whitespace-nowrap">
                  {resDiff && ResFlag && (
                    <span className="tooltip tooltip-top mr-1" data-tip={getCountryName(res, locale)}>
                      <ResFlag className="h-3 w-3 rounded-sm inline mt-[-3px]" />
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
    </TableScrollProvider>
  )
}
