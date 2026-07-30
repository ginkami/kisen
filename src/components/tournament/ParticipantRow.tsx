import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsLink45Deg, BsFillPersonVcardFill, BsFillPersonPlusFill, BsFillPersonXFill } from 'react-icons/bs'
import { CountrySelect } from './CountrySelect.tsx'
import { ExpandableField } from './ExpandableField.tsx'
import type { SupportedLocale } from '../../domain/locale.ts'
import type { ParticipantRow as ParticipantRowType } from '../../hooks/useTournamentForm.ts'
import type { PlayerRank } from '../../domain/playerRating.ts'
import type { Player } from '../../domain/player.ts'
import { PlayerSearchPanel } from '../player/PlayerSearchPanel.tsx'
import { PlayerEditModal } from '../player/PlayerEditModal.tsx'
import { ConfirmModal } from '../ConfirmModal.tsx'

interface ParticipantRowProps {
  row: ParticipantRowType
  activeLocale: SupportedLocale
  onUpdate: (patch: Partial<ParticipantRowType>) => void
  validationErrors?: Record<string, string>
  canLinkPlayers?: boolean
}

function RankSelect({ value, onChange }: { value: PlayerRank | null; onChange: (v: PlayerRank | null) => void }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value || null) as PlayerRank | null)}
      className="select select-sm select-bordered w-full select-rank"
    >
      <option value="">—</option>
      {['20k', '19k', '18k', '17k', '16k', '15k', '14k', '13k', '12k', '11k',
        '10k', '9k', '8k', '7k', '6k', '5k', '4k', '3k', '2k', '1k'].map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
      {['1d', '2d', '3d', '4d', '5d', '6d', '7d', '8d', '9d'].map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  )
}

function playerToParticipantPatch(player: Player, _locale: SupportedLocale): Partial<ParticipantRowType> {
  return {
    player: player.id,
    locales: Object.fromEntries(
      ['ru', 'en'].map((l) => [
        l,
        {
          familyName: player.locales[l]?.familyName ?? '',
          givenName: player.locales[l]?.givenName ?? '',
          title: player.locales[l]?.title ?? '',
          location: player.locales[l]?.location ?? '',
        },
      ])
    ) as ParticipantRowType['locales'],
    nationality: player.nationality ?? '',
    residence: player.residence ?? '',
    ratingValue: player.currentRating?.value?.toString() ?? '',
    rank: player.currentRating?.rank ?? null,
  }
}

