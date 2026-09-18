import { Timestamp } from 'firebase/firestore'

/**
 * Checks whether a value is a Firestore Timestamp in any form:
 * 1. Real Timestamp instance (via instanceof)
 * 2. Object with a `toDate()` method (duck-typing, survives prototype loss)
 * 3. Plain object { seconds: number, nanoseconds: number } (after structured clone in IndexedDB)
 */
export function isTimestampLike(value: unknown): boolean {
  if (value instanceof Timestamp) return true
  if (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return true
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    'seconds' in value &&
    'nanoseconds' in value &&
    typeof (value as { seconds: unknown }).seconds === 'number' &&
    typeof (value as { nanoseconds: unknown }).nanoseconds === 'number'
  ) {
    return true
  }
  return false
}

/**
 * Converts a Timestamp-like value to a native Date.
 * Handles real Timestamp instances, objects with toDate(), and plain { seconds, nanoseconds }.
 */
export function timestampToDate(value: unknown): Date {
  if (value instanceof Date) {
    return value
  }
  if (value instanceof Timestamp) {
    return value.toDate()
  }
  if (
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate()
  }
  // Plain { seconds, nanoseconds } without prototype methods
  const { seconds, nanoseconds } = value as {
    seconds: number
    nanoseconds: number
  }
  return new Timestamp(seconds, nanoseconds).toDate()
}

/**
 * Recursively converts all Timestamp-like values in a data structure to native Dates.
 */
export function timestampsToDates(value: unknown): unknown {
  if (isTimestampLike(value)) {
    return timestampToDate(value)
  }
  if (value instanceof Date) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(timestampsToDates)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, timestampsToDates(val)])
    )
  }
  return value
}

/**
 * Recursively converts all native Date values in a data structure to Firestore Timestamps.
 */
export function datesToTimestamps(value: unknown): unknown {
  if (value instanceof Date) {
    return Timestamp.fromDate(value)
  }
  if (Array.isArray(value)) {
    return value.map(datesToTimestamps)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, datesToTimestamps(val)])
    )
  }
  return value
}

/**
 * Splits an array into chunks of at most `size` elements (Firestore
 * `writeBatch` accepts at most 500 operations per batch).
 */
export function chunkArray<T>(items: T[], size = 500): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/**
 * Recursively removes all `undefined` values from objects and arrays.
 */
export function removeUndefined(value: unknown): unknown {
  if (value === undefined) {
    return undefined
  }
  if (Array.isArray(value)) {
    return value.map(removeUndefined).filter((v) => v !== undefined)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, val]) => [key, removeUndefined(val)])
        .filter(([, val]) => val !== undefined)
    )
  }
  return value
}