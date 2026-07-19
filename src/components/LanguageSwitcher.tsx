import { useTranslation } from 'react-i18next'

type Language = 'ru' | 'en'

const languages: { code: Language; label: string }[] = [
  { code: 'ru', label: 'РУ' },
  { code: 'en', label: 'EN' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const changeLanguage = (lang: Language) => {
    void i18n.changeLanguage(lang)
  }

  return (
    <div className="join" role="group" aria-label="Language switcher">
      {languages.map(({ code, label }) => {
        const isActive = i18n.language === code

        return (
          <button
            key={code}
            type="button"
            onClick={() => changeLanguage(code)}
            aria-pressed={isActive}
            className={[
              'btn btn-sm join-item',
              isActive ? 'btn-secondary' : 'btn-outline btn-secondary text-primary-content',
            ].join(' ')}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
