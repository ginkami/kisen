import { useMemo, useState } from 'react'
import * as Flags from 'country-flag-icons/react/3x2'
import { getCountryList } from '../../utils/countries.ts'

interface CountrySelectProps {
  value: string
  onChange: (code: string) => void
  lang: string
  placeholder?: string
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
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const countries = useMemo(() => getCountryList(lang), [lang])
  const selected = countries.find((country) => country.code === value)

  const handleSelect = (code: string) => {
    onChange(code)
    setIsOpen(false)
  }

  return (
    <div className={['dropdown w-full', isOpen ? 'dropdown-open' : ''].join(' ')}>
      <button
        type="button"
        tabIndex={0}
        className="btn btn-outline w-full justify-start"
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
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full max-h-64 flex-nowrap overflow-auto shadow"
      >
        {placeholder && (
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
        {countries.map((country) => (
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
        ))}
      </ul>
    </div>
  )
}
