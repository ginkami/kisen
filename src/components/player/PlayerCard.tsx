import type { Player } from "../../domain";
import * as Flags from 'country-flag-icons/react/3x2'
import { BsGraphUp } from 'react-icons/bs'
import { PiCrownSimple } from 'react-icons/pi'
import { useTranslation } from 'react-i18next'

interface PlayerCardProps {
  player: Player
  locale: string
  points?: number
  startingPoints?: number
  onStartingPointsChange?: (value: number) => void
  toggleChecked?: boolean
  onToggleChange?: (checked: boolean) => void
  toggleTooltip?: string
}

export function PlayerCard({ player, locale, points, startingPoints, onStartingPointsChange, toggleChecked, onToggleChange, toggleTooltip }: PlayerCardProps) {
    const { t } = useTranslation()
    const localeData = player.locales[locale] ?? player.locales.ru ?? player.locales.en
    const Flag = Flags[player.nationality.toUpperCase() as keyof typeof Flags]
    const FlagResidence = Flags[player.residence?.toUpperCase() as keyof typeof Flags]

    return (
        <div className="relative">
            {typeof points === 'number' && onStartingPointsChange && (
                <label className="input input-xs p-1 w-14 round absolute right-0 -mt-px -mr-2 top-0 z-10 tooltip tooltip-left" data-tip={t('tournament.edit.pairings.startingPoints')}>
                    <input type="number" value={startingPoints ?? 0} min={0} step={1} onChange={(e) => onStartingPointsChange(Number(e.target.value) || 0)} className="wq-8" />
                    <span className={`badge badge-xs badge-primary tooltip tooltip-left tooltip-secondary -mr-1 -ml-5`} data-tip={t('tournament.tieBreak.points')}>{points}</span>
                </label>
            )}
            {typeof points === 'number' && !onStartingPointsChange && (
                <span className="badge badge-xs badge-primary tooltip tooltip-left absolute right-0 top-0 z-10 -mr-2" data-tip={t('tournament.tieBreak.points')}>{points}</span>
            )}
            {onToggleChange && (
              <label className={`label absolute pl-1 z-10 right-0 top-6 mt-px text-xs${toggleTooltip ? ' tooltip tooltip-left' : ''}`} data-tip={toggleTooltip}>
                <input
                  type="checkbox"
                  checked={toggleChecked ?? true}
                  onChange={onToggleChange ? (e) => onToggleChange(e.target.checked) : undefined}
                  className="toggle toggle-neutral toggle-xs -mr-2"
                  disabled={!onToggleChange}
                />
              </label>
            )}
            <div className="flex items-center gap-2">
                {Flag && <Flag className="h-3 w-4 rounded-sm" />}
                <span className="line-clamp-1 font-medium">
                    {localeData?.familyName} {localeData?.givenName}
                </span>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-70">
                {FlagResidence && <FlagResidence className="h-3 w-3 rounded-sm" />}
                {localeData?.location && (
                    <span>{localeData.location}</span>
                )}
                {(player.currentRating?.value != null || player.currentRating?.rank) && (
                    <BsGraphUp className="h-3 w-3" />
                )}
                {player.currentRating?.value != null && (
                    <span>{player.currentRating.value}</span>
                )}
                {player.currentRating?.rank && (
                    <span>{player.currentRating.rank}</span>
                )}
                {localeData?.title && (
                    <span className="flex items-center gap-1 truncate">
                        <PiCrownSimple className="h-3 w-3" />
                        <span className="truncate">{localeData?.title}</span>
                    </span>
                )}

            </div>
        </div>
    )
}