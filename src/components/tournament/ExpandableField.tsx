import { useState } from 'react'
import type { ReactNode } from 'react'
import { BsPlus } from 'react-icons/bs'

interface ExpandableFieldProps {
  label: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  textarea?: boolean
  containerClassName?: string
  labelClassName?: string
  buttonClassName?: string
  inputClassName?: string
  isEmpty?: boolean
  children?: ReactNode
}

export function ExpandableField({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  inputClassName,
  containerClassName,
  buttonClassName,
  labelClassName,
  isEmpty,
  children,
}: ExpandableFieldProps) {
  const empty = isEmpty !== undefined ? isEmpty : value === ''
  const [isOpen, setIsOpen] = useState(!empty)

  if (!isOpen) {
    return (
      <button
        type="button"
        className={`btn btn-ghost justify-start px-2 text-primary flex items-center gap-0 expandable-field ${buttonClassName ?? ''}`}
        onClick={() => setIsOpen(true)}
      >
        <BsPlus className="h-5 w-5" />
        {label}
      </button>
    )
  }

  return (
    <div className={`form-control ${containerClassName ?? ''}`}>
      <label className={`label ${labelClassName ?? ''}`}>
        <span className="label-text">{label}</span>
      </label>
      {children ? (
        children
      ) : textarea ? (
        <textarea
          className={`textarea textarea-bordered w-full ${inputClassName ?? ''}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          rows={4}
        />
      ) : (
        <input
          type="text"
          className={`input input-bordered w-full ${inputClassName ?? ''}`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </div>
  )
}
