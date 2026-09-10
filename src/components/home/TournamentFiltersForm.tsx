import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BsFunnel, BsSearch } from 'react-icons/bs'
import { CountrySelect } from '../tournament/CountrySelect.tsx'

export interface TournamentFilterValues {
  title: string
  startFrom: string
  startTo: string
  country: string
  city: string
}

export const EMPTY_TOURNAMENT_FILTERS: TournamentFilterValues = {
  title: '',
  startFrom: '',
  startTo: '',
  country: '',
  city: '',
}

interface TournamentFiltersFormProps {
  onApply: (values: TournamentFilterValues) => void
  onCancel: () => void
}

export function TournamentFiltersForm({
  onApply,
  onCancel,
}: TournamentFiltersFormProps) {
  const { t, i18n } = useTranslation()
  const [values, setValues] = useState<TournamentFilterValues>(EMPTY_TOURNAMENT_FILTERS)

  const setValue = <K extends keyof TournamentFilterValues>(
    key: K,
    value: TournamentFilterValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleApply = () => {
    onApply(values)
  }

  const handleCancel = () => {
    setValues(EMPTY_TOURNAMENT_FILTERS)
    onCancel()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleApply()
      }}
      className="flex flex-col gap-2"
    >
      <label className="input input-sm input-bordered flex items-center gap-2">
        <BsSearch className="h-4 w-4 opacity-70" />
        <input
          type="text"
          value={values.title}
          onChange={(e) => setValue('title', e.target.value)}
          placeholder={t('home.filters.title')}
          className="grow bg-transparent outline-none"
          aria-label={t('home.filters.title')}
        />
      </label>
      <div className="flex gap-2">
        <label className="flex-1 min-w-0 input input-sm input-bordered flex items-center gap-2">
          <input
            type="date"
            value={values.startFrom}
            max={values.startTo || undefined}
            onChange={(e) => setValue('startFrom', e.target.value)}
            className="grow bg-transparent outline-none"
            aria-label={t('home.filters.dateFrom')}
          />
        </label>
        —
        <label className="flex-1 min-w-0 input input-sm input-bordered flex items-center gap-2">
          <input
            type="date"
            value={values.startTo}
            min={values.startFrom || undefined}
            onChange={(e) => setValue('startTo', e.target.value)}
            className="grow bg-transparent outline-none"
            aria-label={t('home.filters.dateTo')}
          />
        </label>
      </div>

      <CountrySelect
        value={values.country}
        onChange={(code) => setValue('country', code)}
        lang={i18n.language}
        placeholder={t('home.filters.country')}
        buttonClassName="btn-sm"
      />

      <label className="input input-sm input-bordered flex items-center gap-2">
        <input
          type="text"
          value={values.city}
          onChange={(e) => setValue('city', e.target.value)}
          placeholder={t('home.filters.city')}
          className="grow bg-transparent outline-none"
          aria-label={t('home.filters.city')}
        />
      </label>

      <div className="mt-1 flex items-center gap-2">
        <button type="submit" className="btn btn-primary btn-sm flex-1">
          <BsFunnel className="h-4 w-4" />
          {t('home.filters.apply')}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="btn btn-ghost btn-sm"
        >
          {t('home.filters.cancel')}
        </button>
      </div>
    </form>
  )
}
