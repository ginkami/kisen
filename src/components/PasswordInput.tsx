import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsEye, BsEyeSlash } from 'react-icons/bs'

interface PasswordInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
  placeholder?: string
  hasError?: boolean
  className?: string
}

/** Password input with a show/hide visibility toggle. */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required,
  placeholder,
  hasError = false,
  className,
}: PasswordInputProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const toggleLabel = isVisible ? t('auth.hidePassword') : t('auth.showPassword')

  return (
    <div className="relative w-full">
      <input
        id={id}
        type={isVisible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className={[
          'input input-bordered w-full pr-10',
          hasError ? 'input-error' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <button
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        aria-label={toggleLabel}
        aria-pressed={isVisible}
        className="btn btn-ghost btn-sm btn-circle absolute right-1 top-1/2 -translate-y-1/2"
      >
        {isVisible ? (
          <BsEyeSlash className="h-4 w-4" aria-hidden="true" />
        ) : (
          <BsEye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}