import { localeHasAnyContent, backfillRequiredLocaleFields } from '../utils/locales.ts'

describe('localeHasAnyContent', () => {
  it('returns false for all-empty fields', () => {
    expect(localeHasAnyContent({ title: '', description: '' })).toBe(false)
  })

  it('returns false for all-undefined fields', () => {
    expect(localeHasAnyContent({ title: undefined, description: undefined })).toBe(false)
  })

  it('returns true when any field is non-empty', () => {
    expect(localeHasAnyContent({ title: '', description: 'hello' })).toBe(true)
  })

  it('returns false for whitespace-only values', () => {
    expect(localeHasAnyContent({ title: '   ', description: '' })).toBe(false)
  })

  it('returns true for a single non-empty field among many', () => {
    expect(localeHasAnyContent({ a: '', b: '', c: 'x', d: '' })).toBe(true)
  })
})

describe('backfillRequiredLocaleFields', () => {
  it('copies required field from the first locale with a value', () => {
    const locales = {
      ru: { title: 'Заголовок', description: 'Описание' },
      en: { title: '', description: 'Description' },
    }
    const result = backfillRequiredLocaleFields(locales, ['title'])
    expect(result.en.title).toBe('Заголовок')
    expect(result.en.description).toBe('Description')
    expect(result.ru.title).toBe('Заголовок')
  })

  it('does not overwrite existing values', () => {
    const locales = {
      ru: { title: 'RU', description: '' },
      en: { title: 'EN', description: '' },
    }
    const result = backfillRequiredLocaleFields(locales, ['title'])
    expect(result.ru.title).toBe('RU')
    expect(result.en.title).toBe('EN')
  })

  it('leaves field empty when no locale has a value', () => {
    const locales = {
      ru: { title: '', description: '' },
      en: { title: '', description: '' },
    }
    const result = backfillRequiredLocaleFields(locales, ['title'])
    expect(result.ru.title).toBe('')
    expect(result.en.title).toBe('')
  })

  it('treats whitespace-only as empty', () => {
    const locales = {
      ru: { title: '  ', description: '' },
      en: { title: 'EN', description: '' },
    }
    const result = backfillRequiredLocaleFields(locales, ['title'])
    expect(result.ru.title).toBe('EN')
  })

  it('backfills multiple required fields independently', () => {
    const locales = {
      ru: { familyName: 'Иванов', givenName: 'Иван', location: '' },
      en: { familyName: '', givenName: '', location: 'Moscow' },
    }
    const result = backfillRequiredLocaleFields(locales, ['familyName', 'givenName'])
    expect(result.en.familyName).toBe('Иванов')
    expect(result.en.givenName).toBe('Иван')
    expect(result.en.location).toBe('Moscow')
  })

  it('does not mutate the original object', () => {
    const locales = {
      ru: { title: 'RU', description: '' },
      en: { title: '', description: 'Desc' },
    }
    const result = backfillRequiredLocaleFields(locales, ['title'])
    expect(locales.en.title).toBe('')
    expect(result.en.title).toBe('RU')
  })
})