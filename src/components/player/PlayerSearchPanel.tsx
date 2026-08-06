import { BsSearch } from 'react-icons/bs'
import { useTranslation } from 'react-i18next'
import { usePlayerSearch } from '../../hooks/usePlayers.ts'
import { PlayerCard } from './PlayerCard.tsx'
import type { Player } from '../../domain/player.ts'

interface PlayerSearchPanelProps {
  query: string
  onQueryChange: (query: string) => void
  onSelect: (player: Player) => void
  locale: string
  placeholder?: string
  variant?: 'search' | 'inline'
  selectedId?: string | null
}

export function PlayerSearchPanel({
  query,
  onQueryChange,
  onSelect,
  locale,
  placeholder,
  variant = 'search',
  selectedId,
}: PlayerSearchPanelProps) {
  const { t } = useTranslation()
  const { data: playerResults = [], isLoading: isSearchingPlayers } = usePlayerSearch(query)

  return (
    <div className="mb-3 flex flex-col gap-2">
      {variant === 'search' && (
        <label className="input input-sm input-bordered flex items-center gap-2">
          <BsSearch className="h-4 w-4 opacity-70" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder ?? t('admin.searchPlayers')}
            className="grow bg-transparent outline-none"
          />
        </label>
      )}

      {isSearchingPlayers && (
        <div className="flex justify-center py-4">
          <span className="loading loading-spinner loading-sm" />
        </div>
      )}

      {!isSearchingPlayers && query.length >= 3 && playerResults.length === 0 && (
        <p className="text-sm opacity-70">
          {t('admin.noPlayersFound')}
        </p>
      )}

      {!isSearchingPlayers && playerResults.length > 0 && (
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {playerResults.map((player) => {
            const isActive = player.id === selectedId
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => onSelect(player)}
                className={[
                  'group flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors',
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-base-300 hover:bg-base-200',
                ].join(' ')}
              >
                <PlayerCard player={player} locale={locale} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}