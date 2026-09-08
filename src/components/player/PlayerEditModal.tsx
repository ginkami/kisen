import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BsX } from 'react-icons/bs'
import { playerService } from '../../services/playerService.ts'
import { PlayerInfoSection } from './PlayerInfoSection.tsx'
import { usePlayerEditAccess } from '../../hooks/usePlayerAccess.ts'
import {
  playerToFormState,
  formStateToUpdateInput,
  validatePlayerForm,
  type PlayerFormState,
  type PlayerFormLocaleFields,
} from '../../hooks/playerFormHelpers.ts'
import type { Player } from '../../domain/player.ts'
import type { PlayerRank } from '../../domain/playerRating.ts'
import type { SupportedLocale } from '../../domain/locale.ts'

const PLAYER_QUERY_KEY = 'player'

interface PlayerEditModalProps {
  playerId: string
  onSave: (player: Player) => void
  onCancel: () => void
}

export function PlayerEditModal({ playerId, onSave, onCancel }: PlayerEditModalProps) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()

  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) ?? 'ru'
  )
  const [formState, setFormState] = useState<PlayerFormState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const {
    data: player,
    isLoading,
  } = useQuery({
    queryKey: [PLAYER_QUERY_KEY, playerId],
    queryFn: () => playerService.getById(playerId),
    enabled: !!playerId,
    staleTime: 30_000,
  })

  // Initialize form when player loads
  const initializedRef = useRef<string | null>(null)
  if (player && initializedRef.current !== player.id) {
    initializedRef.current = player.id
    setFormState(playerToFormState(player))
  }

  const updateLocale = (locale: SupportedLocale, field: keyof PlayerFormLocaleFields, value: string) => {
    setFormState((prev) =>
      prev
        ? {
            ...prev,
            locales: {
              ...prev.locales,
              [locale]: { ...prev.locales[locale], [field]: value },
            },
          }
        : prev
    )
    setValidationErrors({})
  }

  const updateBasic = <K extends keyof PlayerFormState>(field: K, value: PlayerFormState[K]) => {
    setFormState((prev) => (prev ? { ...prev, [field]: value } : prev))
    setValidationErrors({})
  }

  const updateRating = (field: 'ratingValue' | 'rank' | 'title', value: string | PlayerRank | null) => {
    setFormState((prev) => (prev ? { ...prev, [field]: value } : prev))
    setValidationErrors({})
  }

  const handleSave = async () => {
    if (!formState || !player) return
    const errors = validatePlayerForm(formState)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(
        Object.fromEntries(Object.entries(errors).map(([key]) => [key, t('common.fieldRequired')]))
      )
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const updated = await playerService.update(formStateToUpdateInput(player, formState))
      queryClient.setQueryData([PLAYER_QUERY_KEY, updated.id], updated)
      onSave(updated)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsSaving(false)
    }
  }

  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
  }, [])

  const handleDialogClose = () => {
    onCancel()
  }

  const canEditAssociations = false // Simplified: no association editing in modal context

  // Client-side mirror of the Firestore player-update rules (see
  // player-edit-access): a manager who may not edit this player gets the
  // access-denied alert instead of a dead-end editor.
  const { isChecking: isCheckingAccess, allowed: canEditThisPlayer } =
    usePlayerEditAccess(player ?? null)
  const isDenied = !!player && !isCheckingAccess && !canEditThisPlayer

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={handleDialogClose}
      aria-modal="true"
    >
      <div className="modal-box max-w-3xl w-full max-h-[90vh] overflow-y-auto text-secondary-content">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {t('tournament.edit.participants.editPlayer')}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-circle btn-ghost btn-sm"
          >
            <BsX className="h-5 w-5" />
          </button>
        </div>

        {(isLoading || isCheckingAccess) && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}

        {isDenied && (
          <div className="alert alert-error mb-4" role="alert">
            <p className="flex-1">{t('player.edit.errors.noAccess')}</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <p className="flex-1">{error.message}</p>
            <button type="button" onClick={() => setError(null)} className="btn btn-sm btn-ghost">
              ×
            </button>
          </div>
        )}

        {formState && !isDenied && !isCheckingAccess && (
          <PlayerInfoSection
            formState={formState}
            activeLocale={activeLocale}
            onLocaleChange={setActiveLocale}
            onUpdateLocale={updateLocale}
            onUpdateBasic={updateBasic}
            onUpdateRating={updateRating}
            onAddAssociation={() => {}}
            onRemoveAssociation={() => {}}
            canEditAssociations={canEditAssociations}
            validationErrors={validationErrors}
          />
        )}

        <div className="modal-action">
          <button
            type="button"
            onClick={onCancel}
            className="btn"
          >
            {t('common.cancel')}
          </button>
          {!isDenied && !isCheckingAccess && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !formState}
              className="btn btn-primary"
            >
              {isSaving ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                t('common.confirm')
              )}
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label={t('common.cancel')}>
          close
        </button>
      </form>
    </dialog>
  )
}