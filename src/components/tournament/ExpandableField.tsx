import { useState } from 'react'
import type { ReactNode } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'

interface ExpandableFieldProps {
  label: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  textarea?: boolean
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
  isEmpty,
  children,
}: ExpandableFieldProps) {
  const empty = isEmpty !== undefined ? isEmpty : value === ''
  const [isOpen, setIsOpen] = useState(!empty)

  if (!isOpen) {
    return (
      <button
        type="button"
        className="btn btn-ghost justify-start px-2 text-primary"
        onClick={() => setIsOpen(true)}
      >
        <PlusIcon className="h-5 w-5" />
        {label}
      </button>
    )
  }

  return (
    <div className="flex flex-col">
      <label className="label">
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
