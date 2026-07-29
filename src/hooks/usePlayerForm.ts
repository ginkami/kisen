import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.tsx'
import type { LayoutOutletContext } from '../components/Layout.tsx'
import { playerService } from '../services/playerService.ts'
import type { PlayerRank } from '../domain/playerRating.ts'
import type { SupportedLocale } from '../domain/locale.ts'
import {
  createEmptyFormState,
  playerToFormState,
  formStateToCreateInput,
  formStateToUpdateInput,
  validatePlayerForm,
  type PlayerFormState,
  type PlayerFormLocaleFields,
} from './playerFormHelpers.ts'

const PLAYER_QUERY_KEY = 'player'

export function usePlayerForm(playerId: string | undefined) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { firebaseUser } = useAuth()
  const { setHasUnsavedChanges } = useOutletContext<LayoutOutletContext>()

  const [formState, setFormState] = useState<PlayerFormState | null>(
    playerId === 'new' ? createEmptyFormState() : null
  )
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(
    playerId === 'new' ? JSON.stringify(createEmptyFormState()) : null
  )
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [initializedPlayerId, setInitializedPlayerId] = useState<string | null>(null)

  const {
    data: player,
    isLoading: isLoadingPlayer,
    error: loadError,
  } = useQuery({
    queryKey: [PLAYER_QUERY_KEY, playerId],
    queryFn: async () => {
      if (!playerId || playerId === 'new') return null
      return playerService.getById(playerId)
    },
    enabled: !!playerId && playerId !== 'new',
    staleTime: 30 * 1000,
  })

  // Adjust state during render (React 19 pattern — no useEffect needed)
  if (player && initializedPlayerId !== player.id) {
    setInitializedPlayerId(player.id)
    const initial = playerToFormState(player)
    setFormState(initial)
    setLastSavedSnapshot(JSON.stringify(initial))
  }

  const isDirty = useMemo(() => {
    if (!formState || !lastSavedSnapshot) return false
    return JSON.stringify(formState) !== lastSavedSnapshot
  }, [formState, lastSavedSnapshot])

  useEffect(() => {
    setHasUnsavedChanges(isDirty)
  }, [isDirty, setHasUnsavedChanges])

  const updateForm = useCallback(
    (updater: (state: PlayerFormState) => PlayerFormState) => {
      setFormState((prev) => (prev ? updater(prev) : prev))
      setValidationErrors({})
    },
    []
  )

  const updateLocale = useCallback(
    (locale: SupportedLocale, field: keyof PlayerFormLocaleFields, value: string) => {
      updateForm((state) => ({
        ...state,
        locales: {
          ...state.locales,
          [locale]: { ...state.locales[locale], [field]: value },
        },
      }))
    },
    [updateForm]
  )

  const updateBasic = useCallback(
    <K extends keyof PlayerFormState>(field: K, value: PlayerFormState[K]) => {
      updateForm((state) => ({ ...state, [field]: value }))
    },
    [updateForm]
  )

  const updateRating = useCallback(
    (field: 'ratingValue' | 'rank' | 'title', value: string | PlayerRank | null) => {
      updateForm((state) => ({ ...state, [field]: value }))
    },
    [updateForm]
  )

  const addAssociation = useCallback(
    (associationId: string) => {
      updateForm((state) => {
        // If this is the first association and the user is the creator → primary
        if (!state.primaryAssociation && player && firebaseUser?.uid === player.createdBy) {
          return { ...state, primaryAssociation: associationId }
        }
        // Otherwise add to secondary
        if (state.secondaryAssociations.includes(associationId)) return state
        return { ...state, secondaryAssociations: [...state.secondaryAssociations, associationId] }
      })
    },
    [updateForm, player, firebaseUser]
  )

  const removeAssociation = useCallback(
    (associationId: string) => {
      updateForm((state) => {
        if (state.primaryAssociation === associationId) {
          return { ...state, primaryAssociation: null }
        }
        return {
          ...state,
          secondaryAssociations: state.secondaryAssociations.filter((id) => id !== associationId),
        }
      })
    },
    [updateForm]
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formState || !firebaseUser) throw new Error('Form not ready')
      if (player) {
        return playerService.update(formStateToUpdateInput(player, formState))
      }
      return playerService.create(formStateToCreateInput(formState, firebaseUser.uid))
    },
    onSuccess: (saved) => {
      queryClient.setQueryData([PLAYER_QUERY_KEY, saved.id], saved)
      if (!player) {
        navigate(`/players/${saved.id}/edit`, { replace: true })
      }
      const snapshot = playerToFormState(saved)
      setFormState(snapshot)
      setLastSavedSnapshot(JSON.stringify(snapshot))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!player) throw new Error('Player not loaded')
      await playerService.delete(player.id)
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [PLAYER_QUERY_KEY, playerId] })
      navigate('/')
    },
  })

  const savePlayer = useCallback(() => {
    if (!formState) return
    const errors = validatePlayerForm(formState)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(
        Object.fromEntries(
          Object.entries(errors).map(([key]) => [key, t('common.fieldRequired')])
        )
      )
      return
    }
    saveMutation.reset()
    saveMutation.mutate()
  }, [formState, saveMutation, t])

  const deletePlayer = useCallback(() => {
    deleteMutation.reset()
    deleteMutation.mutate()
  }, [deleteMutation])

  return {
    player,
    formState,
    isLoading: isLoadingPlayer && !formState,
    loadError,
    isDirty,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    saveError: saveMutation.error,
    deleteError: deleteMutation.error,
    validationErrors,
    clearSaveError: saveMutation.reset,
    clearDeleteError: deleteMutation.reset,
    updateLocale,
    updateBasic,
    updateRating,
    addAssociation,
    removeAssociation,
    savePlayer,
    deletePlayer,
  }
}
