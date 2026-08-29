import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BsCheckLg } from 'react-icons/bs'
import { sanitizeTextInput } from '../../utils/sanitize.ts'
import * as Flags from 'country-flag-icons/react/3x2'
import { getCountryName } from '../../utils/countries.ts'
import { resolveLocationInput } from '../../services/geoService.ts'
import type { SupportedLocale } from '../../domain/locale.ts'

interface TournamentLocationInputProps {
  location: {
    latitude: number | null
    longitude: number | null
    country: string
    locales: Record<SupportedLocale, { settlement: string; venue: string }>
  }
  onChange: (location: {
    latitude: number
    longitude: number
    country: string
    settlements: Record<string, string>
  }) => void
  activeLocale: SupportedLocale
  validationError?: string
}

function FlagIcon({ code, className }: { code: string; className?: string }) {
  const Flag = Flags[code.toUpperCase() as keyof typeof Flags]
  if (!Flag) return <span className={className} />
  return <Flag className={className} />
}

export function TournamentLocationInput({
  location,
  onChange,
  activeLocale,
  validationError,
}: TournamentLocationInputProps) {
  const { t, i18n } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize input value from coordinates when location changes externally
  useEffect(() => {
    if (location.latitude !== null && location.longitude !== null) {
      setInputValue(`${location.latitude}, ${location.longitude}`)
    }
  }, [location.latitude, location.longitude])

  const handleCommit = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    setIsResolving(true)
    setNotFound(false)

    try {
      const resolved = await resolveLocationInput(trimmed)
      if (resolved) {
        onChange({
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          country: resolved.country,
          settlements: resolved.settlements,
        })
      } else {
        setNotFound(true)
      }
    } finally {
      setIsResolving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
      void handleCommit()
    }
  }

  const handleBlur = () => {
    // Delay to allow button click to fire first
    blurTimeoutRef.current = setTimeout(() => {
      void handleCommit()
    }, 150)
  }

  const handleConfirmClick = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    void handleCommit()
  }

  const hasResolvedLocation =
    location.latitude !== null && location.country !== null && location.country !== ''
  const settlement = location.locales[activeLocale]?.settlement ?? ''
  const lang = i18n.language === 'ru' ? 'ru' : 'en'

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">
          {t('tournament.edit.location')}
          <span className="text-error ml-1">*</span>
        </span>
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(sanitizeTextInput(e.target.value))
            setNotFound(false)
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={t('tournament.edit.locationPlaceholder')}
          disabled={isResolving}
          className={`input input-bordered flex-1 ${validationError ? 'input-error' : ''}`}
        />
        <button
          type="button"
          onClick={handleConfirmClick}
          disabled={isResolving || !inputValue.trim()}
          className="btn btn-square btn-outline"
        >
          {isResolving ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <BsCheckLg className="h-5 w-5" />
          )}
        </button>
      </div>
      {validationError && (
        <label className="label">
          <span className="label-text-alt text-error">
            {t('common.fieldRequired')}
          </span>
        </label>
      )}
      <div className="min-h-[1.25rem] mt-1">
        {isResolving && (
          <span className="text-xs opacity-70">
            {t('tournament.edit.locationResolving')}
          </span>
        )}
        {!isResolving && notFound && (
          <span className="text-xs text-error">
            {t('tournament.edit.locationNotFound')}
          </span>
        )}
        {!isResolving && !notFound && hasResolvedLocation && (
          <span className="text-xs flex items-center gap-1">
            <FlagIcon code={location.country} className="h-3 w-4 rounded-sm" />
            {getCountryName(location.country, lang)}
            {settlement && `, ${settlement}`}
          </span>
        )}
        {!isResolving && !notFound && !hasResolvedLocation && !validationError && (
          <span className="text-xs opacity-50">
            {t('tournament.edit.locationHint')}
          </span>
        )}
      </div>
    </div>
  )
}
