import { describe, it, expect } from 'vitest'
import { sanitizeTextInput, sanitizeDeep } from '../utils/sanitize.ts'

describe('sanitizeTextInput', () => {
  it('removes a script tag together with its payload', () => {
    expect(sanitizeTextInput('<script>alert(1)</script>Мой турнир')).toBe(
      'Мой турнир'
    )
  })

  it('removes a style block together with its content', () => {
    expect(sanitizeTextInput('<style>.x{color:red}</style>Текст')).toBe(
      'Текст'
    )
  })

  it('removes self-contained tags with attributes', () => {
    expect(sanitizeTextInput('<img src=x onerror=alert(1)>Пётр')).toBe('Пётр')
  })

  it('removes markup from an unclosed tag sequence', () => {
    const result = sanitizeTextInput('<<script>alert(1)</script>Текст')
    expect(result).not.toContain('<script')
    expect(result).toContain('Текст')
  })

  it('leaves ordinary text untouched', () => {
    const value = 'Фёдор, "Чемпион" 2026 — весна'
    expect(sanitizeTextInput(value)).toBe(value)
  })

  it('preserves Cyrillic and umlauts', () => {
    expect(sanitizeTextInput('Ёлка и Müller — Düsseldorf')).toBe(
      'Ёлка и Müller — Düsseldorf'
    )
  })

  it('strips NUL bytes and control characters but keeps \\n and \\t', () => {
    expect(sanitizeTextInput('a\u0000b\u0007c\nd\te\u001F')).toBe('abc\nd\te')
  })

  it('preserves Markdown markup', () => {
    const value = '# Заголовок\n\n**жирный** и _курсив_'
    expect(sanitizeTextInput(value)).toBe(value)
  })

  it('preserves lists, quotes, and code spans', () => {
    const value = '- пункт 1\n- пункт 2\n\n> цитата\n\n`код`'
    expect(sanitizeTextInput(value)).toBe(value)
  })

  it('strips HTML embedded in Markdown', () => {
    expect(
      sanitizeTextInput('# Турнир\n\n<script>alert(1)</script>Добро пожаловать')
    ).toBe('# Турнир\n\nДобро пожаловать')
  })

  it('neutralizes javascript: Markdown links case-insensitively', () => {
    expect(sanitizeTextInput('[нажми](JAVASCRIPT:alert(1))')).toBe(
      '[нажми](about:blank#alert(1))'
    )
  })

  it('neutralizes vbscript: and data:text/html Markdown links', () => {
    expect(sanitizeTextInput('[a](vbscript:msgbox(1))')).toBe(
      '[a](about:blank#msgbox(1))'
    )
    expect(sanitizeTextInput('[a](data:text/html,<b>x</b>)')).toBe(
      '[a](about:blank#,x)'
    )
  })

  it('leaves prose mentions of a scheme untouched', () => {
    expect(sanitizeTextInput('язык javascript: основы')).toBe(
      'язык javascript: основы'
    )
  })

  it('leaves safe Markdown link schemes untouched', () => {
    const value = '[сайт](https://kisen.example) и [почта](mailto:info@kisen.example)'
    expect(sanitizeTextInput(value)).toBe(value)
  })

  it('stores SQL-style payloads as ordinary text', () => {
    const value = "'; DROP TABLE users; --"
    expect(sanitizeTextInput(value)).toBe(value)
  })

  it('stores NoSQL operator-style payloads as ordinary text', () => {
    const value = '{"$gt": ""}'
    expect(sanitizeTextInput(value)).toBe(value)
  })

  it('documents the accepted trade-off: pseudo-tags are stripped', () => {
    expect(sanitizeTextInput('a < 10 > b')).toBe('a  b')
  })

  it('does not trim surrounding whitespace', () => {
    expect(sanitizeTextInput('  привет  ')).toBe('  привет  ')
  })
})

describe('sanitizeDeep', () => {
  it('sanitizes nested localized strings', () => {
    const input = {
      id: '0198c0de-0000-7000-8000-000000000000',
      locales: {
        ru: {
          title: '<b>Турнир</b>',
          description: '<script>x</script>Текст',
        },
      },
      tags: ['<i>a</i>', 'чисто'],
    }
    expect(sanitizeDeep(input)).toEqual({
      id: '0198c0de-0000-7000-8000-000000000000',
      locales: {
        ru: {
          title: 'Турнир',
          description: 'Текст',
        },
      },
      tags: ['a', 'чисто'],
    })
  })

  it('passes format-constrained fields through unchanged', () => {
    const input = {
      id: '0198c0de-0000-7000-8000-000000000000',
      country: 'JP',
      slug: 'kisen-2026-open',
      ratingValue: 2400,
      rank: null,
      startsAt: new Date('2026-08-01T00:00:00Z'),
    }
    const result = sanitizeDeep(input)
    expect(result).toEqual(input)
    expect(result.startsAt).toBeInstanceOf(Date)
    expect(result.startsAt).toBe(input.startsAt)
  })
})
