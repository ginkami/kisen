import { useTranslation } from 'react-i18next'

type Language = 'ru' | 'en'

const languages: { code: Language; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const changeLanguage = (lang: Language) => {
    void i18n.changeLanguage(lang)
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
      role="group"
      aria-label="Language switcher"
    >
      {languages.map(({ code, label }) => {
        const isActive = i18n.language === code

        return (
          <button
            key={code}
            type="button"
            onClick={() => changeLanguage(code)}
            aria-pressed={isActive}
            className={[
              'rounded-full px-3 py-1 text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            ].join(' ')}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
