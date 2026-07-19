import type { SupportedLocale } from '../../domain/locale.ts'

interface LocaleTabsProps {
  locale: SupportedLocale
  onChange: (locale: SupportedLocale) => void
}

const LABELS: Record<SupportedLocale, string> = {
  ru: 'РУ',
  en: 'EN',
}

export function LocaleTabs({ locale, onChange }: LocaleTabsProps) {
  return (
    <div className="tabs tabs-box bg-base-300">
      {(['ru', 'en'] as SupportedLocale[]).map((loc) => (
        <button
          key={loc}
          type="button"
          className={`tab ${locale === loc ? 'tab-active' : ''}`}
          onClick={() => onChange(loc)}
        >
          {LABELS[loc]}
        </button>
      ))}
    </div>
  )
}
