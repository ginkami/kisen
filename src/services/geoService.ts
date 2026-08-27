import { supportedLocales, type SupportedLocale } from '../domain/locale.ts'
import type { TournamentLocation } from '../domain/tournament.ts'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const TIMEOUT_MS = 3000

const SETTLEMENT_KEYS = ['city', 'town', 'village', 'municipality', 'county'] as const

export interface ResolvedLocation {
  latitude: number
  longitude: number
  country: string
  settlements: Record<string, string>
}

/**
 * Parse a string as "latitude, longitude" coordinates.
 * Returns null if the input doesn't match or values are out of range.
 */
export function parseCoordinates(
  input: string
): { latitude: number; longitude: number } | null {
  const match = input
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null

  const latitude = parseFloat(match[1])
  const longitude = parseFloat(match[2])

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  return { latitude, longitude }
}

function extractSettlement(address: Record<string, unknown>): string {
  for (const key of SETTLEMENT_KEYS) {
    const value = address[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/**
 * Reverse geocode coordinates via Nominatim, making sequential requests
 * for each supported locale via accept-language.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ResolvedLocation | null> {
  const settlements: Record<string, string> = {}
  let country = ''

  for (const locale of supportedLocales) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
      const response = await fetch(url, {
        headers: { 'accept-language': locale },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) continue

      const data = await response.json()
      if (data.error) continue

      const address = data.address as Record<string, unknown> | undefined
      if (address) {
        settlements[locale] = extractSettlement(address)
        if (!country && typeof address.country_code === 'string') {
          country = address.country_code.toUpperCase()
        }
      }
    } catch {
      // Timeout or network error — skip this locale
    }

    // Rate limit: wait between requests (Nominatim policy: 1 req/s)
    await new Promise((resolve) => setTimeout(resolve, 1100))
  }

  if (!country && Object.values(settlements).every((s) => !s)) {
    return null
  }

  return { latitude, longitude, country, settlements }
}

/**
 * Search for a settlement by name via Nominatim.
 * Returns coordinates if found, null otherwise.
 */
export async function searchSettlement(
  query: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const url = `${NOMINATIM_BASE}/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
    const response = await fetch(url, {
      headers: { 'accept-language': supportedLocales.join(',') },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) return null

    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const result = data[0]
    const latitude = parseFloat(result.lat)
    const longitude = parseFloat(result.lon)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

    return { latitude, longitude }
  } catch {
    return null
  }
}

/**
 * Resolve a user's text input into a full location.
 * - If input parses as coordinates → reverse geocode them.
 * - Otherwise → search for settlement → reverse geocode found coordinates.
 * - Returns null if nothing can be resolved.
 */
export async function resolveLocationInput(
  input: string
): Promise<ResolvedLocation | null> {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Try parsing as coordinates first
  const coords = parseCoordinates(trimmed)
  if (coords) {
    return reverseGeocode(coords.latitude, coords.longitude)
  }

  // Treat as settlement name — search then reverse geocode
  const found = await searchSettlement(trimmed)
  if (!found) return null

  return reverseGeocode(found.latitude, found.longitude)
}

/**
 * Resolve location from the user's IP address via ipwho.is,
 * then reverse geocode the coordinates.
 * Returns null on failure (no BY fallback).
 */
export async function resolveLocationByIp(): Promise<ResolvedLocation | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const response = await fetch('https://ipwho.is/', {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) return null

    const data = await response.json()
    if (data.success === false) return null

    const latitude =
      typeof data.latitude === 'number' ? data.latitude : null
    const longitude =
      typeof data.longitude === 'number' ? data.longitude : null

    if (latitude === null || longitude === null) return null

    return reverseGeocode(latitude, longitude)
  } catch {
    return null
  }
}

/**
 * Build a TournamentLocation object from a ResolvedLocation.
 */
export function resolvedToTournamentLocation(
  resolved: ResolvedLocation
): TournamentLocation {
  const locales: Record<string, { settlement?: string; venue?: string }> = {}
  for (const locale of supportedLocales) {
    const settlement = resolved.settlements[locale]
    if (settlement) {
      locales[locale] = { settlement }
    }
  }

  // Ensure at least one locale entry
  if (Object.keys(locales).length === 0) {
    locales[supportedLocales[0]] = {}
  }

  return {
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    country: resolved.country || undefined,
    locales,
  }
}
