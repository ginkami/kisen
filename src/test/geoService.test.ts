import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseCoordinates,
  reverseGeocode,
  searchSettlement,
  resolveLocationInput,
  resolveLocationByIp,
  resolvedToTournamentLocation,
} from '../services/geoService.ts'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('parseCoordinates', () => {
  it('parses valid coordinates', () => {
    expect(parseCoordinates('53.903850, 27.587277')).toEqual({
      latitude: 53.90385,
      longitude: 27.587277,
    })
  })

  it('parses negative coordinates', () => {
    expect(parseCoordinates('-33.8688, 151.2093')).toEqual({
      latitude: -33.8688,
      longitude: 151.2093,
    })
  })

  it('parses coordinates with extra spaces', () => {
    expect(parseCoordinates('  53.903850 , 27.587277  ')).toEqual({
      latitude: 53.90385,
      longitude: 27.587277,
    })
  })

  it('parses integer coordinates', () => {
    expect(parseCoordinates('50, 30')).toEqual({ latitude: 50, longitude: 30 })
  })

  it('returns null for garbage input', () => {
    expect(parseCoordinates('hello world')).toBeNull()
  })

  it('returns null for latitude out of range', () => {
    expect(parseCoordinates('91.0, 27.0')).toBeNull()
    expect(parseCoordinates('-91.0, 27.0')).toBeNull()
  })

  it('returns null for longitude out of range', () => {
    expect(parseCoordinates('53.0, 181.0')).toBeNull()
    expect(parseCoordinates('53.0, -181.0')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseCoordinates('')).toBeNull()
  })

  it('accepts boundary values', () => {
    expect(parseCoordinates('90, 180')).toEqual({ latitude: 90, longitude: 180 })
    expect(parseCoordinates('-90, -180')).toEqual({ latitude: -90, longitude: -180 })
  })
})

describe('reverseGeocode', () => {
  it('returns resolved location from Nominatim', async () => {
    const mockFetch = vi.fn()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            address: { city: 'Минск', country_code: 'by' },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            address: { city: 'Minsk', country_code: 'by' },
          }),
      })
    vi.stubGlobal('fetch', mockFetch)

    const result = await reverseGeocode(53.9, 27.57)
    expect(result).toEqual({
      latitude: 53.9,
      longitude: 27.57,
      country: 'BY',
      settlements: { ru: 'Минск', en: 'Minsk' },
    })
  })

  it('returns null when both requests fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const result = await reverseGeocode(53.9, 27.57)
    expect(result).toBeNull()
  })

  it('extracts settlement from town when city is missing', async () => {
    const mockFetch = vi.fn()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ address: { town: 'Борисов', country_code: 'by' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ address: { town: 'Barysaw', country_code: 'by' } }),
      })
    vi.stubGlobal('fetch', mockFetch)

    const result = await reverseGeocode(54.22, 28.5)
    expect(result?.settlements).toEqual({ ru: 'Борисов', en: 'Barysaw' })
  })
})

describe('searchSettlement', () => {
  it('returns coordinates for a found settlement', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ lat: '53.9', lon: '27.57' }]),
    }))
    const result = await searchSettlement('Минск')
    expect(result).toEqual({ latitude: 53.9, longitude: 27.57 })
  })

  it('returns null when no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }))
    const result = await searchSettlement('NonexistentPlace')
    expect(result).toBeNull()
  })

  it('returns null on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')))
    const result = await searchSettlement('Минск')
    expect(result).toBeNull()
  })
})

describe('resolveLocationInput', () => {
  it('resolves coordinates input via reverse geocode', async () => {
    const mockFetch = vi.fn()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ address: { city: 'Минск', country_code: 'by' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ address: { city: 'Minsk', country_code: 'by' } }),
      })
    vi.stubGlobal('fetch', mockFetch)

    const result = await resolveLocationInput('53.903850, 27.587277')
    expect(result?.country).toBe('BY')
    expect(result?.settlements.ru).toBe('Минск')
  })

  it('resolves text input via search then reverse geocode', async () => {
    const mockFetch = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ lat: '53.9', lon: '27.57' }]),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ address: { city: 'Минск', country_code: 'by' } }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ address: { city: 'Minsk', country_code: 'by' } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await resolveLocationInput('Минск')
    expect(result?.latitude).toBe(53.9)
    expect(result?.settlements.en).toBe('Minsk')
  })

  it('returns null for empty input', async () => {
    expect(await resolveLocationInput('')).toBeNull()
  })

  it('returns null when search finds nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }))
    expect(await resolveLocationInput('NonexistentPlace123')).toBeNull()
  })
})

describe('resolveLocationByIp', () => {
  it('returns resolved location from ipwho.is', async () => {
    const mockFetch = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, latitude: 53.9, longitude: 27.57 }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ address: { city: 'Минск', country_code: 'by' } }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ address: { city: 'Minsk', country_code: 'by' } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await resolveLocationByIp()
    expect(result?.latitude).toBe(53.9)
    expect(result?.country).toBe('BY')
  })

  it('returns null when ipwho.is fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await resolveLocationByIp()).toBeNull()
  })

  it('returns null when ipwho.is reports failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    }))
    expect(await resolveLocationByIp()).toBeNull()
  })
})

describe('resolvedToTournamentLocation', () => {
  it('builds a TournamentLocation from a ResolvedLocation', () => {
    const result = resolvedToTournamentLocation({
      latitude: 53.9,
      longitude: 27.57,
      country: 'BY',
      settlements: { ru: 'Минск', en: 'Minsk' },
    })
    expect(result).toEqual({
      latitude: 53.9,
      longitude: 27.57,
      country: 'BY',
      locales: { ru: { settlement: 'Минск' }, en: { settlement: 'Minsk' } },
    })
  })

  it('ensures at least one locale when settlements are empty', () => {
    const result = resolvedToTournamentLocation({
      latitude: 0, longitude: 0, country: '', settlements: {},
    })
    expect(Object.keys(result.locales).length).toBeGreaterThanOrEqual(1)
    expect(result.country).toBeUndefined()
  })
})
