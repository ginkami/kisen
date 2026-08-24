import type { Player, Gender } from '../domain/player.ts'
import type { PlayerRank } from '../domain/playerRating.ts'
import { supportedLocales, type SupportedLocale } from '../domain/locale.ts'
import { localeHasAnyContent, backfillRequiredLocaleFields } from '../utils/locales.ts'
import { playerService } from '../services/playerService.ts'

export interface PlayerFormLocaleFields {
  familyName: string
  givenName: string
  location: string
  club: string
  title: string
}

export interface PlayerFormState {
  locales: Record<SupportedLocale, PlayerFormLocaleFields>
  nationality: string
  residence: string
  gender: Gender | null
  ratingValue: string
  rank: PlayerRank | null
  title: string
  birthDate: string
  primaryAssociation: string | null
  secondaryAssociations: string[]
}

export function createEmptyLocaleFields(): PlayerFormLocaleFields {
  return { familyName: '', givenName: '', location: '', club: '', title: '' }
}

export function createEmptyFormState(): PlayerFormState {
  return {
    locales: Object.fromEntries(
      supportedLocales.map((locale) => [locale, createEmptyLocaleFields()])
    ) as Record<SupportedLocale, PlayerFormLocaleFields>,
    nationality: '',
    residence: '',
    gender: null,
    ratingValue: '',
    rank: null,
    title: '',
    birthDate: '',
    primaryAssociation: null,
    secondaryAssociations: [],
  }
}

export function playerToFormState(player: Player): PlayerFormState {
  const locales = Object.fromEntries(
    supportedLocales.map((locale) => {
      const src = player.locales[locale]
      return [
        locale,
        {
          familyName: src?.familyName ?? '',
          givenName: src?.givenName ?? '',
          location: src?.location ?? '',
          club: src?.club ?? '',
          title: src?.title ?? '',
        },
      ]
    })
  ) as Record<SupportedLocale, PlayerFormLocaleFields>

  return {
    locales,
    nationality: player.nationality,
    residence: player.residence ?? '',
    gender: player.gender,
    ratingValue: player.currentRating?.value?.toString() ?? '',
    rank: player.currentRating?.rank ?? null,
    title: player.locales[Object.keys(player.locales)[0] as SupportedLocale]?.title ?? '',
    birthDate: player.birthDate
      ? player.birthDate.toISOString().split('T')[0]
      : '',
    primaryAssociation: player.primaryAssociation,
    secondaryAssociations: [...player.secondaryAssociations],
  }
}

function buildPlayerLocalesForSave(locales: Record<SupportedLocale, PlayerFormLocaleFields>) {
  const backfilled = backfillRequiredLocaleFields(locales, ['familyName', 'givenName'])
  return Object.fromEntries(
    supportedLocales
      .filter((locale) => localeHasAnyContent(backfilled[locale]))
      .map((locale) => [
        locale,
        {
          familyName: backfilled[locale].familyName,
          givenName: backfilled[locale].givenName,
          location: backfilled[locale].location || undefined,
          club: backfilled[locale].club || undefined,
          title: backfilled[locale].title || undefined,
        },
      ])
  ) as Player['locales']
}

export function formStateToCreateInput(
  state: PlayerFormState,
  userId: string
): Parameters<typeof playerService.create>[0] {
  const locales = buildPlayerLocalesForSave(state.locales)

  return {
    createdBy: userId,
    locales,
    nationality: state.nationality,
    residence: state.residence || undefined,
    gender: state.gender,
    currentRating: {
      value: state.ratingValue ? Number(state.ratingValue) : null,
      rank: state.rank,
    },
    birthDate: state.birthDate ? new Date(state.birthDate) : null,
    primaryAssociation: state.primaryAssociation,
    secondaryAssociations: state.secondaryAssociations,
  }
}

export function formStateToUpdateInput(
  player: Player,
  state: PlayerFormState
): Parameters<typeof playerService.update>[0] {
  const locales = buildPlayerLocalesForSave(state.locales)

  return {
    id: player.id,
    locales,
    nationality: state.nationality,
    residence: state.residence || undefined,
    gender: state.gender,
    currentRating: {
      value: state.ratingValue ? Number(state.ratingValue) : null,
      rank: state.rank,
    },
    birthDate: state.birthDate ? new Date(state.birthDate) : null,
    primaryAssociation: state.primaryAssociation,
    secondaryAssociations: state.secondaryAssociations,
    existing: player,
  }
}

export function validatePlayerForm(state: PlayerFormState): Record<string, string> {
  const errors: Record<string, string> = {}

  const hasCompleteLocale = supportedLocales.some(
    (locale) =>
      state.locales[locale].familyName.trim() !== '' &&
      state.locales[locale].givenName.trim() !== ''
  )
  if (!hasCompleteLocale) {
    errors.familyName = 'required'
    errors.givenName = 'required'
  }

  if (!state.nationality) {
    errors.nationality = 'required'
  }

  return errors
}