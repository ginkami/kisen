import type { Player } from "../../domain";
import * as Flags from 'country-flag-icons/react/3x2'
import { BsGraphUp } from 'react-icons/bs'
import { PiCrownSimple } from 'react-icons/pi'

interface PlayerCardProps {
  player: Player
  locale: string
}

export function PlayerCard({ player, locale }: PlayerCardProps) {
    const localeData = player.locales[locale] ?? player.locales.ru ?? player.locales.en
    const Flag = Flags[player.nationality.toUpperCase() as keyof typeof Flags]
    const FlagResidence = Flags[player.residence?.toUpperCase() as keyof typeof Flags]

    return (
        <div>
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