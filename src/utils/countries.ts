import countries from 'i18n-iso-countries'
import ru from 'i18n-iso-countries/langs/ru.json'
import en from 'i18n-iso-countries/langs/en.json'

countries.registerLocale(ru)
countries.registerLocale(en)

export function getCountryList(lang: string) {
  const names = countries.getNames(lang, { select: 'official' })
  return Object.entries(names)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, lang))
}
