import { describe, expect, it } from 'vitest'
import { appSettingsSchema, parseAppSettings } from '../services/appSettingsService.ts'

describe('appSettingsSchema', () => {
  it('parses an empty document into unlocked defaults', () => {
    expect(parseAppSettings(undefined)).toEqual({ lockLogin: false, loginHash: '' })
    expect(parseAppSettings({})).toEqual({ lockLogin: false, loginHash: '' })
  })

  it('keeps the stored values', () => {
    expect(parseAppSettings({ lockLogin: true, loginHash: 'secret-42' })).toEqual({
      lockLogin: true,
      loginHash: 'secret-42',
    })
  })

  it('defaults missing fields of a partial document', () => {
    expect(appSettingsSchema.parse({ lockLogin: true })).toEqual({
      lockLogin: true,
      loginHash: '',
    })
    expect(appSettingsSchema.parse({ loginHash: 'abc' })).toEqual({
      lockLogin: false,
      loginHash: 'abc',
    })
  })

  it('strips unknown fields', () => {
    const parsed = parseAppSettings({ lockLogin: true, malicious: 'x' })
    expect(parsed).toEqual({ lockLogin: true, loginHash: '' })
  })
})
