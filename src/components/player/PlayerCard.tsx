import type { Player } from "../../domain";
import * as Flags from 'country-flag-icons/react/3x2'
import { BsGraphUp } from 'react-icons/bs'
import { PiCrownSimple } from 'react-icons/pi'

interface PlayerCardProps {
  player: Player
  locale: string
  points?: number
  showToggle?: boolean
  toggleChecked?: boolean
  onToggleChange?: (checked: boolean) => void
  toggleTooltip?: string
}

export function PlayerCard({ player, locale, points, showToggle, toggleChecked, onToggleChange, toggleTooltip }: PlayerCardProps) {
    const localeData = player.locales[locale] ?? player.locales.ru ?? player.locales.en
    const Flag = Flags[player.nationality.toUpperCase() as keyof typeof Flags]
    const FlagResidence = Flags[player.residence?.toUpperCase() as keyof typeof Flags]

    return (
        <div className="relative">
            {points && (<div className="badge badge-sm badge-primary absolute right-0 top-0">{points}</div>)}
            {showToggle && (
              <label className={`label absolute right-0 top-6 text-xs${toggleTooltip ? ' tooltip tooltip-left' : ''}`} data-tip={toggleTooltip}>
                <input
                  type="checkbox"
                  checked={toggleChecked ?? true}
                  onChange={onToggleChange ? (e) => onToggleChange(e.target.checked) : undefined}
                  className="toggle toggle-neutral toggle-xs"
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