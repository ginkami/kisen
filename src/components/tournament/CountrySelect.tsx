import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as Flags from 'country-flag-icons/react/3x2'
import { getCountryList } from '../../utils/countries.ts'

interface CountrySelectProps {
  value: string
  onChange: (code: string) => void
  lang: string
  placeholder?: string
  buttonClassName?: string
}

function FlagIcon({ code, className }: { code: string; className?: string }) {
  const Flag = Flags[code.toUpperCase() as keyof typeof Flags]
  if (!Flag) return <span className={className} />
  return <Flag className={className} />
}

export function CountrySelect({
  value,
  onChange,
  lang,
  placeholder,
  buttonClassName,
}: CountrySelectProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const countries = useMemo(() => getCountryList(lang), [lang])
  const selected = countries.find((country) => country.code === value)

  const q = search.trim().toLowerCase()
  const filteredCountries = useMemo(() => {
    if (!q) return countries
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    )
  }, [countries, q])

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      // small delay to ensure the input is mounted before focusing
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }, [isOpen])

  const handleSelect = (code: string) => {
    onChange(code)
    setIsOpen(false)
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  const handleBlur = (e: React.FocusEvent) => {
    // Close only when focus leaves the dropdown entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOpen(false)
    }
  }

  return (
    <div
      className={['dropdown w-full', isOpen ? 'dropdown-open' : ''].join(' ')}
      onBlur={handleBlur}
    >
      <button
        type="button"
        tabIndex={0}
        className={`btn w-full justify-start ${buttonClassName ?? ''}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {selected ? (
          <>
            <FlagIcon code={selected.code} className="h-4 w-6 rounded-sm" />
            {selected.name}
          </>
        ) : (
          <span className="opacity-70">{placeholder ?? ''}</span>
        )}
      </button>
      {isOpen && (
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full max-h-64 flex-nowrap overflow-auto shadow"
      >
        <li className="sticky top-0 z-10 bg-base-100 p-2">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="input input-sm input-bordered w-full"
            aria-label={t('common.search')}
          />
        </li>
        {!q && placeholder && (
          <li>
            <button
              type="button"
              className={value === '' ? 'active' : ''}
              onClick={() => handleSelect('')}
            >
              {placeholder}
            </button>
          </li>
        )}
        {filteredCountries.length === 0 ? (
          <li className="disabled">
            <span className="text-sm opacity-60 px-2 py-1.5">{t('common.noResults')}</span>
          </li>
        ) : (
          filteredCountries.map((country) => (
            <li key={country.code}>
              <button
                type="button"
                className={value === country.code ? 'active' : ''}
                onClick={() => handleSelect(country.code)}
              >
                <FlagIcon code={country.code} className="h-4 w-6 rounded-sm" />
                {country.name}
              </button>
            </li>
          ))
        )}
      </ul>
      )}
    </div>
  )
}
