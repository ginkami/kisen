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
  const rootRef = useRef<HTMLDivElement>(null)
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

  // Close on a pointer press outside the dropdown. A document-level listener
  // (instead of blur) never races with the option click: the option's own
  // mousedown handler runs in the target phase before this bubble-phase one.
  useEffect(() => {
    if (!isOpen) return
    const onDocumentMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocumentMouseDown)
    return () => document.removeEventListener('mousedown', onDocumentMouseDown)
  }, [isOpen])

  const handleSelect = (code: string) => {
    onChange(code)
    setIsOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={['dropdown w-full', isOpen ? 'dropdown-open' : ''].join(' ')}
    >
      <button
        type="button"
        // No explicit tabIndex: daisyUI v5 applies `pointer-events: none` to
        // `> [tabindex]:first-child` of an open dropdown, which would make
        // this toggle unclickable. A native <button> stays keyboard-focusable
        // without the attribute.
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
              // Select on mousedown: the pointer press happens before any blur
              // or list unmount, so the choice can never be eaten by the
              // close-on-outside-press handler.
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect('')
              }}
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
                // See the placeholder button: select on mousedown so the close
                // handler can never unmount the option before the selection.
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(country.code)
                }}
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