export function ParticipantRow({ row, activeLocale, onUpdate, validationErrors, canLinkPlayers = true }: ParticipantRowProps) {
  const { t, i18n } = useTranslation()
  const locale = activeLocale

  const [showSearchPopover, setShowSearchPopover] = useState(false)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'overwrite' | 'unlink'
    player?: Player
  }>({ isOpen: false, type: 'overwrite' })

  const currentLocale = row.locales[locale] ?? row.locales['ru'] ?? { familyName: '', givenName: '', title: '', location: '' }

  const handleFamilyNameChange = (value: string) => {
    onUpdate({
      locales: {
        ...row.locales,
        [locale]: { ...currentLocale, familyName: value },
      },
    })
    // Show autocomplete if unlinked and query long enough
    if (!row.player && value.length >= 3) {
      setShowAutocomplete(true)
    } else {
      setShowAutocomplete(false)
    }
  }

  const handleAutocompleteSelect = (player: Player) => {
    // Auto-fill without confirm (per spec)
    onUpdate(playerToParticipantPatch(player, locale))
    setShowAutocomplete(false)
  }

  const handleSearchPopoverSelect = (player: Player) => {
    // Link player, then confirm overwrite
    setShowSearchPopover(false)
    onUpdate({ player: player.id })
    setConfirmModal({ isOpen: true, type: 'overwrite', player })
  }

  const handleConfirmOverwrite = () => {
    if (confirmModal.player) {
      onUpdate(playerToParticipantPatch(confirmModal.player, locale))
    }
    setConfirmModal({ isOpen: false, type: 'overwrite' })
  }

  const handleLinkCancelOverwrite = () => {
    // Player was already linked (player field set), just close modal
    setConfirmModal({ isOpen: false, type: 'overwrite' })
  }

  const handleUnlink = () => {
    onUpdate({ player: null })
    setConfirmModal({ isOpen: false, type: 'unlink' })
  }

  const handleEditPlayerSave = async (player: Player) => {
    setShowEditModal(false)
    // After saving, confirm overwrite from updated player
    setConfirmModal({ isOpen: true, type: 'overwrite', player })
  }

  return (
    <div className="rounded-lg border bg-base-300 border-primary/30 p-3 space-y-3">
      {/* Player link controls row */}
      {canLinkPlayers && (
      <div className="flex gap-1 items-center flex-wrap">
        <BsLink45Deg className="h-4 w-4" />
        {row.player ? (
          <>
            <button
              type="button"
              className="btn btn-sm btn-ghost tooltip border-primary/10"
              data-tip={t('tournament.edit.participants.editPlayer')}
              onClick={() => setShowEditModal(true)}
            >
              <BsFillPersonVcardFill className="h-4 w-4 text-primary" />
              <span className="text-sm">
                {currentLocale.familyName}, {currentLocale.givenName}
              </span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost tooltip"
              data-tip={t('tournament.edit.participants.unlinkPlayer')}
              onClick={() => setConfirmModal({ isOpen: true, type: 'unlink' })}
            >
              <BsFillPersonXFill className="h-4 w-4 text-error" />
            </button>
          </>
        ) : (
          <div className="relative">
            <button
              type="button"
              className="btn btn-sm btn-ghost tooltip"
              data-tip={t('tournament.edit.participants.linkPlayer')}
              onClick={() => setShowSearchPopover(!showSearchPopover)}
            >
              <BsFillPersonPlusFill className="h-4 w-4 text-success" />
            </button>
            {showSearchPopover && (
              <div className="absolute z-20 top-full mt-1 left-0 w-80 bg-base-100 rounded-lg shadow-lg border border-base-300 p-2">
                <p className="text-xs font-semibold mb-2 px-1">
                  {t('tournament.edit.participants.searchPlayerTitle')}
                </p>
                <PlayerSearchPanel
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  onSelect={handleSearchPopoverSelect}
                  locale={i18n.language}
                />
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Family name with autocomplete popover */}
      {/* Rating + Rank */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 text-xs">
        <div className="relative form-control">
          <label className="label">
            <span className="label-text">
              {t('tournament.edit.participants.familyName')}
              <span className="text-error ml-1">*</span>
            </span>
          </label>
          <input
            type="text"
            value={currentLocale.familyName}
            onChange={(e) => handleFamilyNameChange(e.target.value)}
            onFocus={() => {
              if (canLinkPlayers && !row.player && currentLocale.familyName.length >= 3) setShowAutocomplete(true)
            }}
            onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
            className={`input input-bordered input-sm w-full ${validationErrors?.participants ? 'input-error' : ''}`}
          />
          {showAutocomplete && canLinkPlayers && !row.player && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-base-100 rounded-lg shadow-lg border border-base-300 p-2 max-h-60 overflow-auto">
              <PlayerSearchPanel
                query={currentLocale.familyName}
                onQueryChange={() => {}}
                onSelect={handleAutocompleteSelect}
                locale={i18n.language}
                variant="inline"
              />
            </div>
          )}
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">
              {t('tournament.edit.participants.givenName')}
              <span className="text-error ml-1">*</span>
            </span>
          </label>
          <input
            type="text"
            value={currentLocale.givenName}
            onChange={(e) =>
              onUpdate({
                locales: {
                  ...row.locales,
                  [locale]: { ...currentLocale, givenName: e.target.value },
                },
              })
            }
            className={`input input-bordered input-sm w-full ${validationErrors?.participants ? 'input-error' : ''}`}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">{t('tournament.edit.participants.ratingValue')}</span>
          </label>
          <input
            type="number"
            value={row.ratingValue}
            onChange={(e) => onUpdate({ ratingValue: e.target.value })}
            className="input input-bordered input-sm w-full"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">{t('tournament.edit.participants.rank')}</span>
          </label>
          <RankSelect value={row.rank} onChange={(rank) => onUpdate({ rank })} />
        </div>
      </div>

      {/* Country + Location + Expandable fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 text-xs">
        <div className="form-control">
          <label className="label">
            <span className="label-text">{t('tournament.edit.participants.country')}</span>
          </label>
          <CountrySelect
            value={row.nationality}
            onChange={(value) => onUpdate({ nationality: value })}
            lang={i18n.language === 'ru' ? 'ru' : 'en'}
            placeholder={t('tournament.edit.noCountry')}
            buttonClassName='btn-sm'
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">{t('tournament.edit.participants.location')}</span>
          </label>
          <input
            type="text"
            value={currentLocale.location}
            onChange={(e) =>
              onUpdate({
                locales: {
                  ...row.locales,
                  [locale]: { ...currentLocale, location: e.target.value },
                },
              })
            }
            className="input input-bordered input-sm w-full"
          />
        </div>
        <ExpandableField
          label={t('tournament.edit.participants.residence')}
          isEmpty={!row.residence}
          buttonClassName='btn-sm'
          inputClassName='input-sm'
        >
          <CountrySelect
            value={row.residence}
            onChange={(value) => onUpdate({ residence: value })}
            lang={i18n.language === 'ru' ? 'ru' : 'en'}
            placeholder={t('tournament.edit.noCountry')}
            buttonClassName='btn-sm'
          />
        </ExpandableField>
        <ExpandableField
          label={t('tournament.edit.participants.titleField')}
          value={currentLocale.title}
          onChange={(value) =>
            onUpdate({
              locales: {
                ...row.locales,
                [locale]: { ...currentLocale, title: value },
              },
            })
          }
          buttonClassName='btn-sm'
          inputClassName='input-sm'
        />
      </div>

      {/* Player edit modal */}
      {showEditModal && row.player && (
        <PlayerEditModal
          playerId={row.player}
          onSave={handleEditPlayerSave}
          onCancel={() => setShowEditModal(false)}
        />
      )}

      {/* Confirm modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen && confirmModal.type === 'overwrite'}
        title={t('tournament.edit.participants.linkConfirmTitle')}
        message={t('tournament.edit.participants.linkConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="primary"
        onConfirm={handleConfirmOverwrite}
        onCancel={handleLinkCancelOverwrite}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen && confirmModal.type === 'unlink'}
        title={t('tournament.edit.participants.unlinkConfirmTitle')}
        message={t('tournament.edit.participants.unlinkConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="error"
        onConfirm={handleUnlink}
        onCancel={() => setConfirmModal({ isOpen: false, type: 'unlink' })}
      />
    </div>
  )
}